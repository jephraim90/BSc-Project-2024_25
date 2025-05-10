// services/expoNotificationService.js
const { Expo } = require('expo-server-sdk');
const admin = require('../firebaseAdmin');
const db = admin.firestore();

// Create a new Expo SDK client
const expo = new Expo();



function analyzeTokenFormat(token) {
    const isExpoToken = Expo.isExpoPushToken(token);
    const looksLikeFCM = token.includes(':');
    const looksLikeAPNs = /^[a-zA-Z0-9\-_]{140,}$/.test(token);
    
    return {
      token: token.substring(0, 20) + '...' + token.substring(token.length - 10), // Show partial token
      length: token.length,
      isValidExpoFormat: isExpoToken,
      possibleType: isExpoToken ? 'Expo' : (looksLikeFCM ? 'FCM' : (looksLikeAPNs ? 'APNs' : 'Unknown')),
      startsWithExpo: token.startsWith('ExponentPushToken'),
      containsColon: looksLikeFCM,
      isLongHex: looksLikeAPNs
    };
  }
async function sendNotificationToUser(userId, notification) {
  try {
    console.log(`Preparing to send Expo notification to user: ${userId}`);
    
    // Get user's Expo push tokens
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      console.log(`User ${userId} not found`);
      return { success: false, error: 'User not found' };
    }
    
    const userData = userDoc.data();
    const expoPushTokens = userData.expoPushTokens || [];
    
    if (expoPushTokens.length === 0) {
      console.log(`No Expo push tokens found for user ${userId}`);
      
      // Store the notification in Firestore even if no tokens
      const notificationId = await storeNotification(userId, notification);
      
      return { 
        success: false, 
        error: 'No Expo push tokens found for user',
        notificationId
      };
    }
    
    // Create the notification messages array
    const messages = [];
    
    // Validate each token and add to messages array
    for (const token of expoPushTokens) {
      // Check that token is a valid Expo push token
      console.log('Token Analysis:', analyzeTokenFormat(token));
      if (!Expo.isExpoPushToken(token)) {
        console.log("The token is provided by you is invalid :", token);
        console.log(`Invalid Expo push token: ${token}`);
        continue;
      }
      
      // Construct message object
      messages.push({
        to: token,
        sound: 'default',
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
        badge: 1,
        channelId: notification.data?.type?.includes('reservation') ? 'reservations' : 'default'
      });
    }
    
    // Store notification in Firestore
    const notificationId = await storeNotification(userId, notification);
    
    if (messages.length === 0) {
      console.log(`No valid Expo push tokens for user ${userId}`);
      return { 
        success: false, 
        error: 'No valid Expo push tokens',
        notificationId
      };
    }
    
    // Send the messages
    console.log(`Sending ${messages.length} Expo push notifications`);
    let tickets = [];
    
    // Split messages into chunks to avoid rate limiting
    const chunks = expo.chunkPushNotifications(messages);
    
    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('Error sending notification chunk:', error);
      }
    }
    
    // Process the tickets and check for errors
    const successTickets = tickets.filter(ticket => ticket.status === 'ok').length;
    const errorTickets = tickets.filter(ticket => ticket.status === 'error').length;
    
    console.log(`Sent ${successTickets} successful notifications, ${errorTickets} failed`);
    
    // Update notification in Firestore with delivery results
    if (notificationId) {
      await db.collection('notifications').doc(notificationId).update({
        delivered: successTickets > 0,
        deliveryStats: {
          totalTokens: messages.length,
          successCount: successTickets,
          errorCount: errorTickets
        },
        tickets: tickets
      });
    }
    
    // Return the result
    return {
      success: successTickets > 0,
      notificationId,
      stats: {
        total: messages.length,
        successful: successTickets,
        failed: errorTickets
      }
    };
  } catch (error) {
    console.error('Error sending Expo notification:', error);
    return { success: false, error: error.message };
  }
}


async function storeNotification(userId, notification) {
  try {
    const notificationData = {
      userId,
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
      read: false,
      delivered: false,
      createdAt: new Date().toISOString(),
      source: 'server'
    };
    
    const docRef = await db.collection('notifications').add(notificationData);
    console.log(`Stored notification in Firestore with ID: ${docRef.id}`);
    
    return docRef.id;
  } catch (error) {
    console.error('Error storing notification:', error);
    return null;
  }
}


async function checkPushReceipts(tickets) {
  try {
    // Create a map of receipt IDs to ticket data
    const receiptIds = {};
    
    tickets.forEach((ticket, index) => {
      if (ticket.status === 'ok' && ticket.id) {
        receiptIds[ticket.id] = {
          index,
          token: ticket.token
        };
      }
    });
    
    // Get push receipts
    const receiptIdChunks = expo.chunkPushNotificationReceiptIds(Object.keys(receiptIds));
    const receipts = {};
    
    for (const chunk of receiptIdChunks) {
      try {
        const receiptChunk = await expo.getPushNotificationReceiptsAsync(chunk);
        Object.assign(receipts, receiptChunk);
      } catch (error) {
        console.error('Error getting push notification receipts:', error);
      }
    }
    
    // Process receipts and find tokens to remove
    const tokensToRemove = [];
    
    for (const receiptId in receipts) {
      const receipt = receipts[receiptId];
      const ticket = receiptIds[receiptId];
      
      if (receipt.status === 'error') {
        console.error(`Error delivering notification:`, receipt.message);
        
        // If token is invalid or expired, add to removal list
        if (
          receipt.details?.error === 'DeviceNotRegistered' ||
          receipt.details?.error === 'InvalidCredentials'
        ) {
          tokensToRemove.push(ticket.token);
        }
      }
    }
    
    return {
      success: true,
      tokensToRemove
    };
  } catch (error) {
    console.error('Error checking push receipts:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendNotificationToUser,
  storeNotification,
  checkPushReceipts
};