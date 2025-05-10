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
 * @route POST /api/reservations/schedule-reminders
 * @desc Schedule reservation reminders by creating entries in scheduledNotifications collection
 * @access Private
 */
router.post('/schedule-reminders', async (req, res) => {
  try {
    const { userId, reservationId, restaurantName, date, time, guests } = req.body;
    
    // Validate required parameters
    if (!userId || !reservationId || !restaurantName || !date || !time) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, reservationId, restaurantName, date, time'
      });
    }
    
    console.log(`Scheduling reminders for reservation ${reservationId} at ${restaurantName}`);
    console.log(`Date: ${date}, Time: ${time}, Guests: ${guests || 'unknown'}, User: ${userId}`);
    
    // Parse the reservation date and time
    const reservationDate = new Date(date);
    reservationDate.setDate(reservationDate.getDate() + 1); // Add one day to fix the off-by-one issue
    
    if (isNaN(reservationDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Expected a valid date string.'
      });
    }
    
    // Parse the time string (e.g., "7:00 PM")
    const timeParts = time.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (!timeParts) {
      return res.status(400).json({
        success: false,
        error: 'Invalid time format. Expected format like "7:00 PM".'
      });
    }
    
    let hour = parseInt(timeParts[1]);
    const minute = parseInt(timeParts[2]);
    const period = timeParts[3]?.toUpperCase();
    
    // Convert to 24-hour format
    if (period === 'PM' && hour < 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;
    
    // Set the reservation time
    reservationDate.setHours(hour, minute, 0, 0);
    
    // Calculate reminder times
    const dayBefore = new Date(reservationDate);
    console.log("the day before us ", dayBefore)
    dayBefore.setDate(dayBefore.getDate() - 1);
    dayBefore.setHours(10, 0, 0, 0); // 10:00 AM the day before
    
    const oneHourBefore = new Date(reservationDate.getTime() - (60 * 60 * 1000));
    const thirtyMinBefore = new Date(reservationDate.getTime() - (30 * 60 * 1000));
    
    // Define the reminders to create
    const reminderSchedules = [
      {
        type: 'day-before',
        scheduledFor: dayBefore,
        title: 'Reservation Tomorrow',
        body: `Don't forget your reservation at ${restaurantName} tomorrow at ${time}.`,
        minutesBefore: 24 * 60
      },
      {
        type: '1-hour',
        scheduledFor: oneHourBefore,
        title: 'Reservation Soon',
        body: `Your reservation at ${restaurantName} is in 1 hour.`,
        minutesBefore: 60
      },
      {
        type: '30-minute',
        scheduledFor: thirtyMinBefore,
        title: 'Reservation Reminder',
        body: `Your reservation at ${restaurantName} is in 30 minutes.`,
        minutesBefore: 30
      }
    ];
    
    const now = new Date();
    const createdNotifications = [];
    
    // Create each scheduled notification
    for (const reminder of reminderSchedules) {
      // Only create if the scheduled time is in the future
      console.log("Today is ", reminder.scheduledFor)
      if (reminder.scheduledFor <= now) {
        console.log(`Skipping ${reminder.type} reminder - scheduled time is in the past`);
        continue;
      }
      
      // Create the notification document
      const notificationData = {
        userId,
        reservationId,
        title: reminder.title,
        body: reminder.body,
        data: {
          type: 'reservation_reminder',
          reservationId,
          minutesBefore: reminder.minutesBefore,
          restaurantName,
          reservationTime: time,
          guests: guests || ''
        },
        scheduledFor: reminder.scheduledFor.toISOString(),
        sent: false,
        canceled: false,
        created: admin.firestore.FieldValue.serverTimestamp()
      };
      
      try {
        const docRef = await db.collection('scheduledNotifications').add(notificationData);
        
        console.log(`Created ${reminder.type} scheduled notification with ID: ${docRef.id}`);
        console.log(`Scheduled for: ${reminder.scheduledFor.toISOString()}`);
        
        createdNotifications.push({
          id: docRef.id,
          type: reminder.type,
          scheduledFor: reminder.scheduledFor.toISOString()
        });
      } catch (error) {
        console.error(`Error creating ${reminder.type} scheduled notification:`, error);
      }
    }
    
    // Update the reservation document to record that server notifications are scheduled
    if (createdNotifications.length > 0) {
      try {
        await db.collection('reservations').doc(reservationId).update({
          serverNotifications: true,
          scheduledNotificationIds: createdNotifications.map(n => n.id),
          scheduledNotificationsCreatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`Updated reservation ${reservationId} with scheduled notification IDs`);
      } catch (updateError) {
        console.error(`Error updating reservation ${reservationId}:`, updateError);
        // Continue even if update fails - we still created the notifications
      }
    }
    
    return res.status(200).json({
      success: createdNotifications.length > 0,
      message: `Created ${createdNotifications.length} scheduled notifications`,
      createdNotifications,
      count: createdNotifications.length
    });
  } catch (error) {
    console.error('Error scheduling reminders:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error scheduling reminders: ' + error.message
    });
  }
});

/**
 * @route DELETE /api/reservations/:id/reminders
 * @desc Cancel all scheduled reminders for a reservation
 * @access Private
 */
router.delete('/:id/reminders', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Reservation ID is required'
      });
    }
    
    console.log(`Canceling reminders for reservation ${id}`);
    
    // Get all scheduled notifications for this reservation
    const snapshot = await db.collection('scheduledNotifications')
      .where('reservationId', '==', id)
      .where('sent', '==', false)
      .get();
    
    if (snapshot.empty) {
      console.log(`No pending notifications found for reservation ${id}`);
      return res.status(200).json({
        success: true,
        message: 'No pending notifications found',
        count: 0
      });
    }
    
    console.log(`Found ${snapshot.size} pending notifications for reservation ${id}`);
    
    const batch = db.batch();
    const canceledIds = [];
    
    // Mark all as canceled
    snapshot.forEach(doc => {
      batch.update(doc.ref, {
        canceled: true,
        canceledAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      canceledIds.push(doc.id);
    });
    
    // Commit the batch
    await batch.commit();
    
    console.log(`Canceled ${canceledIds.length} notifications for reservation ${id}`);
    
    // Update the reservation document
    try {
      await db.collection('reservations').doc(id).update({
        serverNotifications: false,
        scheduledNotificationsCanceled: true,
        scheduledNotificationsCanceledAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`Updated reservation ${id} with cancellation status`);
    } catch (updateError) {
      console.error(`Error updating reservation ${id}:`, updateError);
      // Continue even if update fails - we still canceled the notifications
    }
    
    return res.status(200).json({
      success: true,
      message: `Canceled ${canceledIds.length} scheduled notifications`,
      canceledIds,
      count: canceledIds.length
    });
  } catch (error) {
    console.error('Error canceling reminders:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error canceling reminders: ' + error.message
    });
  }
});

// Export the router to be used in the main app
module.exports = router;