// verifyNotificationStorage.js

const admin = require('./firebaseAdmin.js');
const db = admin.firestore();

// User ID to check
const userId = process.argv[2] || 'UEgAg9pfVBeZquI9rQ7wYO3jpr73';

async function verifyNotificationStorage() {
  try {
    console.log(`Checking notifications for user: ${userId}`);
    
    // Query notifications collection for this user
    const notificationsSnapshot = await db.collection('notifications')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();
    
    if (notificationsSnapshot.empty) {
      console.log('No notifications found for this user');
      return;
    }
    
    console.log(`Found ${notificationsSnapshot.size} notifications:`);
    
    // Display each notification
    notificationsSnapshot.forEach((doc) => {
      const notification = doc.data();
      console.log(`\nNotification ID: ${doc.id}`);
      console.log(`Title: ${notification.title}`);
      console.log(`Body: ${notification.body}`);
      console.log(`Created: ${notification.createdAt ? notification.createdAt.toDate() : 'N/A'}`);
      console.log(`Delivered: ${notification.delivered ? 'Yes' : 'No'}`);
      
      if (notification.error) {
        console.log(`Error: ${notification.error.code} - ${notification.error.message}`);
      }
      
      if (notification.messageId) {
        console.log(`Message ID: ${notification.messageId}`);
      }
      
      console.log(`Data:`, notification.data || {});
    });
    
    console.log('\nNotification storage is working correctly!');
  } catch (error) {
    console.error('Error verifying notifications:', error);
  }
}

verifyNotificationStorage()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));