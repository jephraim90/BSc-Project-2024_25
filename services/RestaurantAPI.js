import databaseService from './databaseService';
import { serverTimestamp } from 'firebase/firestore';
import { Platform, Alert } from 'react-native';

const RestaurantAPI = {
 
  async createReservation(reservationData) {
    try {
      // Validate required fields
      if (!reservationData.userId || !reservationData.restaurantId || 
          !reservationData.date || !reservationData.time || !reservationData.guests) {
        throw new Error('Missing required reservation fields');
      }
      
      // Format data and add timestamps
      const formattedData = {
        ...reservationData,
        status: 'confirmed',
        createdAt: new Date().toISOString(),
        guests: parseInt(reservationData.guests)
      };
      
      // Create document in Firestore
      const result = await databaseService.createDocument('reservations', formattedData);
      return result;
    } catch (error) {
      console.log('Error creating reservation:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  /**
   * Cancel a reservation
   * @param {string} reservationId - ID of the reservation to cancel
   * @returns {Promise<Object>} Result of cancellation
   */
  async cancelReservation(reservationId) {
    try {
      // Check if reservation exists
      const reservation = await databaseService.getDocumentById('reservations', reservationId);
      
      if (!reservation.success) {
        throw new Error('Reservation not found');
      }
      
      // Check cancellation policy (e.g., time restrictions)
      const reservationDate = new Date(reservation.data.date);
      const now = new Date();
      const hoursDifference = (reservationDate - now) / (1000 * 60 * 60);
      
      if (hoursDifference < 2) {
        console.warn('Cancellation within 2 hours of reservation');
        // You could implement late cancellation fees here
      }
      
      // Update reservation status
      const result = await databaseService.updateDocument('reservations', reservationId, {
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
      });
      
      // Update restaurant capacity if the reservation was for today
      if (result.success) {
        const today = new Date().toISOString().split('T')[0];
        if (reservation.data.date === today) {
          await this.updateRestaurantCapacity(reservation.data.restaurantId);
        }
      }
      
      return result;
    } catch (error) {
      console.log('Error cancelling reservation:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  /**
   * Modify an existing reservation
   * @param {string} reservationId - ID of the reservation to modify
   * @param {Object} updatedData - New reservation details
   * @returns {Promise<Object>} Result of modification
   */
  async modifyReservation(reservationId, updatedData) {
    try {
      // Check if reservation exists
      const reservation = await databaseService.getDocumentById('reservations', reservationId);
      
      if (!reservation.success) {
        throw new Error('Reservation not found');
      }
      
      // Prevent modifying certain fields
      const safeUpdate = {...updatedData};
      delete safeUpdate.userId;
      delete safeUpdate.restaurantId;
      delete safeUpdate.createdAt;
      
      // Add modification timestamp
      safeUpdate.updatedAt = new Date().toISOString();
      
      // Update the reservation
      const result = await databaseService.updateDocument('reservations', reservationId, safeUpdate);
      
      return result;
    } catch (error) {
      console.log('Error modifying reservation:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  /**
   * Get all reservations for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Reservations grouped by upcoming and past
   */
  async getUserReservations(userId) {
    try {
      const queryConstraints = [
        databaseService.queries.where('userId', '==', userId),
        databaseService.queries.orderBy('date', 'desc')
      ];
      
      const result = await databaseService.getDocuments('reservations', queryConstraints);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch reservations');
      }
      
      // Process and categorize reservations
      const now = new Date();
      const upcoming = [];
      const past = [];
      
      result.data.forEach(reservation => {
        const reservationDate = new Date(reservation.date);
        if (reservationDate >= now || reservation.status === 'confirmed' || reservation.status === 'pending') {
          upcoming.push(reservation);
        } else {
          past.push(reservation);
        }
      });
      
      return {
        success: true,
        data: {
          upcoming,
          past
        }
      };
    } catch (error) {
      console.log('Error fetching user reservations:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  

  async checkAvailability(restaurantId, date, partySize) {
    try {
      console.log(`Checking availability for restaurant ID: ${restaurantId}, date: ${date}, party size: ${partySize}`);
  
      const restaurantResult = await databaseService.getDocumentById('restaurants', restaurantId);
      console.log("Restaurant lookup result:", restaurantResult);
  
      if (!restaurantResult.success || !restaurantResult.data) {
        console.log(`Restaurant not found for ID: ${restaurantId}`);
        return { success: false, error: 'Restaurant not found', data: [] };
      }
  
      const restaurant = restaurantResult.data;
      const { businessHours, capacity = 50 } = restaurant;
      const dayOfWeek = new Date(date).getDay();
      const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]; // Correct order
      const dayName = days[dayOfWeek]; // Get the day name
      const dailyHours = businessHours ? businessHours[dayName] : null;
  
      console.log("Business hours:", businessHours);
      console.log("Day of Week:", dayOfWeek, `(${dayName})`); 
      console.log("Daily Hours:", dailyHours);
  
      if (!dailyHours || !dailyHours.open || !dailyHours.close) {
        return { success: false, error: 'Business hours not available for this day', data: [] };
      }
  
      const openTime = dailyHours.open;
      const closeTime = dailyHours.close;
  
      if (typeof openTime !== 'string' || typeof closeTime !== 'string') {
        console.log(`Invalid time format in businessHours. Open: ${openTime}, Close: ${closeTime}`);
        return { success: false, error: 'Invalid time format in business hours', data: [] };
      }
  
      const timeSlots = generateTimeSlots(openTime, closeTime);
  
      if (!timeSlots || timeSlots.length === 0) {
        console.log("No time slots generated or invalid time format");
        return { success: false, error: "No available time slots", data: [] };
      }
  
      const existingReservationsResult = await databaseService.getDocuments('reservations', [
        databaseService.queries.where('restaurantId', '==', restaurantId),
        databaseService.queries.where('date', '==', date),
        databaseService.queries.where('status', '==', 'confirmed')
      ]);
  
      if (!existingReservationsResult.success) throw new Error('Failed to fetch existing reservations');
      const existingReservations = existingReservationsResult.data;
  
      const slotCapacity = timeSlots.reduce((acc, time) => {
        acc[time] = { available: capacity, nextAvailableTime: null };
        return acc;
      }, {});
  
      existingReservations.forEach(reservation => {
        const time = reservation.time;
        const guestCount = reservation.guests || 0;
        if (slotCapacity[time]) slotCapacity[time].available -= guestCount;
      });
  
      const availableTimes = timeSlots.filter(time => slotCapacity[time].available >= partySize);
      let nextAvailableTime = null;
      if (availableTimes.length === 0 && timeSlots.length > 0) {
        const remainingSlots = timeSlots.slice(timeSlots.indexOf(timeSlots[0]) + 1);
        nextAvailableTime = remainingSlots.find(slot => slotCapacity[slot] && slotCapacity[slot].available >= partySize);
      }
  
      return {
        success: true,
        data: availableTimes,
        nextAvailableTime,
        isRestaurantFull: availableTimes.length === 0
      };
    } catch (error) {
      console.log('Error checking availability:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  },

  
  async getRestaurantMenu(restaurantId, category = null) {
    try {
      // Get the restaurant document
      const restaurantResult = await databaseService.getDocumentById('restaurants', restaurantId);
      
      if (!restaurantResult.success) {
        throw new Error(restaurantResult.error || 'Failed to fetch restaurant');
      }
      
      const restaurant = restaurantResult.data;
      
      // Check if restaurant has menuSections
      if (!restaurant.menuSections || !Array.isArray(restaurant.menuSections)) {
        return {
          success: true,
          data: {} // Return empty object if no menu sections
        };
      }
      
      // Transform menuSections to the expected format
      const groupedMenu = {};
      
      restaurant.menuSections.forEach(section => {
        // Skip if no items or not matching the category filter
        if (!section.items || !Array.isArray(section.items) || 
            (category && section.name !== category)) {
          return;
        }
        
        // Add all items to the grouped menu by category
        if (!category || section.name === category) {
          groupedMenu[section.name] = section.items.map((item, index) => ({
            ...item,
            id: item.id || `${section.name.toLowerCase()}_${index}`, // Generate an ID if not present
            category: section.name, // Add the category to each item
            restaurantId // Add the restaurantId to each item
          }));
        }
      });
      
      return {
        success: true,
        data: groupedMenu
      };
    } catch (error) {
      console.log('Error fetching restaurant menu:', error);
      return {
        success: false,
        error: error.message,
        data: {}
      };
    }
  },
  

  async getSeatingAvailability(restaurantId, date, time, partySize) {
    try {
      // Get restaurant details
      const restaurant = await databaseService.getDocumentById('restaurants', restaurantId);
      
      if (!restaurant.success) {
        throw new Error('Restaurant not found');
      }
      
      // Get existing reservations for this date/time/restaurant
      const existingReservations = await databaseService.getDocuments('reservations', [
        databaseService.queries.where('restaurantId', '==', restaurantId),
        databaseService.queries.where('date', '==', date),
        databaseService.queries.where('time', '==', time),
        databaseService.queries.where('status', '==', 'confirmed')
      ]);
      
      // Since your restaurant model doesn't have a tables collection,
      // we'll generate mock tables based on restaurant capacity
      const restaurantCapacity = restaurant.data.capacity || 50;
      const totalTables = Math.floor(restaurantCapacity / 4); // Assume average 4 people per table
      
      // Generate mock tables with different sections
      const mockTables = generateMockTables(restaurantId, totalTables);
      
      // Find occupied table IDs
      const occupiedTableIds = existingReservations.data
        .flatMap(reservation => reservation.tableIds || []);
      
      // Filter available tables based on party size and occupancy
      const availableTables = mockTables.filter(table => {
        return !occupiedTableIds.includes(table.id) && 
               table.minCapacity <= partySize && 
               table.maxCapacity >= partySize;
      });
      
      // Group tables by area/section
      const tablesBySection = availableTables.reduce((acc, table) => {
        if (!acc[table.section]) {
          acc[table.section] = [];
        }
        acc[table.section].push(table);
        return acc;
      }, {});
      
      return {
        success: true,
        data: {
          availableTables,
          tablesBySection
        }
      };
    } catch (error) {
      console.log('Error fetching seating availability:', error);
      return {
        success: false,
        error: error.message,
        data: {
          availableTables: [],
          tablesBySection: {}
        }
      };
    }
  },
  
  
  async getRestaurantStatus(restaurantId) {
    try {
      const restaurant = await databaseService.getDocumentById('restaurants', restaurantId);
      console.log("Your restaurant data is ", restaurant.data)
      
      if (!restaurant.success) {
        throw new Error('Restaurant not found');
      }
      
      // Get current reservations and status
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      
         const estimatedWaitTime = Math.floor(Math.random() * 45) + 15; // 15-60 min
      
      return {
        success: true,
        data: {
          isOpen: restaurant.data.isOpen || true,
          currentCapacity: restaurant.data.currentCapacity || 75, // percentage
          estimatedWaitTime,
          specialNotes: restaurant.data.specialNotes || null
        }
        
      };
    } catch (error) {
      console.log('Error fetching restaurant status:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }

  },
  

  async createDetailedReservation(reservationData) {
    try {
      // Validate required fields
      if (!reservationData.userId || !reservationData.restaurantId || 
          !reservationData.date || !reservationData.time || !reservationData.guests) {
        throw new Error('Missing required reservation fields');
      }
      
      // Check if there's enough capacity for this reservation
      const availabilityCheck = await this.checkAvailability(
        reservationData.restaurantId,
        reservationData.date,
        reservationData.guests
      );
      
      if (!availabilityCheck.success) {
        showPlatformAlert(
          "Error",
          "Failed to check restaurant availability",
          Platform.OS === "web" 
            ? [] // Web will use native alert with implicit OK
            : [{ text: "OK", onPress: () => {} }] // Mobile explicit OK
        );
        throw new Error('Failed to check restaurant availability');
      }
      
      if (!availabilityCheck.data.includes(reservationData.time)) {
        if (availabilityCheck.isRestaurantFull) {
          if (availabilityCheck.nextAvailableTime) {
            throw new Error(`Restaurant is fully booked at this time. Next available time: ${availabilityCheck.nextAvailableTime}`);
          } else {
            throw new Error('Restaurant is fully booked for this date. Please try another date.');
          }
        } else {
          throw new Error(`Selected time is no longer available. Available times: ${availabilityCheck.data.join(', ')}`);
        }
      }
      
      // Create a copy of the data for modification
      const formattedData = { ...reservationData };
      
      // Fix the menuSelections array - ensure each item has an id
      if (formattedData.menuSelections && Array.isArray(formattedData.menuSelections)) {
        formattedData.menuSelections = formattedData.menuSelections.map((item, index) => {
          // If the item doesn't have an id, generate one
          if (!item.id) {
            return {
              ...item,
              id: `menu_item_${index}_${Date.now()}` // Generate a temporary id
            };
          }
          return item;
        });
      }
      
      // Set remaining required fields
      formattedData.status = 'confirmed';
      formattedData.createdAt = new Date().toISOString();
      formattedData.guests = parseInt(reservationData.guests);
      
      // Create document in Firestore
      const result = await databaseService.createDocument('reservations', formattedData);
      
      // Update restaurant current capacity if reservation was created successfully
      if (result.success) {
        await this.updateRestaurantCapacity(reservationData.restaurantId);
      }
      
      return result;
    } catch (error) {
      console.log('Error creating detailed reservation:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
 
  async updateRestaurantCapacity(restaurantId) {
    try {
      // Get restaurant data
      const restaurantResult = await databaseService.getDocumentById('restaurants', restaurantId);
      if (!restaurantResult.success) {
        throw new Error('Restaurant not found');
      }
      
      const restaurant = restaurantResult.data;
      const totalCapacity = restaurant.capacity || 50;
      
      // Get today's active reservations
      const today = new Date().toISOString().split('T')[0];
      const activeReservations = await databaseService.getDocuments('reservations', [
        databaseService.queries.where('restaurantId', '==', restaurantId),
        databaseService.queries.where('date', '==', today),
        databaseService.queries.where('status', '==', 'confirmed')
      ]);
      
      if (!activeReservations.success) {
        throw new Error('Failed to fetch active reservations');
      }
      
      // Calculate total guests
      const totalGuests = activeReservations.data.reduce((sum, reservation) => {
        return sum + (reservation.guests || 0);
      }, 0);
      
      // Calculate current capacity percentage
      const capacityPercentage = Math.min(100, Math.round((totalGuests / totalCapacity) * 100));
      
      // Update restaurant with new capacity
      await databaseService.updateDocument('restaurants', restaurantId, {
        currentCapacity: capacityPercentage,
        updatedAt: new Date().toISOString()
      });
      
      return {
        success: true,
        currentCapacity: capacityPercentage
      };
    } catch (error) {
      console.log('Error updating restaurant capacity:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
};
const showPlatformAlert = (title, message, buttons = [], options = {}) => {
  if (Platform.OS === "web") {
    if (buttons.length === 0) {
      // Default to simple alert with OK button
      window.alert(`${title}\n\n${message}`);
      return;
    }

    // Handle confirm dialog with custom buttons
    const confirmation = window.confirm(
      `${title}\n\n${message}\n\n` +
      buttons.map(b => b.text).join(' / ')
    );

    // Execute corresponding button handler
    confirmation ? buttons[1]?.onPress?.() : buttons[0]?.onPress?.();
  } else {
    // Mobile: Use native alert with default OK button if no buttons provided
    Alert.alert(
      title,
      message,
      buttons.length > 0 ? buttons : undefined,
      options
    );
  }
};

function parseTimeString(timeStr) {
  const today = new Date();
  const date = new Date(today.toDateString());

  const timeParts = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!timeParts) {
    console.log(`Error parsing time string: ${timeStr}`);
    return null; // Crucially, return null
  }

  let hours = parseInt(timeParts[1]);
  const minutes = parseInt(timeParts[2]);
  const period = timeParts[3].toUpperCase();

  if (period === 'PM' && hours < 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }

  date.setHours(hours, minutes, 0, 0);
  return date;
}

function generateTimeSlots(openTime, closeTime) {
  const timeSlots = [];
  const open = parseTimeString(openTime);
  const close = parseTimeString(closeTime);

  if (!open || !close) {
    console.log("Invalid open or close time format.");
    return []; // Return an empty array
  }

  let current = new Date(open);
  while (current < close) {
    timeSlots.push(formatTime(current));
    current.setMinutes(current.getMinutes() + 30);
  }

  return timeSlots;
}
/**
 * Format Date object to time string (e.g., "9:00 AM")
 */
function formatTime(date) {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? 'PM' : 'AM';
  
  hours = hours % 12;
  hours = hours ? hours : 12; // Convert 0 to 12 for 12 AM
  
  return `${hours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

function generateMockTables(restaurantId, totalTables) {
  const sections = ['window', 'main', 'bar'];
  const tables = [];
  
  for (let i = 1; i <= totalTables; i++) {
    const section = sections[i % sections.length];
    const tableSize = (i % 3) + 2; // Tables of size 2, 3, or 4
    
    tables.push({
      id: `table_${restaurantId}_${i}`,
      restaurantId,
      number: `T${i}`,
      section,
      minCapacity: Math.max(1, tableSize - 1),
      maxCapacity: tableSize + 1,
      isActive: true,
      tableType: i % 5 === 0 ? 'booth' : 'regular',
      position: {
        x: (i * 10) % 100,
        y: Math.floor(i / 10) * 10
      }
    });
  }
  
  return tables;
}

export default RestaurantAPI;