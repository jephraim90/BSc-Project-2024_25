// services/restaurantMenuService.js
import databaseService from "./databaseService";

const RestaurantMenuService = {
  /**
   * Add a new menu section to a restaurant
   * @param {string} restaurantId - ID of the restaurant
   * @param {object} sectionData - Menu section data to add
   * @returns {Promise<object>} Result of the operation
   */
  async addMenuSection(restaurantId, sectionData) {
    try {
      // First get the current restaurant data
      const result = await databaseService.getDocumentById(
        "restaurants",
        restaurantId
      );

      if (!result.success) {
        throw new Error(result.error || "Restaurant not found");
      }

      const restaurant = result.data;

      // Initialize menuSections array if it doesn't exist
      if (!restaurant.menuSections) {
        restaurant.menuSections = [];
      }

      // Add the new section
      restaurant.menuSections.push(sectionData);

      // Update the restaurant document
      const updateResult = await databaseService.updateDocument(
        "restaurants",
        restaurantId,
        { menuSections: restaurant.menuSections }
      );

      if (!updateResult.success) {
        throw new Error(updateResult.error || "Failed to add menu section");
      }

      return {
        success: true,
        sectionIndex: restaurant.menuSections.length - 1,
        error: null,
      };
    } catch (error) {
      console.log("Error adding menu section:", error);
      return {
        success: false,
        sectionIndex: -1,
        error: error.message,
      };
    }
  },

  /**
   * Update an existing menu section
   * @param {string} restaurantId - ID of the restaurant
   * @param {number} sectionIndex - Index of the section to update
   * @param {object} sectionData - Updated section data
   * @returns {Promise<object>} Result of the operation
   */
  async updateMenuSection(restaurantId, sectionIndex, sectionData) {
    try {
      // First get the current restaurant data
      const result = await databaseService.getDocumentById(
        "restaurants",
        restaurantId
      );

      if (!result.success) {
        throw new Error(result.error || "Restaurant not found");
      }

      const restaurant = result.data;

      // Check if menuSections array exists and has the specified index
      if (!restaurant.menuSections || !restaurant.menuSections[sectionIndex]) {
        throw new Error("Menu section not found");
      }

      // Update the section
      restaurant.menuSections[sectionIndex] = sectionData;

      // Update the restaurant document
      const updateResult = await databaseService.updateDocument(
        "restaurants",
        restaurantId,
        { menuSections: restaurant.menuSections }
      );

      if (!updateResult.success) {
        throw new Error(updateResult.error || "Failed to update menu section");
      }

      return {
        success: true,
        error: null,
      };
    } catch (error) {
      console.log("Error updating menu section:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Delete a menu section
   * @param {string} restaurantId - ID of the restaurant
   * @param {number} sectionIndex - Index of the section to delete
   * @returns {Promise<object>} Result of the operation
   */
  async deleteMenuSection(restaurantId, sectionIndex) {
    try {
      // First get the current restaurant data
      const result = await databaseService.getDocumentById(
        "restaurants",
        restaurantId
      );

      if (!result.success) {
        throw new Error(result.error || "Restaurant not found");
      }

      const restaurant = result.data;

      // Check if menuSections array exists and has the specified index
      if (!restaurant.menuSections || !restaurant.menuSections[sectionIndex]) {
        throw new Error("Menu section not found");
      }

      // Remove the section
      restaurant.menuSections.splice(sectionIndex, 1);

      // Update the restaurant document
      const updateResult = await databaseService.updateDocument(
        "restaurants",
        restaurantId,
        { menuSections: restaurant.menuSections }
      );

      if (!updateResult.success) {
        throw new Error(updateResult.error || "Failed to delete menu section");
      }

      return {
        success: true,
        error: null,
      };
    } catch (error) {
      console.log("Error deleting menu section:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  },


  async addMenuItem(restaurantId, sectionIndex, itemData) {
    try {
      // First get the current restaurant data
      const result = await databaseService.getDocumentById(
        "restaurants",
        restaurantId
      );

      if (!result.success) {
        throw new Error(result.error || "Restaurant not found");
      }

      const restaurant = result.data;

      // Check if menuSections array exists and has the specified index
      if (!restaurant.menuSections || !restaurant.menuSections[sectionIndex]) {
        throw new Error("Menu section not found");
      }

      // Initialize items array if it doesn't exist
      if (!restaurant.menuSections[sectionIndex].items) {
        restaurant.menuSections[sectionIndex].items = [];
      }

      // Add the new item
      restaurant.menuSections[sectionIndex].items.push(itemData);

      // Update the restaurant document
      const updateResult = await databaseService.updateDocument(
        "restaurants",
        restaurantId,
        { menuSections: restaurant.menuSections }
      );

      if (!updateResult.success) {
        throw new Error(updateResult.error || "Failed to add menu item");
      }

      return {
        success: true,
        itemIndex: restaurant.menuSections[sectionIndex].items.length - 1,
        error: null,
      };
    } catch (error) {
      console.log("Error adding menu item:", error);
      return {
        success: false,
        itemIndex: -1,
        error: error.message,
      };
    }
  },


  async updateMenuItem(restaurantId, sectionIndex, itemIndex, itemData) {
    try {
      // First get the current restaurant data
      const result = await databaseService.getDocumentById(
        "restaurants",
        restaurantId
      );

      if (!result.success) {
        throw new Error(result.error || "Restaurant not found");
      }

      const restaurant = result.data;

      // Check if menuSections array exists and has the specified section and item
      if (
        !restaurant.menuSections ||
        !restaurant.menuSections[sectionIndex] ||
        !restaurant.menuSections[sectionIndex].items ||
        !restaurant.menuSections[sectionIndex].items[itemIndex]
      ) {
        throw new Error("Menu item not found");
      }

      // Update the item
      restaurant.menuSections[sectionIndex].items[itemIndex] = itemData;

      // Update the restaurant document
      const updateResult = await databaseService.updateDocument(
        "restaurants",
        restaurantId,
        { menuSections: restaurant.menuSections }
      );

      if (!updateResult.success) {
        throw new Error(updateResult.error || "Failed to update menu item");
      }

      return {
        success: true,
        error: null,
      };
    } catch (error) {
      console.log("Error updating menu item:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  async deleteMenuItem(restaurantId, sectionIndex, itemIndex) {
    try {
      // First get the current restaurant data
      const result = await databaseService.getDocumentById(
        "restaurants",
        restaurantId
      );

      if (!result.success) {
        throw new Error(result.error || "Restaurant not found");
      }

      const restaurant = result.data;

      // Check if menuSections array exists and has the specified section and item
      if (
        !restaurant.menuSections ||
        !restaurant.menuSections[sectionIndex] ||
        !restaurant.menuSections[sectionIndex].items ||
        !restaurant.menuSections[sectionIndex].items[itemIndex]
      ) {
        throw new Error("Menu item not found");
      }

      // Remove the item
      restaurant.menuSections[sectionIndex].items.splice(itemIndex, 1);

      // Update the restaurant document
      const updateResult = await databaseService.updateDocument(
        "restaurants",
        restaurantId,
        { menuSections: restaurant.menuSections }
      );

      if (!updateResult.success) {
        throw new Error(updateResult.error || "Failed to delete menu item");
      }

      return {
        success: true,
        error: null,
      };
    } catch (error) {
      console.log("Error deleting menu item:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  async reorderMenuSections(restaurantId, newOrder) {
    try {
      // First get the current restaurant data
      const result = await databaseService.getDocumentById(
        "restaurants",
        restaurantId
      );

      if (!result.success) {
        throw new Error(result.error || "Restaurant not found");
      }

      const restaurant = result.data;

      if (!restaurant.menuSections) {
        throw new Error("No menu sections found");
      }

      // Create a new array in the specified order
      const reorderedSections = newOrder.map((index) => {
        if (index < 0 || index >= restaurant.menuSections.length) {
          throw new Error("Invalid section index in reorder operation");
        }
        return restaurant.menuSections[index];
      });

      // Update the restaurant document
      const updateResult = await databaseService.updateDocument(
        "restaurants",
        restaurantId,
        { menuSections: reorderedSections }
      );

      if (!updateResult.success) {
        throw new Error(
          updateResult.error || "Failed to reorder menu sections"
        );
      }

      return {
        success: true,
        error: null,
      };
    } catch (error) {
      console.log("Error reordering menu sections:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Reorder menu items within a section
   * @param {string} restaurantId - ID of the restaurant
   * @param {number} sectionIndex - Index of the section
   * @param {Array<number>} newOrder - Array of item indices in the new order
   * @returns {Promise<object>} Result of the operation
   */
  async reorderMenuItems(restaurantId, sectionIndex, newOrder) {
    try {
      // First get the current restaurant data
      const result = await databaseService.getDocumentById(
        "restaurants",
        restaurantId
      );

      if (!result.success) {
        throw new Error(result.error || "Restaurant not found");
      }

      const restaurant = result.data;

      if (
        !restaurant.menuSections ||
        !restaurant.menuSections[sectionIndex] ||
        !restaurant.menuSections[sectionIndex].items
      ) {
        throw new Error("Menu section or items not found");
      }

      const items = restaurant.menuSections[sectionIndex].items;

      // Create a new array in the specified order
      const reorderedItems = newOrder.map((index) => {
        if (index < 0 || index >= items.length) {
          throw new Error("Invalid item index in reorder operation");
        }
        return items[index];
      });

      // Update the section's items
      restaurant.menuSections[sectionIndex].items = reorderedItems;

      // Update the restaurant document
      const updateResult = await databaseService.updateDocument(
        "restaurants",
        restaurantId,
        { menuSections: restaurant.menuSections }
      );

      if (!updateResult.success) {
        throw new Error(updateResult.error || "Failed to reorder menu items");
      }

      return {
        success: true,
        error: null,
      };
    } catch (error) {
      console.log("Error reordering menu items:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

export default RestaurantMenuService;
