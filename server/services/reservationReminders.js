async function createScheduledNotifications(reservation) {
    try {
      const { id, userId, restaurantName, date, time } = reservation;
      
      if (!id || !userId || !date || !time) {
        console.error('Missing required reservation data:', reservation);
        return { success: false, error: 'Missing required reservation data' };
      }
      
      console.log(`Creating scheduled notifications for reservation ${id}`);
      
      // Parse the reservation date and time
      const reservationDate = new Date(date);
      
      // Parse the time string (e.g., "7:00 PM")
      const timeParts = time.match(/(\d+):(\d+)\s*(AM|PM)?/i);
      if (!timeParts) {
        throw new Error('Invalid time format');
      }
      
      let hour = parseInt(timeParts[1]);
      const minute = parseInt(timeParts[2]);
      const period = timeParts[3]?.toUpperCase();
      
      // Convert to 24-hour format
      if (period === 'PM' && hour < 12) hour += 12;
      if (period === 'AM' && hour === 12) hour = 0;
      
      // Set the reservation date time
      reservationDate.setHours(hour, minute, 0, 0);
      
      // Calculate reminder times
      const dayBefore = new Date(reservationDate);
      dayBefore.setDate(dayBefore.getDate() - 1);
      dayBefore.setHours(10, 0, 0, 0); // 10:00 AM the day before
      
      const oneHourBefore = new Date(reservationDate.getTime() - (60 * 60 * 1000));
      const thirtyMinBefore = new Date(reservationDate.getTime() - (30 * 60 * 1000));
      
      // Define the reminders to create
      const reminderSchedules = [
        {
          type: 'day-before',
          scheduledFor: dayBefore.toISOString(),
          title: 'Reservation Tomorrow',
          body: `Don't forget your reservation at ${restaurantName} tomorrow at ${time}.`,
          minutesBefore: 24 * 60
        },
        {
          type: '1-hour',
          scheduledFor: oneHourBefore.toISOString(),
          title: 'Reservation Soon',
          body: `Your reservation at ${restaurantName} is in 1 hour.`,
          minutesBefore: 60
        },
        {
          type: '30-minute',
          scheduledFor: thirtyMinBefore.toISOString(),
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
        const scheduledDate = new Date(reminder.scheduledFor);
        
        if (scheduledDate <= now) {
          console.log(`Skipping ${reminder.type} reminder - scheduled time is in the past`);
          continue;
        }
        
        // Create the notification document
        const notificationData = {
          userId,
          reservationId: id,
          title: reminder.title,
          body: reminder.body,
          data: {
            type: 'reservation_reminder',
            reservationId: id,
            minutesBefore: reminder.minutesBefore
          },
          scheduledFor: reminder.scheduledFor,
          sent: false,
          created: admin.firestore.FieldValue.serverTimestamp()
        };
        
        try {
          const docRef = await admin.firestore().collection('scheduledNotifications').add(notificationData);
          console.log(`Created ${reminder.type} scheduled notification with ID: ${docRef.id}`);
          
          createdNotifications.push({
            id: docRef.id,
            type: reminder.type,
            scheduledFor: reminder.scheduledFor
          });
        } catch (error) {
          console.error(`Error creating ${reminder.type} scheduled notification:`, error);
        }
      }
      
      // Update the reservation document to record that server notifications are scheduled
      if (createdNotifications.length > 0) {
        await admin.firestore().collection('reservations').doc(id).update({
          serverNotifications: true,
          scheduledNotificationIds: createdNotifications.map(n => n.id),
          scheduledNotificationsCreatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
      
      return {
        success: createdNotifications.length > 0,
        createdNotifications,
        count: createdNotifications.length
      };
    } catch (error) {
      console.error('Error creating scheduled notifications:', error);
      return { success: false, error: error.message };
    }
  }