import databaseService from './databaseService';

const RestaurantHoursService = {
  /**
   * Update restaurant business hours
   * @param {string} restaurantId - ID of the restaurant
   * @param {object} hoursData - Business hours data
   * @returns {Promise<object>} Result of the operation
   */
  async updateBusinessHours(restaurantId, hoursData) {
    try {
      // Validate input data
      this.validateBusinessHours(hoursData);
      
      // Update the restaurant document
      const result = await databaseService.updateDocument(
        'restaurants', 
        restaurantId, 
        { 
          businessHours: hoursData,
          updatedAt: new Date().toISOString()
        }
      );
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update business hours');
      }
      
      return {
        success: true,
        error: null
      };
    } catch (error) {
      console.error('Error updating business hours:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  /**
   * Get restaurant business hours
   * @param {string} restaurantId - ID of the restaurant
   * @returns {Promise<object>} Business hours data
   */
  async getBusinessHours(restaurantId) {
    try {
      const result = await databaseService.getDocumentById('restaurants', restaurantId);
      
      if (!result.success) {
        throw new Error(result.error || 'Restaurant not found');
      }
      
      return {
        data: result.data.businessHours || this.generateDefaultHours(),
        success: true,
        error: null
      };
    } catch (error) {
      console.error('Error fetching business hours:', error);
      return {
        data: this.generateDefaultHours(),
        success: false,
        error: error.message
      };
    }
  },
  
  /**
   * Add or update special hours for a specific date
   * @param {string} restaurantId - ID of the restaurant
   * @param {object} specialHoursData - Special hours data
   * @returns {Promise<object>} Result of the operation
   */
  async addSpecialHours(restaurantId, specialHoursData) {
    try {
      // Validate special hours data
      this.validateSpecialHours(specialHoursData);
      
      // First get the current restaurant data
      const result = await databaseService.getDocumentById('restaurants', restaurantId);
      
      if (!result.success) {
        throw new Error(result.error || 'Restaurant not found');
      }
      
      const restaurant = result.data;
      
      // Initialize specialHours array if it doesn't exist
      if (!restaurant.specialHours) {
        restaurant.specialHours = [];
      }
      
      // Check if there's already an entry for this date
      const existingIndex = restaurant.specialHours.findIndex(
        item => item.date === specialHoursData.date
      );
      
      if (existingIndex !== -1) {
        // Update existing entry
        restaurant.specialHours[existingIndex] = specialHoursData;
      } else {
        // Add new entry
        restaurant.specialHours.push(specialHoursData);
      }
      
      // Sort by date
      restaurant.specialHours.sort((a, b) => new Date(a.date) - new Date(b.date));
      
      // Remove any past dates (optional)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      restaurant.specialHours = restaurant.specialHours.filter(item => {
        return new Date(item.date) >= today;
      });
      
      // Update the restaurant document
      const updateResult = await databaseService.updateDocument(
        'restaurants', 
        restaurantId, 
        { 
          specialHours: restaurant.specialHours,
          updatedAt: new Date().toISOString()
        }
      );
      
      if (!updateResult.success) {
        throw new Error(updateResult.error || 'Failed to add special hours');
      }
      
      return {
        success: true,
        error: null
      };
    } catch (error) {
      console.error('Error adding special hours:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  /**
   * Delete special hours for a specific date
   * @param {string} restaurantId - ID of the restaurant
   * @param {string} date - Date string (YYYY-MM-DD)
   * @returns {Promise<object>} Result of the operation
   */
  async deleteSpecialHours(restaurantId, date) {
    try {
      // First get the current restaurant data
      const result = await databaseService.getDocumentById('restaurants', restaurantId);
      
      if (!result.success) {
        throw new Error(result.error || 'Restaurant not found');
      }
      
      const restaurant = result.data;
      
      // Check if specialHours exists
      if (!restaurant.specialHours) {
        return {
          success: true,
          error: null
        };
      }
      
      // Filter out the entry for this date
      restaurant.specialHours = restaurant.specialHours.filter(
        item => item.date !== date
      );
      
      // Update the restaurant document
      const updateResult = await databaseService.updateDocument(
        'restaurants', 
        restaurantId, 
        { 
          specialHours: restaurant.specialHours,
          updatedAt: new Date().toISOString()
        }
      );
      
      if (!updateResult.success) {
        throw new Error(updateResult.error || 'Failed to delete special hours');
      }
      
      return {
        success: true,
        error: null
      };
    } catch (error) {
      console.error('Error deleting special hours:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  /**
   * Get all special hours for a restaurant
   * @param {string} restaurantId - ID of the restaurant
   * @returns {Promise<object>} Special hours data
   */
  async getSpecialHours(restaurantId) {
    try {
      const result = await databaseService.getDocumentById('restaurants', restaurantId);
      
      if (!result.success) {
        throw new Error(result.error || 'Restaurant not found');
      }
      
      let specialHours = result.data.specialHours || [];
      
      // Remove past dates
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      specialHours = specialHours.filter(item => {
        return new Date(item.date) >= today;
      });
      
      // Sort by date
      specialHours.sort((a, b) => new Date(a.date) - new Date(b.date));
      
      return {
        data: specialHours,
        success: true,
        error: null
      };
    } catch (error) {
      console.error('Error fetching special hours:', error);
      return {
        data: [],
        success: false,
        error: error.message
      };
    }
  },
  
  /**
   * Check if a restaurant is open at a specific time
   * @param {object} businessHours - Business hours data
   * @param {Array} specialHours - Special hours data
   * @param {Date} date - Date object to check (defaults to current time)
   * @returns {object} Status and hours information
   */
  isOpenAt(businessHours, specialHours = [], date = new Date()) {
    // Format date as YYYY-MM-DD for comparison with special hours
    const dateString = this.formatDateYYYYMMDD(date);
    
    // Check if there are special hours for this date
    const specialDay = specialHours.find(item => item.date === dateString);
    
    if (specialDay) {
      // Restaurant is closed on this special day
      if (!specialDay.isOpen) {
        return {
          isOpen: false,
          status: specialDay.note ? `Closed (${specialDay.note})` : 'Closed',
          opensAt: null,
          closesAt: null,
          note: specialDay.note || null
        };
      }
      
      // Check if current time is within special hours
      return this.checkTimeInRange(
        date, 
        specialDay.opens, 
        specialDay.closes, 
        specialDay.note
      );
    }
    
    // No special hours, use regular business hours
    const dayOfWeek = this.getDayOfWeek(date);
    const dayHours = businessHours?.[dayOfWeek];
    
    if (!dayHours || !dayHours.isOpen) {
      return {
        isOpen: false,
        status: 'Closed today',
        opensAt: null,
        closesAt: null,
        note: null
      };
    }
    
    // Check if current time is within business hours
    return this.checkTimeInRange(
      date, 
      dayHours.opens, 
      dayHours.closes, 
      null
    );
  },
  
  /**
   * Gets the next open time for a restaurant
   * @param {object} businessHours - Business hours data
   * @param {Array} specialHours - Special hours data
   * @param {Date} startDate - Date object to start checking from (defaults to current time)
   * @param {number} maxDaysToCheck - Maximum number of days to look ahead
   * @returns {object|null} Next open time info or null if not found within time range
   */
  getNextOpenTime(businessHours, specialHours = [], startDate = new Date(), maxDaysToCheck = 7) {
    const currentDate = new Date(startDate);
    
    // Check for the next 'maxDaysToCheck' days
    for (let i = 0; i < maxDaysToCheck; i++) {
      const dateString = this.formatDateYYYYMMDD(currentDate);
      const dayOfWeek = this.getDayOfWeek(currentDate);
      
      // Check for special hours first
      const specialDay = specialHours.find(item => item.date === dateString);
      
      if (specialDay) {
        if (specialDay.isOpen) {
          return {
            date: new Date(dateString),
            opensAt: specialDay.opens,
            closesAt: specialDay.closes,
            isSpecialHours: true,
            note: specialDay.note || null
          };
        }
      } 
      // Check regular hours
      else if (businessHours && businessHours[dayOfWeek] && businessHours[dayOfWeek].isOpen) {
        return {
          date: new Date(dateString),
          opensAt: businessHours[dayOfWeek].opens,
          closesAt: businessHours[dayOfWeek].closes,
          isSpecialHours: false,
          note: null
        };
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(0, 0, 0, 0); // Reset to beginning of day
    }
    
    // No open times found within the specified range
    return null;
  },
  
  /**
   * Check if a time is within a range
   * @param {Date} date - Date object to check
   * @param {string} openTime - Opening time (HH:MM)
   * @param {string} closeTime - Closing time (HH:MM)
   * @param {string|null} note - Optional note
   * @returns {object} Status object
   */
  checkTimeInRange(date, openTime, closeTime, note) {
    const [openHour, openMinute] = openTime.split(':').map(Number);
    const [closeHour, closeMinute] = closeTime.split(':').map(Number);
    
    const currentHour = date.getHours();
    const currentMinute = date.getMinutes();
    
    // Convert all times to minutes since midnight for easier comparison
    const currentTimeMinutes = currentHour * 60 + currentMinute;
    const openTimeMinutes = openHour * 60 + openMinute;
    const closeTimeMinutes = closeHour * 60 + closeMinute;
    
    const isOpen = currentTimeMinutes >= openTimeMinutes && currentTimeMinutes < closeTimeMinutes;
    
    // Format times for display
    const opensAt = this.formatTime(openHour, openMinute);
    const closesAt = this.formatTime(closeHour, closeMinute);
    
    if (isOpen) {
      const minutesToClose = closeTimeMinutes - currentTimeMinutes;
      let status;
      
      if (minutesToClose <= 30) {
        status = `Closing soon (in ${minutesToClose} minutes)`;
      } else {
        status = note ? `Open (${note})` : 'Open';
      }
      
      return { 
        isOpen, 
        status, 
        opensAt, 
        closesAt, 
        note,
        minutesToClose
      };
    } else {
      // If we're before opening time today
      if (currentTimeMinutes < openTimeMinutes) {
        const minutesToOpen = openTimeMinutes - currentTimeMinutes;
        const status = `Opening in ${minutesToOpen} minutes`;
        return { 
          isOpen, 
          status, 
          opensAt, 
          closesAt, 
          note,
          minutesToOpen 
        };
      } else {
        // We're after closing time
        const status = 'Closed for today';
        return { 
          isOpen, 
          status, 
          opensAt, 
          closesAt, 
          note 
        };
      }
    }
  },
  
  /**
   * Format a time for display
   * @param {number} hours - Hours
   * @param {number} minutes - Minutes
   * @returns {string} Formatted time
   */
  formatTime(hours, minutes) {
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 === 0 ? 12 : hours % 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  },
  
  /**
   * Convert formatted time string to minutes since midnight
   * @param {string} timeStr - Time string in HH:MM format
   * @returns {number} Minutes since midnight
   */
  timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  },
  
  /**
   * Get day of week from date
   * @param {Date} date - Date object
   * @returns {string} Day of week (lowercase)
   */
  getDayOfWeek(date) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()];
  },
  
  /**
   * Format date as YYYY-MM-DD
   * @param {Date} date - Date object
   * @returns {string} Formatted date
   */
  formatDateYYYYMMDD(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  },
  
  /**
   * Generate default business hours
   * @returns {object} Default hours
   */
  generateDefaultHours() {
    return {
      monday: { isOpen: true, opens: '09:00', closes: '22:00' },
      tuesday: { isOpen: true, opens: '09:00', closes: '22:00' },
      wednesday: { isOpen: true, opens: '09:00', closes: '22:00' },
      thursday: { isOpen: true, opens: '09:00', closes: '22:00' },
      friday: { isOpen: true, opens: '09:00', closes: '22:00' },
      saturday: { isOpen: true, opens: '10:00', closes: '23:00' },
      sunday: { isOpen: true, opens: '10:00', closes: '22:00' }
    };
  },
  
  /**
   * Validate business hours data
   * @param {object} hoursData - Business hours data
   * @throws {Error} If validation fails
   */
  validateBusinessHours(hoursData) {
    const requiredDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    for (const day of requiredDays) {
      if (!hoursData[day]) {
        throw new Error(`Missing hours for ${day}`);
      }
      
      if (typeof hoursData[day].isOpen !== 'boolean') {
        throw new Error(`isOpen for ${day} must be a boolean`);
      }
      
      if (hoursData[day].isOpen) {
        if (!hoursData[day].opens || !hoursData[day].closes) {
          throw new Error(`Missing opening or closing time for ${day}`);
        }
        
        if (!this.isValidTimeFormat(hoursData[day].opens) || !this.isValidTimeFormat(hoursData[day].closes)) {
          throw new Error(`Invalid time format for ${day}. Use HH:MM format.`);
        }
        
        // Check that closing time is after opening time
        const openMinutes = this.timeToMinutes(hoursData[day].opens);
        const closeMinutes = this.timeToMinutes(hoursData[day].closes);
        
        if (closeMinutes <= openMinutes) {
          throw new Error(`Closing time must be after opening time for ${day}`);
        }
      }
    }
  },
  
  /**
   * Validate special hours data
   * @param {object} specialHoursData - Special hours data
   * @throws {Error} If validation fails
   */
  validateSpecialHours(specialHoursData) {
    if (!specialHoursData.date || !this.isValidDateFormat(specialHoursData.date)) {
      throw new Error('Invalid date format. Use YYYY-MM-DD format.');
    }
    
    if (typeof specialHoursData.isOpen !== 'boolean') {
      throw new Error('isOpen must be a boolean');
    }
    
    if (specialHoursData.isOpen) {
      if (!specialHoursData.opens || !specialHoursData.closes) {
        throw new Error('Missing opening or closing time');
      }
      
      if (!this.isValidTimeFormat(specialHoursData.opens) || !this.isValidTimeFormat(specialHoursData.closes)) {
        throw new Error('Invalid time format. Use HH:MM format.');
      }
      
      // Check that closing time is after opening time
      const openMinutes = this.timeToMinutes(specialHoursData.opens);
      const closeMinutes = this.timeToMinutes(specialHoursData.closes);
      
      if (closeMinutes <= openMinutes) {
        throw new Error('Closing time must be after opening time');
      }
    }
    
    // Note is optional, but if provided should be a string
    if (specialHoursData.note !== undefined && specialHoursData.note !== null && typeof specialHoursData.note !== 'string') {
      throw new Error('Note must be a string');
    }
  },
  
  /**
   * Check if a string is a valid time format (HH:MM)
   * @param {string} timeStr - Time string
   * @returns {boolean} True if valid
   */
  isValidTimeFormat(timeStr) {
    return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(timeStr);
  },
  
  /**
   * Check if a string is a valid date format (YYYY-MM-DD)
   * @param {string} dateStr - Date string
   * @returns {boolean} True if valid
   */
  isValidDateFormat(dateStr) {
    return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
  }
};

export default RestaurantHoursService;