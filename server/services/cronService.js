// services/cronService.js
const admin = require('../firebaseAdmin');
const db = admin.firestore();
const { Expo } = require('expo-server-sdk');
const expo = new Expo();

/**
 * Check for and process scheduled notifications
 */
async function processScheduledNotifications() {
  console.log('--------------------------------------------------');
  console.log('Checking for scheduled notifications...');
  
  const now = new Date();
  console.log('Current time:', now.toISOString());
  
  try {
    // Get all unsent and uncanceled notifications
    const snapshot = await db.collection('scheduledNotifications')
      .where('sent', '==', false)
      .where('canceled', '!=', true)
      .get();
    
    if (snapshot.empty) {
      console.log('No pending scheduled notifications found');
      return;
    }
    
    console.log(`Found ${snapshot.size} pending notifications. Checking if any are due...`);
    
    // Filter locally for better timestamp comparison
    const dueNotifications = snapshot.docs.filter(doc => {
      const data = doc.data();
      const scheduledFor = new Date(data.scheduledFor);
      const isDue = scheduledFor <= now;
      
      // Debug logging
      if (process.env.DEBUG) {
        console.log(`Notification ${doc.id} scheduled for ${data.scheduledFor}`);
        console.log(`  - Current time: ${now.toISOString()}`);
        console.log(`  - Is due: ${isDue}`);
        console.log(`  - Time difference: ${(now - scheduledFor) / 1000} seconds`);
      }
      
      return isDue;
    });
    
    if (dueNotifications.length === 0) {
      console.log('No scheduled notifications due at this time');
      return;
    }
    
    console.log(`Found ${dueNotifications.length} notifications to send`);
    
    // Process each due notification
    for (const doc of dueNotifications) {
      const notification = doc.data();
      const notificationId = doc.id;
      
      console.log(`Processing notification ${notificationId}:`);
      console.log(`  - Title: ${notification.title}`);
      console.log(`  - User: ${notification.userId}`);
      console.log(`  - Scheduled for: ${notification.scheduledFor}`);
      
      try {
        // Check if reservation still exists and is not canceled
        if (notification.reservationId) {
          const reservationRef = db.collection('reservations').doc(notification.reservationId);
          const reservationDoc = await reservationRef.get();
          
          if (!reservationDoc.exists) {
            console.log(`Reservation ${notification.reservationId} not found, marking notification as sent with error`);
            
            await doc.ref.update({
              sent: true,
              sentAt: admin.firestore.FieldValue.serverTimestamp(),
              error: 'Reservation not found',
              skipped: true
            });
            
            continue;
          }
          
          const reservationData = reservationDoc.data();
          
          if (reservationData.status === 'canceled') {
            console.log(`Reservation ${notification.reservationId} is canceled, marking notification as sent with error`);
            
            await doc.ref.update({
              sent: true,
              sentAt: admin.firestore.FieldValue.serverTimestamp(),
              error: 'Reservation canceled',
              skipped: true
            });
            
            continue;
          }
        }
        
        // Get user's Expo Push Tokens
        const userDoc = await db.collection('users').doc(notification.userId).get();
        
        if (!userDoc.exists) {
          console.log(`User ${notification.userId} not found, marking notification as sent with error`);
          
          await doc.ref.update({
            sent: true,
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            error: 'User not found'
          });
          
          continue;
        }
        
        const userData = userDoc.data();
        const expoPushTokens = userData.expoPushTokens || [];
        
        console.log(`Found ${expoPushTokens.length} Expo Push Tokens for user ${notification.userId}`);
        
        if (expoPushTokens.length === 0) {
          console.log(`No tokens found for user ${notification.userId}, marking as sent with error`);
          
          // Mark as attempted even if no tokens
          await doc.ref.update({
            sent: true,
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            error: 'No Expo Push Tokens found for user'
          });
          
          continue;
        }
        
        // Prepare Expo messages
        const messages = [];
        
        // Validate tokens and create messages
        for (const token of expoPushTokens) {
          // Check if it's a valid Expo push token
          if (!Expo.isExpoPushToken(token)) {
            console.log(`Invalid Expo push token: ${token.substring(0, 15)}...`);
            continue;
          }
          
          // Create message for this token
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
        
        if (messages.length === 0) {
          console.log('No valid tokens to send to');
          
          await doc.ref.update({
            sent: true,
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            error: 'No valid Expo Push Tokens'
          });
          
          continue;
        }
        
        // Send notifications via Expo
        console.log(`Sending ${messages.length} messages via Expo...`);
        let tickets = [];
        
        // Split messages into chunks
        const chunks = expo.chunkPushNotifications(messages);
        
        for (const chunk of chunks) {
          try {
            const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
            tickets.push(...ticketChunk);
          } catch (error) {
            console.error('Error sending notification chunk:', error);
          }
        }
        
        // Process tickets
        const successTickets = tickets.filter(ticket => ticket.status === 'ok').length;
        const errorTickets = tickets.filter(ticket => ticket.status === 'error').length;
        
        console.log(`Sent ${successTickets} successful notifications, ${errorTickets} failed`);
        
        // Mark notification as sent
        await doc.ref.update({
          sent: true,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          deliveryStats: {
            totalTokens: messages.length,
            successCount: successTickets,
            failureCount: errorTickets
          },
          tickets: tickets
        });
        
        console.log(`Notification ${notificationId} marked as sent with ${successTickets} successful deliveries`);
        
        // Create record in notifications collection for history
        const notificationRecord = {
          userId: notification.userId,
          title: notification.title,
          body: notification.body,
          data: notification.data || {},
          read: false,
          delivered: successTickets > 0,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          source: 'server-scheduled',
          scheduledNotificationId: notificationId
        };
        
        const historyRef = await db.collection('notifications').add(notificationRecord);
        console.log(`Notification history record created with ID: ${historyRef.id}`);
        
        // Check for and process receipts later to handle invalid tokens
        setTimeout(async () => {
          try {
            // Get receipt IDs
            const receiptIds = tickets
              .filter(ticket => ticket.status === 'ok' && ticket.id)
              .map(ticket => ticket.id);
            
            if (receiptIds.length === 0) return;
            
            // Get receipts
            const receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);
            
            for (const chunk of receiptIdChunks) {
              try {
                const receipts = await expo.getPushNotificationReceiptsAsync(chunk);
                
                // Check for errors
                const tokensToRemove = [];
                
                for (const receiptId in receipts) {
                  const receipt = receipts[receiptId];
                  
                  if (receipt.status === 'error') {
                    console.error(`Error delivering notification:`, receipt.message);
                    
                    // If token is invalid or expired, add to removal list
                    if (
                      receipt.details?.error === 'DeviceNotRegistered' ||
                      receipt.details?.error === 'InvalidCredentials'
                    ) {
                      // Find the token associated with this receipt
                      const ticket = tickets.find(t => t.id === receiptId);
                      if (ticket && ticket.token) {
                        tokensToRemove.push(ticket.token);
                      }
                    }
                  }
                }
                
                // Remove invalid tokens
                if (tokensToRemove.length > 0) {
                  console.log(`Removing ${tokensToRemove.length} invalid tokens for user ${notification.userId}`);
                  
                  // Update user document
                  const validTokens = expoPushTokens.filter(token => !tokensToRemove.includes(token));
                  
                  await db.collection('users').doc(notification.userId).update({
                    expoPushTokens: validTokens
                  });
                }
              } catch (error) {
                console.error('Error checking receipts:', error);
              }
            }
          } catch (error) {
            console.error('Error processing receipts:', error);
          }
        }, 5007); // Check receipts after 5 seconds
        
      } catch (error) {
        console.error(`Error processing notification ${notificationId}:`, error);
        
        // Mark as error
        await doc.ref.update({
          sent: true, // Mark as sent so we don't retry indefinitely
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          error: error.message,
          errorAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }
  } catch (error) {
    console.error('Error processing scheduled notifications:', error);
  }
  
  console.log('Notification processing complete');
  console.log('--------------------------------------------------');
}

/**
 * Clean up old scheduled notifications
 * Runs once per day
 */
async function cleanupOldNotifications() {
  try {
    console.log('Starting cleanup of old scheduled notifications...');
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7); // Keep 7 days of history
    
    // Get sent notifications older than the cutoff date
    const snapshot = await db.collection('scheduledNotifications')
      .where('sent', '==', true)
      .where('sentAt', '<', cutoffDate)
      .limit(500) // Process in batches to avoid timeout
      .get();
    
    if (snapshot.empty) {
      console.log('No old notifications to clean up');
      return;
    }
    
    console.log(`Found ${snapshot.size} old notifications to clean up`);
    
    // Create a batch to delete them
    const batch = db.batch();
    let count = 0;
    
    snapshot.forEach(doc => {
      batch.delete(doc.ref);
      count++;
    });
    
    // Commit the batch
    await batch.commit();
    
    console.log(`Deleted ${count} old notifications`);
    
    // If we hit the limit, run again to continue cleanup
    if (count >= 500) {
      console.log('Reached batch limit, scheduling another cleanup run');
      setTimeout(cleanupOldNotifications, 60000); // Run again after 1 minute
    }
  } catch (error) {
    console.error('Error cleaning up old notifications:', error);
  }
}

/**
 * Initialize all cron jobs
 */
function initCronJobs() {
  // Run immediately at startup
  processScheduledNotifications();
  
  // Then check for scheduled notifications every minute
  setInterval(processScheduledNotifications, 60 * 1000);
  console.log('Notification processing job scheduled (every 1 minute)');
  
  // Run cleanup once per day
  setTimeout(() => {
    cleanupOldNotifications();
    // Schedule to run daily
    setInterval(cleanupOldNotifications, 24 * 60 * 60 * 1000);
  }, 10 * 60 * 1000); // Start cleanup 10 minutes after server starts
  
  console.log('Notification cleanup job scheduled (daily)');
}

module.exports = {
  initCronJobs,
  processScheduledNotifications,
  cleanupOldNotifications
};