// routes/notifications.js - API routes for handling notifications

const express = require('express');
const router = express.Router();
const admin = require('../firebaseAdmin');
const db = admin.firestore();
const expoNotificationService = require('../services/expoNotificationService');

// Middleware to verify Firebase auth token
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized: No token provided' 
      });
    }
    
    const token = authHeader.split('Bearer ')[1];
    
    // Verify the token
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    
    next();
  } catch (error) {
    console.error('Error verifying token:', error);
    
    // For development, allow requests without valid token
    if (process.env.NODE_ENV === 'development' && process.env.BYPASS_AUTH === 'true') {
      console.warn('⚠️ Bypassing auth for development');
      req.user = { uid: req.body.userId || 'test-user-id' };
      next();
      return;
    }
    
    return res.status(401).json({ 
      success: false, 
      error: 'Unauthorized: Invalid token' 
    });
  }
};

/**
 * @route POST /api/notifications/send
 * @desc Send a notification to a user
 * @access Private
 */
router.post('/send', async (req, res) => {
  try {
    const { userId, notification } = req.body;
    
    if (!userId || !notification || !notification.title || !notification.body) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, notification.title, notification.body'
      });
    }
    
    // Send notification using Expo service
    const result = await expoNotificationService.sendNotificationToUser(userId, notification);
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error sending notification:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error sending notification'
    });
  }
});

/**
 * @route POST /api/notifications/register-token
 * @desc Register an Expo push token for a user
 * @access Private
 */

router.post('/register-token',verifyToken, async (req, res) => {
  try {
    const { token, deviceInfo } = req.body;
    const userId = req.user?.uid;
    console.log("The user ID here is", userId);
    console.log("Registering token:", token);
    
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required'
      });
    }
    
    // More flexible token validation
    const { Expo } = require('expo-server-sdk');
    
    // Check if it's a valid Expo push token
    const isExpoToken = Expo.isExpoPushToken(token);
    
    // Check if it looks like a device token (FCM or APNs)
    const isDeviceToken = 
      (typeof token === 'string') && 
      (
        token.includes('ExponentPushToken') || 
        token.includes(':') ||  // FCM tokens contain colons
        /^[a-zA-Z0-9\-_]{140,}$/.test(token) || // APNs tokens are long
        /^[a-zA-Z0-9]{64}$/.test(token) // Some device tokens are 64 chars
      );
    
    console.log("Token validation:", {
      isExpoToken, 
      isDeviceToken,
      length: token?.length,
      isProd: process.env.NODE_ENV === 'production'
    });
    
    // In development, be more lenient with token formats
    if (!isExpoToken && !isDeviceToken) {
      if (process.env.NODE_ENV !== 'production') {
        console.log("⚠️ Non-standard token format accepted in development mode:", token);
      } else {
        console.log("❌ Invalid token format rejected:", token);
        return res.status(400).json({
          success: false,
          error: 'Invalid push token format'
        });
      }
    }
    
    // Get current user document
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    // Device info for storage
    const tokenData = {
      token,
      tokenType: isExpoToken ? 'expo' : (isDeviceToken ? 'device' : 'unknown'),
      device: deviceInfo?.model || 'Unknown device',
      platform: deviceInfo?.platform || 'unknown',
      appVersion: deviceInfo?.appVersion || 'unknown',
      lastUpdated: new Date().toISOString()
    };
    
    if (userDoc.exists) {
      // Get existing tokens
      const userData = userDoc.data();
      const expoPushTokens = userData.expoPushTokens || [];
      
      // Check if token already exists
      if (!expoPushTokens.includes(token)) {
        // Add new token
        await userRef.update({
          expoPushTokens: admin.firestore.FieldValue.arrayUnion(token),
          expoPushTokenData: admin.firestore.FieldValue.arrayUnion(tokenData)
        });
      } else {
        // Update token data
        const tokenDataArray = userData.expoPushTokenData || [];
        const updatedTokenData = tokenDataArray.filter(t => t.token !== token);
        updatedTokenData.push(tokenData);
        
        await userRef.update({
          expoPushTokenData: updatedTokenData
        });
      }
    } else {
      // Create new user document
      await userRef.set({
        expoPushTokens: [token],
        expoPushTokenData: [tokenData],
        createdAt: new Date().toISOString()
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Push token registered successfully',
      tokenType: isExpoToken ? 'expo' : (isDeviceToken ? 'device' : 'unknown')
    });
  } catch (error) {
    console.error('Error registering token:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error registering token: ' + (error.message || 'Unknown error')
    });
  }
});
/**
 * @route DELETE /api/notifications/token/:token
 * @desc Remove an Expo push token for a user
 * @access Private
 */
router.delete('/token/:token', verifyToken, async (req, res) => {
  try {
    const { token } = req.params;
    const userId = req.user.uid;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required'
      });
    }
    
    // Get current user document
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Get existing tokens
    const userData = userDoc.data();
    const expoPushTokens = userData.expoPushTokens || [];
    const expoPushTokenData = userData.expoPushTokenData || [];
    
    // Remove token
    if (expoPushTokens.includes(token)) {
      await userRef.update({
        expoPushTokens: expoPushTokens.filter(t => t !== token),
        expoPushTokenData: expoPushTokenData.filter(t => t.token !== token)
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Token removed successfully'
    });
  } catch (error) {
    console.error('Error removing token:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error removing token'
    });
  }
});

/**
 * @route GET /api/notifications/user/:userId
 * @desc Get all notifications for a user
 * @access Private
 */
router.get('/user/:userId', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if user has permission to access these notifications
    if (req.user.uid !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: Cannot access notifications for another user'
      });
    }
    
    // Get notifications from Firestore
    const snapshot = await db.collection('notifications')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();
    
    const notifications = [];
    
    snapshot.forEach(doc => {
      notifications.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return res.status(200).json({
      success: true,
      count: notifications.length,
      notifications
    });
  } catch (error) {
    console.error('Error getting notifications:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error getting notifications'
    });
  }
});

/**
 * @route PUT /api/notifications/:id/read
 * @desc Mark a notification as read
 * @access Private
 */
router.put('/:id/read', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the notification
    const notificationRef = db.collection('notifications').doc(id);
    const notificationDoc = await notificationRef.get();
    
    if (!notificationDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }
    
    const notification = notificationDoc.data();
    
    // Check if user has permission to mark this notification as read
    if (req.user.uid !== notification.userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: Cannot mark notification as read for another user'
      });
    }
    
    // Update notification
    await notificationRef.update({
      read: true,
      readAt: new Date().toISOString()
    });
    
    return res.status(200).json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error marking notification as read'
    });
  }
});

module.exports = router;