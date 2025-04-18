// services/reservationService.js
import databaseService from './databaseService';
import { Alert } from 'react-native';

const ReservationService = {

  async createReservation(reservationData) {
    try {
      // Validation
      if (!reservationData.restaurantId) {
        throw new Error('Restaurant ID is required');
      }
      
      if (!reservationData.userId) {
        throw new Error('User ID is required');
      }
      
      if (!reservationData.date || !reservationData.time) {
        throw new Error('Date and time are required');
      }
      
      if (!reservationData.guests || isNaN(parseInt(reservationData.guests))) {
        throw new Error('Number of guests is required');
      }
      
      // Format data
      const formattedData = {
        ...reservationData,
        guests: parseInt(reservationData.guests),
        status: reservationData.status || 'confirmed',
        createdAt: new Date().toISOString(),
      };
      
      // Create the reservation in Firestore
      const result = await databaseService.createDocument('reservations', formattedData);
      
      return result;
    } catch (error) {
      console.error('Error creating reservation:', error);
      return {
        id: null,
        success: false,
        error: error.message
      };
    }
  },
  

  async getUserReservations(userId, includeCompleted = false) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }
      
      // Create query constraints
      let queryConstraints = [
        databaseService.queries.where('userId', '==', userId)
      ];
      
      // Only include non-completed reservations if specified
      if (!includeCompleted) {
        queryConstraints.push(
          databaseService.queries.where('status', 'in', ['confirmed', 'pending'])
        );
      }
      
      // Order by date (default ascending)
      queryConstraints.push(
        databaseService.queries.orderBy('date', 'asc')
      );
      
      // Get reservations from Firestore
      const result = await databaseService.getDocuments('reservations', queryConstraints);
      
      return result;
    } catch (error) {
      console.error('Error fetching user reservations:', error);
      return {
        data: [],
        success: false,
        error: error.message
      };
    }
  },
  

  async getRestaurantReservations(restaurantId, date = null) {
    try {
      if (!restaurantId) {
        throw new Error('Restaurant ID is required');
      }
      
      // Create query constraints
      let queryConstraints = [
        databaseService.queries.where('restaurantId', '==', restaurantId)
      ];
      
      // Add date filter if provided
      if (date) {
        queryConstraints.push(
          databaseService.queries.where('date', '==', date)
        );
      }
      
      // Order by time
      queryConstraints.push(
        databaseService.queries.orderBy('time', 'asc')
      );
      
      // Get reservations from Firestore
      const result = await databaseService.getDocuments('reservations', queryConstraints);
      
      return result;
    } catch (error) {
      console.error('Error fetching restaurant reservations:', error);
      return {
        data: [],
        success: false,
        error: error.message
      };
    }
  },
  

  async getReservationById(reservationId) {
    try {
      if (!reservationId) {
        throw new Error('Reservation ID is required');
      }
      
      const result = await databaseService.getDocumentById('reservations', reservationId);
      
      return result;
    } catch (error) {
      console.error('Error fetching reservation:', error);
      return {
        data: null,
        success: false,
        error: error.message
      };
    }
  },
  

  async updateReservation(reservationId, updatedData) {
    try {
      if (!reservationId) {
        throw new Error('Reservation ID is required');
      }
      
      // Add updated timestamp
      const dataWithTimestamp = {
        ...updatedData,
        updatedAt: new Date().toISOString()
      };
      
      const result = await databaseService.updateDocument('reservations', reservationId, dataWithTimestamp);
      
      return result;
    } catch (error) {
      console.error('Error updating reservation:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  async cancelReservation(reservationId) {
    try {
      if (!reservationId) {
        throw new Error('Reservation ID is required');
      }
      
      // First, get the reservation to check cancellation rules
      const getResult = await databaseService.getDocumentById('reservations', reservationId);
      
      if (!getResult.success) {
        throw new Error(getResult.error || 'Reservation not found');
      }
      
      const reservation = getResult.data;
      
      // Check if reservation is already cancelled
      if (reservation.status === 'cancelled') {
        return {
          success: true,
          message: 'Reservation is already cancelled'
        };
      }
      
      // Check cancellation timeframe (can cancel up to 2 hours before)
      const reservationDateTime = this.combineDateTime(reservation.date, reservation.time);
      const now = new Date();
      const timeDifference = reservationDateTime.getTime() - now.getTime();
      const hoursDifference = timeDifference / (1000 * 60 * 60);
      
      // If less than 2 hours until reservation, show warning but still allow cancellation
      let message = 'Reservation cancelled successfully';
      if (hoursDifference < 2 && hoursDifference > 0) {
        message = 'Reservation cancelled. Please note that cancellations within 2 hours of your reservation time may incur a cancellation fee.';
      }
      
      // Update reservation status
      const updateData = {
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const result = await databaseService.updateDocument('reservations', reservationId, updateData);
      
      if (result.success) {
        return {
          success: true,
          message
        };
      } else {
        throw new Error(result.error || 'Failed to cancel reservation');
      }
    } catch (error) {
      console.error('Error cancelling reservation:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
   async checkAvailability(restaurantId, date, partySize = 2) {
    try {
      if (!restaurantId || !date) {
        throw new Error('Restaurant ID and date are required');
      }
      
      // Get restaurant business hours
      const restaurantResult = await databaseService.getDocumentById('restaurants', restaurantId);
      
      if (!restaurantResult.success) {
        throw new Error(restaurantResult.error || 'Restaurant not found');
      }
      
      const restaurant = restaurantResult.data;
      
      // Get day of week from date
      const dateObj = new Date(date);
      const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dateObj.getDay()];
      
      // Check if restaurant is open on this day
      if (!restaurant.businessHours || !restaurant.businessHours[dayOfWeek] || !restaurant.businessHours[dayOfWeek].isOpen) {
        return {
          success: true,
          data: {
            available: false,
            message: 'Restaurant is closed on this day',
            availableSlots: []
          }
        };
      }
      
      // Get existing reservations for this date
      const reservationsResult = await this.getRestaurantReservations(restaurantId, date);
      const existingReservations = reservationsResult.success ? reservationsResult.data : [];
      
      // Generate time slots (simplified - a real app would use the restaurant's business hours)
      const businessHours = restaurant.businessHours[dayOfWeek];
      const timeSlots = this.generateTimeSlots(businessHours.opens, businessHours.closes, 30);
      
      // Check availability for each slot based on existing reservations and restaurant capacity
      // This is a simplified implementation - a real app would consider table layouts,
      // reservation duration, restaurant capacity, etc.
      const availableSlots = timeSlots.filter(slot => {
        // Check if there are too many reservations at this time slot
        const reservationsAtThisTime = existingReservations.filter(
          r => r.time === slot && r.status !== 'cancelled'
        );
        
        // Simplified capacity check - assume each restaurant can handle 10 concurrent reservations
        // Real implementation would be more complex based on restaurant seating capacity
        const maxSlotCapacity = restaurant.maxCapacity || 10;
        return reservationsAtThisTime.length < maxSlotCapacity;
      });
      
      return {
        success: true,
        data: {
          available: availableSlots.length > 0,
          message: availableSlots.length > 0 ? 'Time slots available' : 'No available time slots for this date',
          availableSlots
        }
      };
    } catch (error) {
      console.error('Error checking availability:', error);
      return {
        success: false,
        error: error.message,
        data: {
          available: false,
          message: 'Error checking availability',
          availableSlots: []
        }
      };
    }
  },
  

  generateTimeSlots(openTime, closeTime, intervalMinutes = 30) {
    const slots = [];
    const [openHour, openMinute] = openTime.split(':').map(Number);
    const [closeHour, closeMinute] = closeTime.split(':').map(Number);
    
    // Convert to minutes since midnight
    let currentMinutes = openHour * 60 + openMinute;
    const endMinutes = closeHour * 60 + closeMinute;
    
    // Generate slots at regular intervals
    while (currentMinutes < endMinutes - intervalMinutes) {
      const hour = Math.floor(currentMinutes / 60);
      const minute = currentMinutes % 60;
      
      // Format as 12-hour time
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      const timeString = `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
      
      slots.push(timeString);
      currentMinutes += intervalMinutes;
    }
    
    return slots;
  },
    combineDateTime(dateStr, timeStr) {
    // Parse date
    const [year, month, day] = dateStr.split('-').map(Number);
        // Parse time
    let hours = 0;
    let minutes = 0;
    
    const timeMatch = timeStr.match(/(\d+):(\d+) (AM|PM)/i);
    if (timeMatch) {
      hours = parseInt(timeMatch[1]);
      minutes = parseInt(timeMatch[2]);
      const period = timeMatch[3].toUpperCase();
            // Convert to 24-hour format
      if (period === 'PM' && hours < 12) {
        hours += 12;
      } else if (period === 'AM' && hours === 12) {
        hours = 0;
      }
    }
        // Create and return date object
    return new Date(year, month - 1, day, hours, minutes);
  }
};

export default ReservationService;