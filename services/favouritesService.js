import databaseService from './databaseService';
import { getAuth } from 'firebase/auth';

const FAVORITES_COLLECTION = 'favorites';

const favouritesService = {
    async addFavorite(restaurantId) {
    try {
      // Validation
      if (!restaurantId) {
        throw new Error('Restaurant ID is required');
      }

      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Check if already favorited
      const existingFavorite = await this.checkIsFavorite(restaurantId);
      if (existingFavorite.isFavorite) {
        return {
          success: true,
          error: null,
          id: existingFavorite.favoriteId
        };
      }

      // Add to favorites collection
      const favoriteData = {
        userId: user.uid,
        restaurantId: restaurantId
      };

      const result = await databaseService.createDocument(FAVORITES_COLLECTION, favoriteData);
      
      return result;
    } catch (error) {
      console.log('Error adding favorite:', error);
      return {
        id: null,
        success: false,
        error: error.message
      };
    }
  },

 
  async removeFavorite(restaurantId) {
    try {
      // Validation
      if (!restaurantId) {
        throw new Error('Restaurant ID is required');
      }

      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Find the favorite document
      const favoriteCheck = await this.checkIsFavorite(restaurantId);
      if (!favoriteCheck.isFavorite) {
        return {
          success: true,
          error: null
        };
      }

      // Delete the favorite document
      const result = await databaseService.deleteDocument(FAVORITES_COLLECTION, favoriteCheck.favoriteId);
      
      return result;
    } catch (error) {
      console.log('Error removing favorite:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

   async toggleFavorite(restaurantId) {
    try {
      const favoriteCheck = await this.checkIsFavorite(restaurantId);
      
      if (favoriteCheck.isFavorite) {
        const result = await this.removeFavorite(restaurantId);
        return {
          ...result,
          isFavorite: false
        };
      } else {
        const result = await this.addFavorite(restaurantId);
        return {
          ...result,
          isFavorite: true
        };
      }
    } catch (error) {
      console.log('Error toggling favorite:', error);
      return {
        success: false,
        error: error.message,
        isFavorite: false
      };
    }
  },

  async checkIsFavorite(restaurantId) {
    try {
      if (!restaurantId) {
        throw new Error('Restaurant ID is required');
      }
      
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        return {
          isFavorite: false,
          favoriteId: null,
          error: 'User not authenticated'
        };
      }

      const queryConstraints = [
        databaseService.queries.where('userId', '==', user.uid),
        databaseService.queries.where('restaurantId', '==', restaurantId)
      ];

      const result = await databaseService.getDocuments(FAVORITES_COLLECTION, queryConstraints);
      
      if (result.success && result.data.length > 0) {
        // Restaurant is favorited
        const favoriteDoc = result.data[0];
        return {
          isFavorite: true,
          favoriteId: favoriteDoc.id,
          error: null
        };
      }

      // Restaurant is not favorited
      return {
        isFavorite: false,
        favoriteId: null,
        error: null
      };
    } catch (error) {
      console.log('Error checking favorite status:', error);
      return {
        isFavorite: false,
        favoriteId: null,
        error: error.message
      };
    }
  },

  async getUserFavorites() {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        return {
          data: [],
          success: false,
          error: 'User not authenticated'
        };
      }

      const queryConstraints = [
        databaseService.queries.where('userId', '==', user.uid)
      ];

      const result = await databaseService.getDocuments(FAVORITES_COLLECTION, queryConstraints);
      
      return result;
    } catch (error) {
      console.log('Error getting user favorites:', error);
      return {
        data: [],
        success: false,
        error: error.message
      };
    }
  }
};

export default favouritesService;