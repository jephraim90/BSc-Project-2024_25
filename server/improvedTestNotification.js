// improvedTestNotification.js - Better test script for FCM notifications

const admin = require('./firebaseAdmin.js');
const db = admin.firestore();

// User ID to test with
const userId = process.argv[2] || 'UEgAg9pfVBeZquI9rQ7wYO3jpr73';

/**
 * Send a test notification directly using Firebase Admin
 */
async function sendDirectNotification(userId) {
  try {
    console.log(`Preparing to send direct notification to user: ${userId}`);
    
    // Check if user exists and get tokens
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      console.error(`User ${userId} does not exist!`);
      return false;
    }
    
    const userData = userDoc.data();
    const tokens = userData.fcmTokens || [];
    
    if (tokens.length === 0) {
      console.log('No FCM tokens found for user. Run fixUserTokens.js first.');
      return false;
    }
    
    console.log(`Found ${tokens.length} tokens for user:`, tokens);
    
    // Create a test notification
    const notification = {
      title: 'Test Notification',
      body: `This is a test notification sent at ${new Date().toISOString()}`,
      data: {
        type: 'test',
        timestamp: Date.now().toString(),
        source: 'direct_admin_test'
      }
    };
    
    // Try to send to each token with detailed error handling
    for (const token of tokens) {
      try {
        console.log(`Attempting to send to token: ${token}`);
        
        // Prepare the message payload
        const message = {
          token,
          notification: {
            title: notification.title,
            body: notification.body
          },
          data: notification.data,
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
        const result = await admin.messaging().send(message);
        
        console.log(`✅ Notification sent successfully!`);
        console.log(`Message ID: ${result}`);
        
        // Store the notification in Firestore
        await db.collection('notifications').add({
          userId,
          title: notification.title,
          body: notification.body,
          data: notification.data,
          sent: true,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          messageId: result,
          read: false
        });
        
        console.log(`Notification stored in Firestore`);
      } catch (error) {
        console.error(`Error sending to token: ${token}`);
        console.error(`Error code: ${error.code}`);
        console.error(`Error message: ${error.message}`);
        
        // Check if this is a "SenderId mismatch" error
        if (error.code === 'messaging/mismatched-credential' || 
            (error.message && error.message.includes('SenderId mismatch'))) {
          console.log('This is a SenderId mismatch error. Token is from a different Firebase project.');
          
          // Log detailed token information
          if (token.includes(':')) {
            const [senderId] = token.split(':');
            console.log(`Token sender ID: ${senderId}`);
            console.log(`Your server project ID: ${admin.app().options.projectId}`);
            console.log('These should match for FCM to work properly.');
          }
          
          // Try to remove the invalid token
          try {
            await db.collection('users').doc(userId).update({
              fcmTokens: admin.firestore.FieldValue.arrayRemove(token)
            });
            console.log(`Removed invalid token from user document`);
          } catch (removeError) {
            console.error('Error removing invalid token:', removeError);
          }
        }
        
        // Store the failed notification attempt
        await db.collection('notifications').add({
          userId,
          title: notification.title,
          body: notification.body,
          data: notification.data,
          sent: false,
          error: {
            code: error.code,
            message: error.message
          },
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          read: false
        });
        
        console.log('Failed notification stored in Firestore');
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error in sendDirectNotification:', error);
    return false;
  }
}

// Run the test
sendDirectNotification(userId)
  .then(success => {
    console.log(success ? 'Test completed successfully!' : 'Test failed.');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });