import databaseService from './databaseService';
import { getAuth } from 'firebase/auth';

const REVIEWS_COLLECTION = 'reviews';

const reviewService = {
    async isRestaurantOwner(restaurantId, userId) {
        try {
          const restaurantResult = await databaseService.getDocumentById('restaurants', restaurantId);
          if (restaurantResult.success && restaurantResult.data) {
            return restaurantResult.data.ownerId === userId;
          }
          return false;
        } catch (error) {
          console.log('Error checking restaurant ownership:', error);
          return false;
        }
      },
 
      async createReview(reviewData) {
        try {
          // Validation
          if (!reviewData.restaurantId) {
            throw new Error('Restaurant ID is required');
          }
      
          if (!reviewData.rating || reviewData.rating < 1 || reviewData.rating > 5) {
            throw new Error('Valid rating (1-5) is required');
          }
      
          if (!reviewData.text || reviewData.text.trim().length < 10) {
            throw new Error('Review text must be at least 10 characters');
          }
      
          if (!reviewData.title || reviewData.title.trim().length === 0) {
            throw new Error('Review title is required');
          }
      
          const auth = getAuth();
          const user = auth.currentUser;
          
          if (!user) {
            throw new Error('User not authenticated');
          }
      
          // Check if user is the owner of the restaurant
          const isOwner = await isRestaurantOwner(reviewData.restaurantId, user.uid);
          if (isOwner) {
            throw new Error('Restaurant owners cannot review their own restaurants');
          }
      
          // Check if user has already reviewed this restaurant
          const existingReview = await this.getUserReviewForRestaurant(reviewData.restaurantId);
          
          if (existingReview.data) {
            // Update existing review instead of creating a new one
            return await this.updateReview(existingReview.data.id, {
              rating: reviewData.rating,
              title: reviewData.title,
              text: reviewData.text,
              updatedAt: new Date().toISOString()
            });
          }
      
          // Format review data
          const formattedData = {
            userId: user.uid,
            userDisplayName: user.displayName || 'Anonymous',
            userPhotoURL: user.photoURL || null,
            restaurantId: reviewData.restaurantId,
            rating: parseInt(reviewData.rating),
            title: reviewData.title.trim(),
            text: reviewData.text.trim(),
            status: 'published', // or 'pending' if you want to moderate reviews
            createdAt: new Date().toISOString()
          };
      
          // Create the review in Firestore
          const result = await databaseService.createDocument(REVIEWS_COLLECTION, formattedData);
          
          if (result.success) {
            // Update restaurant rating
            await this.updateRestaurantRating(reviewData.restaurantId);
          }
          
          return result;
        } catch (error) {
          console.log('Error creating review:', error);
          return {
            id: null,
            success: false,
            error: error.message
          };
        }
      },

  
      async updateReview(reviewId, updateData) {
        try {
          if (!reviewId) {
            throw new Error('Review ID is required');
          }
      
          const auth = getAuth();
          const user = auth.currentUser;
          
          if (!user) {
            throw new Error('User not authenticated');
          }
      
          // Get the review to verify ownership
          const reviewResult = await databaseService.getDocumentById(REVIEWS_COLLECTION, reviewId);
          
          if (!reviewResult.success || !reviewResult.data) {
            throw new Error('Review not found');
          }
      
          // Verify the user owns this review
          if (reviewResult.data.userId !== user.uid) {
            throw new Error('You can only update your own reviews');
          }
      
          // Check if user is the owner of the restaurant
          const isOwner = await isRestaurantOwner(reviewResult.data.restaurantId, user.uid);
          if (isOwner) {
            throw new Error('Restaurant owners cannot review their own restaurants');
          }
      
          // Add updated timestamp
          const dataToUpdate = {
            ...updateData,
            updatedAt: new Date().toISOString()
          };
      
          // Update the review
          const result = await databaseService.updateDocument(REVIEWS_COLLECTION, reviewId, dataToUpdate);
          
          if (result.success) {
            // Update restaurant rating
            await this.updateRestaurantRating(reviewResult.data.restaurantId);
          }
          
          return result;
        } catch (error) {
          console.log('Error updating review:', error);
          return {
            success: false,
            error: error.message
          };
        }
      },

 
  async deleteReview(reviewId) {
    try {
      if (!reviewId) {
        throw new Error('Review ID is required');
      }

      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get the review to verify ownership and get restaurantId
      const reviewResult = await databaseService.getDocumentById(REVIEWS_COLLECTION, reviewId);
      
      if (!reviewResult.success || !reviewResult.data) {
        throw new Error('Review not found');
      }

      // Verify the user owns this review or is admin
      if (!(reviewResult.data.userId === user.uid || user.role === 'admin')) {
        throw new Error('You can only delete your own reviews or reviews as an admin');
      }

      const restaurantId = reviewResult.data.restaurantId;

      // Delete the review
      const result = await databaseService.deleteDocument(REVIEWS_COLLECTION, reviewId);
      
      if (result.success) {
        // Update restaurant rating
        await this.updateRestaurantRating(restaurantId);
      }
      
      return result;
    } catch (error) {
      console.log('Error deleting review:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },


  async getRestaurantReviews(restaurantId, limit = 20) {
    try {
      if (!restaurantId) {
        throw new Error('Restaurant ID is required');
      }

      const queryConstraints = [
        databaseService.queries.where('restaurantId', '==', restaurantId),
        databaseService.queries.where('status', '==', 'published'),
        databaseService.queries.orderBy('createdAt', 'desc'),
        databaseService.queries.limit(limit)
      ];

      const result = await databaseService.getDocuments(REVIEWS_COLLECTION, queryConstraints);
      
      return result;
    } catch (error) {
      console.log('Error fetching restaurant reviews:', error);
      return {
        data: [],
        success: false,
        error: error.message
      };
    }
  },

 
  async getUserReviews(limit = 20) {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const queryConstraints = [
        databaseService.queries.where('userId', '==', user.uid),
        databaseService.queries.orderBy('createdAt', 'desc'),
        databaseService.queries.limit(limit)
      ];

      const result = await databaseService.getDocuments(REVIEWS_COLLECTION, queryConstraints);
      
      return result;
    } catch (error) {
      console.log('Error fetching user reviews:', error);
      return {
        data: [],
        success: false,
        error: error.message
      };
    }
  },


  async getUserReviewForRestaurant(restaurantId) {
    try {
      if (!restaurantId) {
        throw new Error('Restaurant ID is required');
      }

      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        return {
          data: null,
          success: false,
          error: 'User not authenticated'
        };
      }

      const queryConstraints = [
        databaseService.queries.where('userId', '==', user.uid),
        databaseService.queries.where('restaurantId', '==', restaurantId)
      ];

      const result = await databaseService.getDocuments(REVIEWS_COLLECTION, queryConstraints);
      
      if (result.success && result.data.length > 0) {
        return {
          data: result.data[0],
          success: true,
          error: null
        };
      } else {
        return {
          data: null,
          success: true,
          error: null
        };
      }
    } catch (error) {
      console.log('Error checking user review for restaurant:', error);
      return {
        data: null,
        success: false,
        error: error.message
      };
    }
  },

  async updateRestaurantRating(restaurantId) {
    try {
      if (!restaurantId) {
        throw new Error('Restaurant ID is required');
      }

      // Get all published reviews for this restaurant
      const reviewsResult = await databaseService.getDocuments(REVIEWS_COLLECTION, [
        databaseService.queries.where('restaurantId', '==', restaurantId),
        databaseService.queries.where('status', '==', 'published')
      ]);

      if (!reviewsResult.success) {
        throw new Error('Failed to fetch restaurant reviews');
      }

      const reviews = reviewsResult.data;
      const reviewCount = reviews.length;
      
      // Calculate average rating
      let totalRating = 0;
      reviews.forEach(review => {
        totalRating += review.rating;
      });
      
      const averageRating = reviewCount > 0 ? totalRating / reviewCount : 0;
      
      // Update restaurant document
      return await databaseService.updateDocument('restaurants', restaurantId, {
        rating: parseFloat(averageRating.toFixed(1)), 
        reviews: reviewCount,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.log('Error updating restaurant rating:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};

export default reviewService;