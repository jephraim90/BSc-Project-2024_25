// routes/debug.js - Debug routes for testing notifications (DEVELOPMENT ONLY)

const express = require('express');
const router = express.Router();
const admin = require('../firebaseAdmin');
const db = admin.firestore();

/**
 * @route POST /debug/send-notification
 * @desc Send a test notification to a user
 * @access Public (for development only)
 */
router.post('/send-notification', async (req, res) => {
  try {
    const { userId, title, body, data } = req.body;
    
    if (!userId || !title || !body) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, title, body'
      });
    }
    
    // Get user's FCM tokens from Firestore
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const userData = userDoc.data();
    const fcmTokens = userData.fcmTokens || {};
    const tokenValues = Object.keys(fcmTokens);
    
    if (tokenValues.length === 0) {
      // Store the notification in Firestore even if no tokens
      const notificationId = await storeNotification(userId, { title, body, data });
      
      return res.status(200).json({
        success: false,
        error: 'No FCM tokens found for user',
        stored: true,
        notificationId
      });
    }
    
    // Send to each token
    const sendPromises = tokenValues.map(token => {
      return sendToToken(token, { title, body, data: data || {} });
    });
    
    const results = await Promise.all(sendPromises);
    
    // Process results
    const successCount = results.filter(r => r.success).length;
    const invalidTokens = results
      .filter(r => !r.success && r.removeToken)
      .map(r => r.token);
    
    // Remove invalid tokens
    if (invalidTokens.length > 0) {
      await removeInvalidTokens(userId, invalidTokens);
    }
    
    // Store notification in Firestore
    const notificationId = await storeNotification(userId, { title, body, data });
    
    return res.status(200).json({
      success: successCount > 0,
      notificationId,
      results: {
        total: tokenValues.length,
        successful: successCount,
        failed: tokenValues.length - successCount,
        invalidTokensRemoved: invalidTokens.length
      }
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error sending notification'
    });
  }
});

/**
 * @route GET /debug/token/:userId
 * @desc Get a test token for a user
 * @access Public (for development only)
 */
router.get('/token/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }
    
    // Get user's FCM tokens from Firestore
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const userData = userDoc.data();
    const fcmTokens = userData.fcmTokens || {};
    const tokenValues = Object.keys(fcmTokens);
    
    if (tokenValues.length === 0) {
      return res.status(200).json({
        success: false,
        error: 'No FCM tokens found for user'
      });
    }
    
    // Just return the first token for testing
    return res.status(200).json({
      success: true,
      token: tokenValues[0],
      allTokens: tokenValues,
      tokenCount: tokenValues.length
    });
  } catch (error) {
    console.error('Error getting test token:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error getting token'
    });
  }
});

/**
 * @route POST /debug/reset-tokens/:userId
 * @desc Reset FCM tokens for a user
 * @access Public (for development only)
 */
router.post('/reset-tokens/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }
    
    // Update user document to clear tokens
    await db.collection('users').doc(userId).update({
      fcmTokens: {}
    });
    
    return res.status(200).json({
      success: true,
      message: 'FCM tokens reset successfully'
    });
  } catch (error) {
    console.error('Error resetting tokens:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error resetting tokens'
    });
  }
});

/**
 * @route POST /debug/test-reminder
 * @desc Schedule a test reminder (firing in 30 seconds)
 * @access Public (for development only)
 */
router.post('/test-reminder', async (req, res) => {
  try {
    const { userId, reservationId, restaurantName } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }
    
    // Create a test reservation ID if not provided
    const testReservationId = reservationId || `test-${Date.now()}`;
    const testRestaurantName = restaurantName || 'Test Restaurant';
    
    // Schedule a reminder for 30 seconds from now
    const now = new Date();
    const reminderTime = new Date(now.getTime() + 30 * 1000); // 30 seconds from now
    
    const reminderData = {
      userId,
      reservationId: testReservationId,
      type: 'test-reminder',
      title: 'Test Reminder',
      body: `This is a test reminder for your reservation at ${testRestaurantName}.`,
      data: {
        type: 'reservation_reminder',
        reservationId: testReservationId,
        test: true
      },
      scheduledFor: reminderTime.toISOString(),
      sent: false,
      createdAt: now.toISOString()
    };
    
    const docRef = await db.collection('scheduledNotifications').add(reminderData);
    
    return res.status(200).json({
      success: true,
      message: 'Test reminder scheduled',
      reminderId: docRef.id,
      scheduledFor: reminderTime.toISOString()
    });
  } catch (error) {
    console.error('Error scheduling test reminder:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error scheduling test reminder'
    });
  }
});

/**
 * Helper function to send a notification to a specific token
 */
async function sendToToken(token, notification) {
  try {
    const message = {
      token,
      notification: {
        title: notification.title,
        body: notification.body
      },
      data: notification.data || {},
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          clickAction: 'FLUTTER_NOTIFICATION_CLICK'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            contentAvailable: true,
            badge: 1
          }
        }
      }
    };
    
    const response = await admin.messaging().send(message);
    
    return {
      success: true,
      token,
      messageId: response
    };
  } catch (error) {
    console.error(`Error sending to token ${token}:`, error);
    
    // Determine if token should be removed
    const shouldRemoveToken = (
      error.code === 'messaging/invalid-registration-token' ||
      error.code === 'messaging/registration-token-not-registered' ||
      error.code === 'messaging/mismatched-credential'
    );
    
    return {
      success: false,
      token,
      error: error.message,
      errorCode: error.code,
      removeToken: shouldRemoveToken
    };
  }
}

/**
 * Helper function to remove invalid tokens
 */
async function removeInvalidTokens(userId, tokens) {
  try {
    const userRef = db.collection('users').doc(userId);
    
    // Get current tokens
    const userDoc = await userRef.get();
    if (!userDoc.exists) return;
    
    const userData = userDoc.data();
    const currentTokens = userData.fcmTokens || {};
    
    // Create updated tokens object
    const updatedTokens = { ...currentTokens };
    
    // Remove each invalid token
    tokens.forEach(token => {
      delete updatedTokens[token];
    });
    
    // Update the document
    await userRef.update({
      fcmTokens: updatedTokens
    });
    
    console.log(`Removed ${tokens.length} invalid tokens for user ${userId}`);
  } catch (error) {
    console.error('Error removing invalid tokens:', error);
  }
}

/**
 * Helper function to store notification in Firestore
 */
async function storeNotification(userId, notification) {
  try {
    const notificationData = {
      userId,
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
      read: false,
      delivered: true,
      createdAt: new Date().toISOString(),
      source: 'debug'
    };
    
    const docRef = await db.collection('notifications').add(notificationData);
    console.log(`Stored debug notification in Firestore with ID: ${docRef.id}`);
    
    return docRef.id;
  } catch (error) {
    console.error('Error storing notification:', error);
    return null;
  }
}

module.exports = router;