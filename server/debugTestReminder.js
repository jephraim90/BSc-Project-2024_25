// debugTestReminder.js - Script to create and test FCM notifications

const admin = require('./firebaseAdmin');
const db = admin.firestore();

/**
 * Creates a test reminder notification with proper string data values
 */
async function createTestReminder() {
  try {
    const now = new Date();
    console.log('Current time:', now.toISOString());
    
    // Schedule for 2 minutes in the future
    const scheduledTime = new Date(now.getTime() + 2 * 60 * 1000);
    console.log('Scheduled time:', scheduledTime.toISOString());
    
    // Use your actual user ID here
    const userId = 'UEgAg9pfVBeZquI9rQ7wYO3jpr73';
    const testReservationId = `test-${Date.now()}`;
    
    // Create notification with correctly formatted data (all string values)
    const reminderData = {
      userId,
      reservationId: testReservationId,
      type: 'test-reminder',
      title: 'Debug Test Reminder',
      body: `This is a properly formatted debug test reminder scheduled for ${scheduledTime.toLocaleTimeString()}.`,
      data: {
        type: 'reservation_reminder',
        reservationId: testReservationId,
        test: 'true', // String, not boolean
        timestamp: Date.now().toString() // String, not number
      },
      scheduledFor: scheduledTime.toISOString(),
      sent: false,
      createdAt: now.toISOString()
    };
    
    // Save to Firestore
    const docRef = await db.collection('scheduledNotifications').add(reminderData);
    
    console.log(`Test reminder created with ID: ${docRef.id}`);
    console.log(`Scheduled for: ${scheduledTime.toISOString()}`);
    console.log(`Data field correctly formatted as strings:`, reminderData.data);
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating test reminder:', error);
    throw error;
  }
}

// Run the test
createTestReminder()
  .then(id => {
    console.log(`Success! Watch for notification to be processed in ~2 minutes. Reminder ID: ${id}`);
    process.exit(0);
  })
  .catch(error => {
    console.error('Failed to create test reminder:', error);
    process.exit(1);
  });