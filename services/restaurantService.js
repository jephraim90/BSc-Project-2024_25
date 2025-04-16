import databaseService from '../services/databaseService';


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
    try{
        const queryConstraints=[
            databaseService.queries.where('ownerId', '==', ownerId),
            databaseService.queries.orderBy('createdAt', 'asc')
        ];
        const result = await databaseService.getDocuments('restaurants', queryConstraints);
        return result.data;

    }catch(error){
        console.error('Error fetching owner restaurants:', error);
        throw new Error('Failed to fetch your restaurants');
    }

}
};

export default RestaurantService;