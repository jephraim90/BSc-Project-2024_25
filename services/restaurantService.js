import databaseService from '../services/databaseService';

// Example component or service that uses the database service
const RestaurantService = {
  async addRestaurant(restaurantData) {
    const result = await databaseService.createDocument('restaurants', restaurantData);
    
    if (result.success) {
      console.log(`Restaurant created with ID: ${result.id}`);
      return result;
    } else {
      console.error('Failed to create restaurant:', result.error);
      throw new Error(result.error);
    }
  },
  
  /**
   * Get all restaurants
   */
  async getAllRestaurants() {
    const result = await databaseService.getDocuments('restaurants');
    
    return result.data;
  },
     
  async getFilteredRestaurants(cuisine, minRating, limit = 10) {
    // Build query constraints
    const queryConstraints = [
      databaseService.queries.where('cuisine', '==', cuisine),
      databaseService.queries.where('rating', '>=', minRating),
      databaseService.queries.orderBy('rating', 'desc'),
      databaseService.queries.limit(limit)
    ];
    
    const result = await databaseService.getDocuments('restaurants', queryConstraints);
    return result.data;
  },
    
  async getRestaurantById(id) {
    const result = await databaseService.getDocumentById('restaurants', id);
    
    if (!result.success) {
      console.error('Failed to fetch restaurant:', result.error);
      throw new Error(result.error);
    }
    
    return result.data;
  },
 
  async updateRestaurant(id, updatedData) {
    const result = await databaseService.updateDocument('restaurants', id, updatedData);
    
    if (!result.success) {
      console.error('Failed to update restaurant:', result.error);
      throw new Error(result.error);
    }
    
    return result;
  },

  async deleteRestaurant(id) {
    const result = await databaseService.deleteDocument('restaurants', id);
    
    if (!result.success) {
      console.error('Failed to delete restaurant:', result.error);
      throw new Error(result.error);
    }
    
    return result;
  },
  
  async getRestaurantsByOwnerId(ownerId) {
    try {
      const queryConstraints = [
        databaseService.queries.where('ownerId', '==', ownerId),
        databaseService.queries.orderBy('createdAt', 'asc')
      ];
      const result = await databaseService.getDocuments('restaurants', queryConstraints);
      console.log("The restaurant Object", result);
      return result.data;
    } catch (error) {
      console.error('Error fetching owner restaurants:', error);
      throw new Error('Failed to fetch your restaurants');
    }
  },

  /**
   * Get today's reservations count for all restaurants owned by a user
   * @param {string} ownerId - The owner's user ID
   * @returns {Promise<number>} - The total number of valid reservations
   */
  async getTodaysReservationsCount(ownerId) {
    try {
      // First, get all restaurants owned by this user
      const restaurants = await this.getRestaurantsByOwnerId(ownerId);
      if (!restaurants || restaurants.length === 0) {
        return 0;
      }

      // Get the restaurant IDs
      const restaurantIds = restaurants.map(restaurant => restaurant.id);
      
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];
      
      // For each restaurant, get confirmed reservations for today
      const reservationPromises = restaurantIds.map(async (restaurantId) => {
        const queryConstraints = [
          databaseService.queries.where('restaurantId', '==', restaurantId),
          databaseService.queries.where('date', '==', today),
          databaseService.queries.where('status', '==', 'confirmed')
        ];
        
        const result = await databaseService.getDocuments('reservations', queryConstraints);
        return result.success ? result.data.length : 0;
      });
      
      // Wait for all queries to complete and sum the results
      const reservationCounts = await Promise.all(reservationPromises);
      const totalReservations = reservationCounts.reduce((sum, count) => sum + count, 0);
      
      return totalReservations;
    } catch (error) {
      console.error('Error fetching today\'s reservations count:', error);
      return 0; // Return 0 on error rather than throwing
    }
  },

  /**
   * Get all active reservations for restaurants owned by a user
   * @param {string} ownerId - The owner's user ID
   * @returns {Promise<Array>} - Array of reservation objects
   */
  async getOwnerReservations(ownerId) {
    try {
      // Get all restaurants owned by this user
      const restaurants = await this.getRestaurantsByOwnerId(ownerId);
      if (!restaurants || restaurants.length === 0) {
        return [];
      }

      // Get the restaurant IDs
      const restaurantIds = restaurants.map(restaurant => restaurant.id);
      
      // Get all reservations for these restaurants that are not cancelled
      const allReservationsPromises = restaurantIds.map(async (restaurantId) => {
        const queryConstraints = [
          databaseService.queries.where('restaurantId', '==', restaurantId),
          databaseService.queries.where('status', '==', 'confirmed'),
          databaseService.queries.orderBy('date', 'desc')
        ];
        
        const result = await databaseService.getDocuments('reservations', queryConstraints);
        return result.success ? result.data : [];
      });
      
      // Wait for all queries to complete and combine the results
      const allReservationsArrays = await Promise.all(allReservationsPromises);
      const allReservations = allReservationsArrays.flat();
      
      return allReservations;
    } catch (error) {
      console.error('Error fetching owner reservations:', error);
      throw new Error('Failed to fetch your reservations');
    }
  }
};

export default RestaurantService;