// services/reservationHandler.js

import RestaurantAPI from './RestaurantAPI';
import notificationService from './notificationService';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';

/**
 * Helper to safely update Firestore documents with error handling
 * @param {string} collection - Collection name
 * @param {string} documentId - Document ID
 * @param {Object} data - Data to update
 * @returns {Promise<Object>} Result with success status
 */
async function safeUpdateDocument(collection, documentId, data) {
  try {
    const docRef = doc(db, collection, documentId);
    await updateDoc(docRef, data);
    return { success: true };
  } catch (error) {
    console.error(`Error updating ${collection}/${documentId}:`, error);
    
    // Handle different types of errors
    if (error.code === 'permission-denied') {
      console.log(`Permission denied when updating ${collection}/${documentId}. Check your Firebase rules.`);
      
      // In development, continue despite permission errors
      if (__DEV__) {
        console.log('Continuing in development mode despite permission error');
        return { success: true, permissionError: true };
      }
    }
    
    // For development, don't let document update failures block the app
    if (__DEV__) {
      console.log(`Continuing in development despite error updating ${collection}/${documentId}`);
      return { success: true, error: error.message };
    }
    
    return { success: false, error: error.message };
  }
}

/**
 * Centralized handler for creating reservations and setting up notifications
 * @param {Object} reservationData - Complete reservation data
 * @param {boolean} useServerNotifications - Whether to use server notifications
 * @returns {Promise<Object>} Result with success status and reservation ID
 */
export async function handleReservationCreation(reservationData, useServerNotifications = false) {
    console.log('handleReservationCreation called');    
    try {
      console.log('Creating reservation with data:', {
        restaurantName: reservationData.restaurantName,
        date: reservationData.date,
        time: reservationData.time,
        guests: reservationData.guests,
        serverNotifications: useServerNotifications
      });
      
      // Add notification preference to reservation data
      const reservationWithPreferences = {
        ...reservationData,
        serverNotifications: useServerNotifications,
        clientRemindersScheduled: false,
        notificationPreferences: {
          useServerNotifications,
          setAt: new Date().toISOString()
        }
      };
      
      // Create reservation using the existing RestaurantAPI
      const result = await RestaurantAPI.createDetailedReservation(reservationWithPreferences);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create reservation');
      }
      
      const reservationId = result.id;
      console.log(`Reservation created with ID: ${reservationId}`);
      
      // Send immediate confirmation notification
      try {
        // Create confirmation notification
        const confirmationNotification = {
          title: 'Reservation Confirmed!',
          body: `Your reservation at ${reservationData.restaurantName} on ${formatLocalDate(reservationData.date)} at ${reservationData.time} has been confirmed.`,
          data: {
            type: 'reservation_confirmation',
            reservationId,
            restaurantId: reservationData.restaurantId || '',
            date: reservationData.date,
            time: reservationData.time
          }
        };
        
        // Send notification immediately
        await notificationService.sendNotificationToUser(
          reservationData.userId,
          confirmationNotification
        );
        
        console.log('Immediate confirmation notification sent');
      } catch (notificationError) {
        console.error('Error sending immediate confirmation notification:', notificationError);
        // Continue even if notification fails
      }
      
      // Helper function for date formatting
      function formatLocalDate(dateInput) {
        const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      
      // Schedule reminders based on preference
      try {
        // Parse date string if needed
        const dateObj = reservationData.date instanceof Date 
          ? reservationData.date 
          : new Date(reservationData.date);
        
        if (useServerNotifications) {
          // Schedule server-side reminders
          console.log('Using server-side notifications');
          
          try {
            // Ensure we send the properly formatted local date
            const formattedLocalDate = formatLocalDate(dateObj);
            console.log('Formatted local date for server:', formattedLocalDate);
            
            const reminderResult = await notificationService.callNotificationServer(
              '/reservations/schedule-reminders',
              {
                userId: reservationData.userId,
                reservationId,
                restaurantName: reservationData.restaurantName,
                date: formattedLocalDate, // Send properly formatted local date
                time: reservationData.time,
                guests: reservationData.guests,
                timezoneOffset: new Date().getTimezoneOffset() // Include timezone offset
              }
            );
            
            console.log('Server reminders scheduled:', reminderResult);
          } catch (serverError) {
            console.error('Error scheduling server reminders:', serverError);
            
            // If in development mode, fall back to client-side reminders
            if (__DEV__) {
              console.log('Falling back to client-side reminders in development mode');
              
              const fallbackResult = await notificationService.scheduleReservationReminders(
                reservationId,
                reservationData.restaurantName,
                dateObj,
                reservationData.time,
                false // use client notifications as fallback
              );
              
              console.log(`Scheduled ${fallbackResult.count || 0} fallback client-side reminders`);
            }
          }
        } else {
          // Schedule client-side reminders
          console.log('Using client-side notifications');
          
          const reminderResult = await notificationService.scheduleReservationReminders(
            reservationId,
            reservationData.restaurantName,
            dateObj,
            reservationData.time,
            false // explicitly set useServerNotifications to false
          );
          
          console.log(`Scheduled ${reminderResult.count || 0} client-side reminders`);
          
          // Update the reservation with reminder info using the safe method
          await safeUpdateDocument('reservations', reservationId, {
            clientRemindersScheduled: true,
            clientRemindersScheduledAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      } catch (reminderError) {
        console.error('Error scheduling reminders:', reminderError);
        // Continue even if reminders fail to schedule
      }
      
      return {
        success: true,
        id: reservationId,
        serverNotifications: useServerNotifications
      };
    } catch (error) {
      console.error('Error in handleReservationCreation:', error);
      return { success: false, error: error.message };
    }
  }
/**
 * Update an existing reservation
 * @param {string} reservationId - Reservation ID to update
 * @param {Object} updateData - Data to update
 * @param {boolean} resetNotifications - Whether to reset and reschedule notifications
 * @returns {Promise<Object>} Result with success status
 */
export async function updateReservation(reservationId, updateData, resetNotifications = false) {
  try {
    // Get current reservation data
    const currentData = await RestaurantAPI.getReservationById(reservationId);
    
    if (!currentData.success) {
      return { success: false, error: 'Reservation not found' };
    }
    
    const reservation = currentData.data;
    
    // Update the reservation
    const updateResult = await RestaurantAPI.updateReservation(reservationId, {
      ...updateData,
      updatedAt: new Date().toISOString()
    });
    
    if (!updateResult.success) {
      throw new Error(updateResult.error || 'Failed to update reservation');
    }
    
    // Reset notifications if requested or if date/time changed
    const timeChanged = (updateData.date && updateData.date !== reservation.date) || 
                       (updateData.time && updateData.time !== reservation.time);
    
    if (resetNotifications || timeChanged) {
      // Cancel existing reminders
      await notificationService.cancelReservationReminders(reservationId);
      
      // Determine which notification method to use
      const useServerNotifications = updateData.serverNotifications !== undefined 
        ? updateData.serverNotifications 
        : reservation.serverNotifications || false;
      
      // Get updated reservation data for scheduling
      const updatedReservation = {
        ...reservation,
        ...updateData,
        id: reservationId,
        serverNotifications: useServerNotifications
      };
      
      // Parse date
      const dateObj = updatedReservation.date instanceof Date 
        ? updatedReservation.date 
        : new Date(updatedReservation.date);
      
      // Schedule new reminders with fallback
      try {
        if (useServerNotifications) {
          // Server-side reminders
          await notificationService.callNotificationServer(
            '/reservations/schedule-reminders',
            {
              userId: updatedReservation.userId,
              reservationId,
              restaurantName: updatedReservation.restaurantName,
              date: updatedReservation.date,
              time: updatedReservation.time,
              guests: updatedReservation.guests
            }
          );
        } else {
          // Client-side reminders
          const reminderResult = await notificationService.scheduleReservationReminders(
            reservationId,
            updatedReservation.restaurantName,
            dateObj,
            updatedReservation.time,
            false
          );
          
          // Safely update the reservation with reminder info
          if (reminderResult.success) {
            await safeUpdateDocument('reservations', reservationId, {
              clientRemindersScheduled: true,
              clientRemindersScheduledAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
          }
        }
      } catch (notificationError) {
        console.error('Error scheduling reminders:', notificationError);
        
        // Fall back to client reminders in development
        if (__DEV__ && useServerNotifications) {
          try {
            await notificationService.scheduleReservationReminders(
              reservationId,
              updatedReservation.restaurantName,
              dateObj,
              updatedReservation.time,
              false
            );
          } catch (fallbackError) {
            console.error('Error scheduling fallback reminders:', fallbackError);
          }
        }
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error updating reservation:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Cancel a reservation
 * @param {string} reservationId - Reservation ID to cancel
 * @returns {Promise<Object>} Result with success status
 */
export async function cancelReservation(reservationId) {
  try {
    // Update reservation status
    const updateResult = await RestaurantAPI.updateReservation(reservationId, {
      status: 'canceled',
      canceledAt: new Date().toISOString()
    });
    
    if (!updateResult.success) {
      throw new Error(updateResult.error || 'Failed to cancel reservation');
    }
    
    // Cancel any scheduled reminders
    try {
      await notificationService.cancelReservationReminders(reservationId);
    } catch (reminderError) {
      console.error('Error canceling reminders:', reminderError);
      // Continue even if reminders fail to cancel
    }
    
    // Get reservation data for notification
    const reservationData = await RestaurantAPI.getReservationById(reservationId);
    
    if (reservationData.success) {
      const reservation = reservationData.data;
      
      // Send cancellation notification
      try {
        const notification = {
          title: 'Reservation Canceled',
          body: `Your reservation at ${reservation.restaurantName} on ${notificationService.formatDate(reservation.date, 'medium')} at ${reservation.time} has been canceled.`,
          data: {
            type: 'reservation_cancellation',
            reservationId
          }
        };
        
        await notificationService.sendNotificationToUser(reservation.userId, notification);
      } catch (notificationError) {
        console.error('Error sending cancellation notification:', notificationError);
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error canceling reservation:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Switch notification method for a reservation
 * @param {string} reservationId - Reservation ID
 * @param {boolean} useServerNotifications - Whether to use server notifications
 * @returns {Promise<Object>} Result with success status
 */
export async function switchNotificationMethod(reservationId, useServerNotifications) {
  try {
    // First, directly update the document with the safe method
    const updateResult = await safeUpdateDocument('reservations', reservationId, {
      serverNotifications: useServerNotifications,
      notificationPreferencesUpdatedAt: new Date().toISOString()
    });
    
    if (!updateResult.success && !updateResult.permissionError) {
      throw new Error(updateResult.error || 'Failed to update notification preferences');
    }
    
    // Then call the service method which handles rescheduling
    try {
      return await notificationService.updateReservationNotificationPreferences(
        reservationId, 
        useServerNotifications
      );
    } catch (error) {
      console.error('Error in notification service:', error);
      return { success: true, warning: 'Updated preferences but error in notification service' };
    }
  } catch (error) {
    console.error('Error switching notification method:', error);
    
    // In development, don't let it block the app
    if (__DEV__) {
      return { success: true, devOverride: true, error: error.message };
    }
    
    return { success: false, error: error.message };
  }
}

export default {
  handleReservationCreation,
  updateReservation,
  cancelReservation,
  switchNotificationMethod,
  safeUpdateDocument
};