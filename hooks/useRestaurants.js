import { useState, useEffect } from 'react';
import RestaurantService from '@/services/restaurantService';

/**
 * Custom hook for fetching and filtering restaurant data
 */
const useRestaurants = () => {
  // State for all restaurant data
  const [allRestaurants, setAllRestaurants] = useState([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState([]);
  const [topRatedRestaurants, setTopRatedRestaurants] = useState([]);
  const [newRestaurants, setNewRestaurants] = useState([]);
  const [availableRestaurants, setAvailableRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    cuisine: null,
    priceRange: null,
    rating: null,
    searchQuery: '',
    openNow: false,
  });

  // Fetch all restaurants on component mount
  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        setLoading(true);
        
        // Get all restaurants
        const result = await RestaurantService.getAllRestaurants();
        
        if (result) {
          setAllRestaurants(result);
          setFilteredRestaurants(result);
          
          // Process restaurant data for different sections
          processRestaurantData(result);
        }
      } catch (err) {
        console.log("Error fetching restaurants:", err);
        setError(err.message || 'Failed to load restaurants');
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurants();
  }, []);

  // Process restaurant data for different sections
  const processRestaurantData = (restaurants) => {
    // Get top rated restaurants (rating >= 4.5)
    const topRated = restaurants
      .filter(restaurant => restaurant.rating >= 4.5)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 10);
    setTopRatedRestaurants(topRated);
    
    // Get new restaurants (added in the last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const newlyAdded = restaurants
      .filter(restaurant => {
        if (!restaurant.createdAt) return false;
        const createdDate = restaurant.createdAt instanceof Date 
          ? restaurant.createdAt 
          : new Date(restaurant.createdAt);
        return createdDate > thirtyDaysAgo;
      })
      .sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
        const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
        return dateB - dateA;
      })
      .slice(0, 10);
    setNewRestaurants(newlyAdded);
    
    // For demonstration, set some restaurants as "available tonight"
    // In a real app, you would check availability from a bookings collection
    const available = restaurants
      .filter(restaurant => restaurant.businessHours)
      .slice(0, 5);
    setAvailableRestaurants(available);
  };

  // Apply filters to restaurants
  useEffect(() => {
    if (allRestaurants.length === 0) return;
    
    let filtered = [...allRestaurants];
    
    // Apply search query filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(restaurant => 
        restaurant.name.toLowerCase().includes(query) ||
        (restaurant.cuisine && restaurant.cuisine.toLowerCase().includes(query)) ||
        (restaurant.description && restaurant.description.toLowerCase().includes(query)) ||
        (restaurant.address && restaurant.address.toLowerCase().includes(query))
      );
    }
    
    // Apply cuisine filter
    if (filters.cuisine) {
      filtered = filtered.filter(restaurant => 
        restaurant.cuisine && restaurant.cuisine === filters.cuisine
      );
    }
    
    // Apply price range filter
    if (filters.priceRange) {
      filtered = filtered.filter(restaurant => 
        restaurant.priceRange === filters.priceRange
      );
    }
    
    // Apply rating filter
    if (filters.rating) {
      filtered = filtered.filter(restaurant => 
        restaurant.rating >= filters.rating
      );
    }
    
    // Apply open now filter - this would require checking business hours
    if (filters.openNow) {
      const now = new Date();
      const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      filtered = filtered.filter(restaurant => {
        if (!restaurant.businessHours || !restaurant.businessHours[dayOfWeek]) {
          return false;
        }
        
        const { isOpen, opens, closes } = restaurant.businessHours[dayOfWeek];
        
        if (!isOpen) return false;
        
        // Parse hours
        const [openHours, openMinutes] = opens.split(':').map(Number);
        const [closeHours, closeMinutes] = closes.split(':').map(Number);
        
        // Convert to minutes for easier comparison
        const currentTimeInMinutes = currentHour * 60 + currentMinute;
        const openTimeInMinutes = openHours * 60 + openMinutes;
        const closeTimeInMinutes = closeHours * 60 + closeMinutes;
        
        return currentTimeInMinutes >= openTimeInMinutes && currentTimeInMinutes < closeTimeInMinutes;
      });
    }
    
    setFilteredRestaurants(filtered);
  }, [allRestaurants, filters]);

  // Update a single filter
  const updateFilter = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  // Reset all filters
  const resetFilters = () => {
    setFilters({
      cuisine: null,
      priceRange: null,
      rating: null,
      searchQuery: '',
      openNow: false,
    });
  };

  return {
    allRestaurants,
    filteredRestaurants,
    topRatedRestaurants,
    newRestaurants,
    availableRestaurants,
    loading,
    error,
    filters,
    updateFilter,
    resetFilters
  };
};

export default useRestaurants;