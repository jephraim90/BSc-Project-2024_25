const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
admin.initializeApp();

/**
 * Cloud Function to send notifications to specific users
 * This function can be called from your client app
 */
exports.sendNotificationToUser = functions.https.onCall(async (data, context) => {
  // Check if user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }
  
  const { userId, notification } = data;
  
  // Validate required parameters
  if (!userId || !notification || !notification.title || !notification.body) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'The function requires a userId, and a notification with title and body.'
    );
  }
  
  try {
    // Get user document to fetch FCM tokens
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'The specified user was not found.'
      );
    }
    
    const userData = userDoc.data();
    
    // Check if user has registered FCM tokens
    if (!userData.fcmTokens || Object.keys(userData.fcmTokens).length === 0) {
      return { success: false, message: 'User has no registered notification tokens.' };
    }
    
    // Extract tokens (filter out non-token fields)
    const tokens = Object.keys(userData.fcmTokens).filter(key => 
      key !== 'lastUpdated' && typeof userData.fcmTokens[key] === 'object'
    );
    
    if (tokens.length === 0) {
      return { success: false, message: 'User has no valid notification tokens.' };
    }
    
    // Prepare notification message for different platforms
    const message = {
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: notification.data || {},
      tokens: tokens,
    };
    
    // Send the notification using FCM
    const response = await admin.messaging().sendMulticast(message);
    
    // Handle results and clean up invalid tokens
    const tokensToRemove = {};
    if (response.failureCount > 0) {
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          // If token is invalid or unregistered, mark for removal
          if (
            resp.error.code === 'messaging/invalid-registration-token' ||
            resp.error.code === 'messaging/registration-token-not-registered'
          ) {
            tokensToRemove[tokens[idx]] = true;
          }
        }
      });
      
      // Remove invalid tokens if any
      if (Object.keys(tokensToRemove).length > 0) {
        const updatedTokens = { ...userData.fcmTokens };
        Object.keys(tokensToRemove).forEach(token => {
          delete updatedTokens[token];
        });
        
        // Update the user document with cleaned tokens
        await admin.firestore().collection('users').doc(userId).update({
          fcmTokens: updatedTokens
        });
      }
    }
    
    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount
    };
    
  } catch (error) {
    console.error('Error sending notification:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Trigger notification when a new reservation is created
 * This function runs automatically when a new reservation document is created
 */
exports.onReservationCreated = functions.firestore
  .document('reservations/{reservationId}')
  .onCreate(async (snapshot, context) => {
    const reservation = snapshot.data();
    const reservationId = context.params.reservationId;
    
    // Ensure required data exists
    if (!reservation.userId || !reservation.restaurantName) {
      console.error('Missing required data for reservation notification');
      return;
    }
    
    try {
      // Get user document to fetch FCM tokens
      const userDoc = await admin.firestore().collection('users').doc(reservation.userId).get();
      
      if (!userDoc.exists) {
        console.error('User not found for sending notification');
        return;
      }
      
      const userData = userDoc.data();
      
      // Check if user has FCM tokens
      if (!userData.fcmTokens || Object.keys(userData.fcmTokens).filter(key => 
        key !== 'lastUpdated' && typeof userData.fcmTokens[key] === 'object'
      ).length === 0) {
        console.log('User has no notification tokens');
        return;
      }
      
      // Format the date for display
      const displayDate = new Date(reservation.date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      // Extract tokens
      const tokens = Object.keys(userData.fcmTokens).filter(key => 
        key !== 'lastUpdated' && typeof userData.fcmTokens[key] === 'object'
      );
      
      // Prepare notification
      const message = {
        notification: {
          title: 'Reservation Confirmed!',
          body: `Your reservation at ${reservation.restaurantName} on ${displayDate} at ${reservation.time} has been confirmed.`
        },
        data: {
          type: 'reservation_confirmation',
          reservationId: reservationId,
          restaurantId: reservation.restaurantId || '',
          date: reservation.date || '',
          time: reservation.time || ''
        },
        tokens: tokens
      };
      
      // Send the notification
      await admin.messaging().sendMulticast(message);
      console.log(`Notification sent to user ${reservation.userId} for reservation ${reservationId}`);
      
      // Also store the notification in Firestore
      await admin.firestore().collection('notifications').add({
        userId: reservation.userId,
        title: 'Reservation Confirmed!',
        body: `Your reservation at ${reservation.restaurantName} on ${displayDate} at ${reservation.time} has been confirmed.`,
        data: {
          type: 'reservation_confirmation',
          reservationId: reservationId,
          restaurantId: reservation.restaurantId || '',
          date: reservation.date || '',
          time: reservation.time || ''
        },
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
    } catch (error) {
      console.error('Error sending reservation notification:', error);
    }
  });

/**
 * Trigger a notification reminder before reservation
 * This function runs on a schedule to check for upcoming reservations
 */
exports.sendReservationReminders = functions.pubsub.schedule('every 30 minutes').onRun(async (context) => {
  try {
    const now = admin.firestore.Timestamp.now();
    const oneHourFromNow = new admin.firestore.Timestamp(
      now.seconds + 3600, // Add 1 hour in seconds
      now.nanoseconds
    );
    
    // Get reservations that start in approximately 1 hour
    const reservationsSnapshot = await admin.firestore()
      .collection('reservations')
      .where('status', '==', 'confirmed')
      .where('reminderSent', '==', false) // Make sure we haven't sent a reminder yet
      .get();
    
    const batch = admin.firestore().batch();
    let reminderCount = 0;
    
    // Process each reservation
    for (const doc of reservationsSnapshot.docs) {
      const reservation = doc.data();
      
      // Parse reservation time to check if it's approximately 1 hour away
      try {
        const reservationDate = new Date(reservation.date);
        const reservationTime = reservation.time; // Assuming format like "7:00 PM"
        
        // Parse time (assuming format like "7:00 PM")
        const timeMatch = reservationTime.match(/(\d+):(\d+)\s*(AM|PM)?/i);
        if (!timeMatch) continue;
        
        const [_, hourStr, minuteStr, ampm] = timeMatch;
        let hours = parseInt(hourStr);
        const minutes = parseInt(minuteStr);
        
        // Convert to 24-hour format if PM
        if (ampm && ampm.toUpperCase() === 'PM' && hours < 12) {
          hours += 12;
        } else if (ampm && ampm.toUpperCase() === 'AM' && hours === 12) {
          hours = 0;
        }
        
        // Set the reservation time
        reservationDate.setHours(hours, minutes, 0, 0);
        
        // Calculate time difference in milliseconds
        const timeDiff = reservationDate.getTime() - Date.now();
        
        // If reservation is between 45 minutes and 75 minutes away (1 hour ± 15 minutes)
        if (timeDiff > 2700000 && timeDiff < 4500000) {
          // Get user tokens
          const userDoc = await admin.firestore().collection('users').doc(reservation.userId).get();
          
          if (userDoc.exists) {
            const userData = userDoc.data();
            const tokens = Object.keys(userData.fcmTokens || {}).filter(key => 
              key !== 'lastUpdated' && typeof userData.fcmTokens[key] === 'object'
            );
            
            if (tokens.length > 0) {
              // Send reminder notification
              await admin.messaging().sendMulticast({
                notification: {
                  title: 'Reservation Reminder',
                  body: `Your reservation at ${reservation.restaurantName} is in 1 hour!`
                },
                data: {
                  type: 'reservation_reminder',
                  reservationId: doc.id,
                  restaurantId: reservation.restaurantId || '',
                  date: reservation.date || '',
                  time: reservation.time || ''
                },
                tokens: tokens
              });
              
              // Store the notification in Firestore
              await admin.firestore().collection('notifications').add({
                userId: reservation.userId,
                title: 'Reservation Reminder',
                body: `Your reservation at ${reservation.restaurantName} is in 1 hour!`,
                data: {
                  type: 'reservation_reminder',
                  reservationId: doc.id,
                  restaurantId: reservation.restaurantId || '',
                  date: reservation.date || '',
                  time: reservation.time || ''
                },
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
              });
              
              // Mark reminder as sent
              batch.update(doc.ref, { reminderSent: true });
              reminderCount++;
            }
          }
        }
      } catch (parseError) {
        console.error('Error parsing reservation time:', parseError);
        continue;
      }
    }
    
    // Commit all updates in a batch
    if (reminderCount > 0) {
      await batch.commit();
      console.log(`Sent ${reminderCount} reservation reminders`);
    }
    
    return null;
  } catch (error) {
    console.error('Error sending reservation reminders:', error);
    return null;
  }
});