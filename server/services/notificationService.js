// services/notificationService.js

const admin = require('../firebaseAdmin.js');
const db = admin.firestore();

class NotificationService {
  /**
   * Get all FCM tokens for a user
   * @param {string} userId - User ID
   * @returns {Promise<string[]>} Array of FCM tokens
   */
  async getUserTokens(userId) {
    try {
      // Get user document
      const userDoc = await db.collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        console.log(`No user found with ID: ${userId}`);
        return [];
      }
      
      // Get the tokens from the user document
      const userData = userDoc.data();
      const tokens = userData.fcmTokens || [];
      
      console.log(`Found ${tokens.length} tokens for user ${userId}`);
      return tokens;
    } catch (error) {
      console.error(`Error getting tokens for user ${userId}:`, error);
      return [];
    }
  }
  
  /**
   * Remove an invalid FCM token for a user
   * @param {string} userId - User ID
   * @param {string} token - FCM token to remove
   */
  async removeToken(userId, token) {
    try {
      console.log(`Removing invalid token: ${token}`);
      
      // Get user document reference
      const userRef = db.collection('users').doc(userId);
      
      // Remove the token using arrayRemove
      await userRef.update({
        fcmTokens: admin.firestore.FieldValue.arrayRemove(token)
      });
      
      console.log(`Removed invalid token ${token} from user ${userId}`);
      return true;
    } catch (error) {
      console.error(`Error removing token for user ${userId}:`, error);
      return false;
    }
  }
  
  /**
   * Store notification in Firestore for persistence/history
   * @param {string} userId - User ID
   * @param {object} notification - Notification object
   */
  async storeNotification(userId, notification, delivered = false, messageId = null, error = null) {
    try {
      // Create notification data object
      const notificationData = {
        userId,
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
        delivered,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      // Add message ID if available
      if (messageId) {
        notificationData.messageId = messageId;
      }
      
      // Add error info if available
      if (error) {
        notificationData.error = {
          code: error.code || 'unknown',
          message: error.message || 'Unknown error'
        };
      }
      
      // Store in Firestore
      const notificationRef = await db.collection('notifications').add(notificationData);
      
      console.log(`Stored notification in Firestore with ID: ${notificationRef.id}`);
      return notificationRef.id;
    } catch (error) {
      console.error('Error storing notification:', error);
      return null;
    }
  }
  
  /**
   * Send notification to a specific user via FCM
   * @param {string} userId - User ID
   * @param {object} notification - Notification object
   * @returns {Promise<object>} Result with success status
   */
  async sendToUser(userId, notification) {
    // Track overall success status
    let overallSuccess = false;
    let notificationId = null;
    
    try {
      // Get user's FCM tokens
      const tokens = await this.getUserTokens(userId);
      
      if (tokens.length === 0) {
        console.log(`No tokens found for user ${userId}`);
        
        // Store the notification anyway
        notificationId = await this.storeNotification(userId, notification, false, null, {
          code: 'no-tokens',
          message: 'No valid tokens found for user'
        });
        
        return {
          success: false,
          notificationId,
          message: 'No valid tokens found for user'
        };
      }
      
      // Store results for each token
      const results = [];
      
      // Try to send to each token
      for (const token of tokens) {
        try {
          // Prepare the message payload
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
                clickAction: 'FLUTTER_NOTIFICATION_CLICK'
              }
            },
            apns: {
              payload: {
                aps: {
                  contentAvailable: true,
                  badge: 1,
                  sound: 'default'
                }
              }
            }
          };
          
          // Send the message
          const messageId = await admin.messaging().send(message);
          
          // Store successful result
          results.push({ token, success: true, messageId });
          
          // At least one token succeeded
          overallSuccess = true;
          
          // Store the notification in Firestore
          notificationId = await this.storeNotification(userId, notification, true, messageId);
          
        } catch (error) {
          // Log the error
          console.error(`Failed to send to token: ${token}`, error);
          
          // Store failed result
          results.push({ token, success: false, error: error.message || error.code });
          
          // Check if we should remove the token
          const shouldRemoveToken = (
            error.code === 'messaging/invalid-registration-token' ||
            error.code === 'messaging/registration-token-not-registered' ||
            error.code === 'messaging/mismatched-credential' ||
            (error.message && error.message.includes('SenderId mismatch'))
          );
          
          if (shouldRemoveToken) {
            await this.removeToken(userId, token);
          }
          
          // Store the failed notification
          if (!notificationId) {
            notificationId = await this.storeNotification(userId, notification, false, null, error);
          }
        }
      }
      
      // Return final result
      return {
        success: overallSuccess,
        notificationId,
        results,
        tokensCount: tokens.length,
        successCount: results.filter(r => r.success).length,
        failureCount: results.filter(r => !r.success).length
      };
      
    } catch (error) {
      // Log any overall errors
      console.error('Error sending notification:', error);
      
      // Store the notification with error
      if (!notificationId) {
        notificationId = await this.storeNotification(userId, notification, false, null, error);
      }
      
      // Return error result
      return {
        success: false,
        notificationId,
        error: error.message || 'Unknown error'
      };
    }
  }
  
  /**
   * Send notification to multiple users
   * @param {string[]} userIds - Array of user IDs
   * @param {object} notification - Notification object
   * @returns {Promise<object>} Result with success status
   */
  async sendToUsers(userIds, notification) {
    // Send to each user and store results
    const results = await Promise.all(
      userIds.map(userId => this.sendToUser(userId, notification))
    );
    
    // Check if any were successful
    const anySuccess = results.some(r => r.success);
    
    // Return overall result
    return {
      success: anySuccess,
      results,
      usersCount: userIds.length,
      successCount: results.filter(r => r.success).length,
      failureCount: results.filter(r => !r.success).length
    };
  }
}

module.exports = new NotificationService();