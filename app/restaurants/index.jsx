import { View, Text, TextInput, ScrollView, Image, TouchableOpacity, SafeAreaView, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import React, { useState, useEffect, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import useRestaurants from '@/hooks/useRestaurants';
import RestaurantCard from '@/components/RestaurantCard'; 
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from "@/contexts/AuthContext";

const RestaurantsScreen = () => {
  const router = useRouter();
  const {user} = useAuth();
  
  const userId = user?.uid;
  
  
  const {
    filteredRestaurants,
    topRatedRestaurants,
    newRestaurants,
    availableRestaurants,
    loading,
    error,
    filters,
    updateFilter,
    resetFilters
  } = useRestaurants();
  
  const [activeFilter, setActiveFilter] = useState(null);
  const [recentlyViewedRestaurants, setRecentlyViewedRestaurants] = useState([]);
  const [userPreferences, setUserPreferences] = useState({
    cuisines: {},
    priceRanges: {},
    locations: {},
    ratings: {}
  });
  
  const getUserStorageKey = (userId, key) => {
    return `user_${userId}_${key}`;
  };

  // Load recently viewed restaurants and user preferences on component mount
  useEffect(() => {
    // Only proceed if we have both a user and restaurants data
    if (userId && filteredRestaurants.length > 0) {
      loadRecentlyViewed();
      loadUserPreferences();
      console.log("Loading user data from storage for userId:", userId);
    } else if (!userId) {
      // User just signed out
      setRecentlyViewedRestaurants([]);
      setUserPreferences({
        cuisines: {},
        priceRanges: {},
        locations: {},
        ratings: {}
      });
    }
  }, [userId, filteredRestaurants]);

  // Initialize default preferences for new users
  useEffect(() => {
    if (userId && filteredRestaurants.length > 0) {
      initializeDefaultPreferences();
    }
  }, [userId, filteredRestaurants]);

  const initializeDefaultPreferences = async () => {
    if (!userId) return;
    
    // Check if user has preferences already
    const storageKey = getUserStorageKey(userId, 'userPreferences');
    const preferencesData = await AsyncStorage.getItem(storageKey);
    
    if (!preferencesData) {
      // No preferences yet, create default ones
      const defaultPreferences = {
        cuisines: {},
        priceRanges: {},
        locations: {},
        ratings: {
          "4": 1, // Give a small weight to 4-star restaurants
          "5": 2  // Give more weight to 5-star restaurants
        }
      };
      
      // Save default preferences
      setUserPreferences(defaultPreferences);
      await AsyncStorage.setItem(storageKey, JSON.stringify(defaultPreferences));
    }
  };

  const clearUserData = () => {
    setRecentlyViewedRestaurants([]);
    setUserPreferences({
      cuisines: {},
      priceRanges: {},
      locations: {},
      ratings: {}
    });
  };

  // Generate a personalized recommendation reason

  const getRecommendationReason = (restaurant) => {
    const preferences = userPreferences;
    
    const hasPreferences = Object.keys(preferences.cuisines).length > 0 || 
                          Object.keys(preferences.priceRanges).length > 0 ||
                          Object.keys(preferences.locations).length > 0 ||
                          Object.keys(preferences.ratings).length > 0;

    let reasonText = '';

    if (!hasPreferences) {
        if (restaurant.rating >= 4.5) {
            reasonText = `Highly rated restaurant (${restaurant.rating.toFixed(1)}/5)`;
        } else if (restaurant.cuisine) {
            reasonText = `Popular ${restaurant.cuisine} restaurant`;
        } else {
            reasonText = 'Recommended for your dining experience';
        }
    } else {
        if (restaurant.cuisine && preferences.cuisines[restaurant.cuisine]) {
            reasonText = `Based on your interest in ${restaurant.cuisine} food`;
        } else if (restaurant.priceRange && preferences.priceRanges[restaurant.priceRange]) {
            reasonText = "Similar to places you've viewed";
        } else if (restaurant.rating > 4.2) {
            reasonText = "Highly rated place we think you'll love";
        } else if (restaurant.address) {
            const location = restaurant.address.split(',').pop().trim();
            if (preferences.locations[location]) {
                reasonText = "Near other places you've looked at";
            }
        } else {
            reasonText = "Matches your preferences";
        }
    }

    return <Text style={styles.recommendedReasonText}>{reasonText}</Text>;
};

  // Function to load recently viewed restaurants from AsyncStorage
  const loadRecentlyViewed = async () => {
    try {
      if (!userId) return;
      
      console.log("Loading recently viewed for user:", userId);
      const storageKey = getUserStorageKey(userId, 'recentlyViewedRestaurants');
      const recentlyViewedData = await AsyncStorage.getItem(storageKey);
      
      if (recentlyViewedData) {
        const parsedData = JSON.parse(recentlyViewedData);
        console.log("Found recently viewed data:", parsedData);
        
        // If we have data, filter to get only existing restaurants
        if (Array.isArray(parsedData) && parsedData.length > 0) {
          // Find the full restaurant details for each ID in our recently viewed list
          const recentRestaurants = parsedData
            .map(id => {
              const restaurant = filteredRestaurants.find(r => r.id === id);
              if (!restaurant) {
                console.log(`Restaurant with ID ${id} not found in filtered restaurants`);
              }
              return restaurant;
            })
            .filter(restaurant => restaurant !== undefined); // Filter out any undefined values
          
          console.log("Setting recently viewed restaurants:", recentRestaurants.length);
          setRecentlyViewedRestaurants(recentRestaurants);
        }
      } else {
        console.log("No recently viewed data found for user:", userId);
      }
    } catch (error) {
      console.error('Error loading recently viewed restaurants:', error);
    }
  };

  // Navigate to restaurant details page
  const navigateToRestaurantDetails = async (restaurantId) => {
    // Add to recently viewed before navigation
    await addToRecentlyViewed(restaurantId);
    // Navigate to restaurant details
    router.push(`/restaurant/${restaurantId}`);
  };

  // Load user preferences from AsyncStorage
  const loadUserPreferences = async () => {
    try {
      if (!userId) return;
      const storageKey = getUserStorageKey(userId, 'userPreferences');
      const preferencesData = await AsyncStorage.getItem(storageKey);
      if (preferencesData) {
        const parsedData = JSON.parse(preferencesData);
        setUserPreferences(parsedData);
      }
    } catch (error) {
      console.error('Error loading user preferences:', error);
    }
  };

  // Update user preferences based on restaurant interaction
  const updateUserPreferences = async (restaurant) => {
    try {
      if (!userId) return;
      // Create a copy of current preferences
      const updatedPreferences = { ...userPreferences };
      // Update cuisine preference
      if (restaurant.cuisine) {
        updatedPreferences.cuisines[restaurant.cuisine] = 
          (updatedPreferences.cuisines[restaurant.cuisine] || 0) + 1;
      }
      
      // Update price range preference
      if (restaurant.priceRange) {
        updatedPreferences.priceRanges[restaurant.priceRange] = 
          (updatedPreferences.priceRanges[restaurant.priceRange] || 0) + 1;
      }
      
      // Update location preference
      if (restaurant.address) {
        const location = restaurant.address.split(',').pop().trim();
        updatedPreferences.locations[location] = 
          (updatedPreferences.locations[location] || 0) + 1;
      }
      
      // Update rating preference
      if (restaurant.rating) {
        const ratingRange = Math.floor(restaurant.rating);
        updatedPreferences.ratings[ratingRange] = 
          (updatedPreferences.ratings[ratingRange] || 0) + 1;
      }
      
      // Update state
      setUserPreferences(updatedPreferences);
      
      // Save to AsyncStorage
      const storageKey = getUserStorageKey(userId, 'userPreferences');
      await AsyncStorage.setItem(storageKey, JSON.stringify(updatedPreferences));
    } catch (error) {
      console.error('Error updating user preferences:', error);
    }
  };

  // Add a restaurant to recently viewed
  const addToRecentlyViewed = async (restaurantId) => {
    try {
      if (!userId) return;
      // Find the restaurant details
      const restaurant = filteredRestaurants.find(r => r.id === restaurantId);
      
      if (!restaurant) {
        console.warn(`Restaurant with ID ${restaurantId} not found in filtered restaurants`);
        return;
      }
  
      // Update user preferences
      await updateUserPreferences(restaurant);
      
      // Get current list
      const storageKey = getUserStorageKey(userId, 'recentlyViewedRestaurants');
      const recentlyViewedData = await AsyncStorage.getItem(storageKey);
      let recentlyViewedIds = [];
      
      if (recentlyViewedData) {
        recentlyViewedIds = JSON.parse(recentlyViewedData);
      }
      
      // If the restaurant is already in the list, remove it first (so it can be added to the front)
      if (recentlyViewedIds.includes(restaurantId)) {
        // Remove it so we can add it to the front
        recentlyViewedIds = recentlyViewedIds.filter(id => id !== restaurantId);
      }
      
      // Add the current restaurant to the beginning
      recentlyViewedIds.unshift(restaurantId);
      
      // Keep only the last 10 viewed restaurants
      if (recentlyViewedIds.length > 10) {
        recentlyViewedIds = recentlyViewedIds.slice(0, 10);
      }
      
      // Save back to storage with user-specific key
      await AsyncStorage.setItem(storageKey, JSON.stringify(recentlyViewedIds));
      
      // Update the state directly to reflect the change immediately
      setRecentlyViewedRestaurants(prevRestaurants => {
        // Create a new array without the current restaurant (in case it was already there)
        const filteredPrev = prevRestaurants.filter(r => r.id !== restaurantId);
        // Add the restaurant to the beginning
        return [restaurant, ...filteredPrev].slice(0, 10);
      });
      
      console.log("Recently viewed updated, refreshing recommendations");
    } catch (error) {
      console.error('Error adding to recently viewed:', error);
    }
  };

  // Get recommended restaurants based on user preferences
  const recommendedRestaurants = useMemo(() => {
    // If there are no filtered restaurants, we can't recommend anything
    if (!filteredRestaurants.length) {
      return [];
    }
    
    // Create a copy of the filtered restaurants to work with
    const allRestaurants = [...filteredRestaurants];
    
    // For new users without preferences or with minimal preferences
    const hasPreferences = Object.keys(userPreferences.cuisines).length > 0 || 
                           Object.keys(userPreferences.priceRanges).length > 0 ||
                           Object.keys(userPreferences.locations).length > 0 ||
                           Object.keys(userPreferences.ratings).length > 0;
    
    // Get IDs of restaurants the user has viewed
    const recentlyViewedIds = recentlyViewedRestaurants.map(r => r.id);
    
    // If we don't have preferences, use rating-based recommendations
    if (!hasPreferences) {
      // Return some top rated restaurants as default recommendations,
      // excluding ones that are in recently viewed
      const highlyRated = allRestaurants
        .filter(r => r.rating && r.rating >= 4.0 && !recentlyViewedIds.includes(r.id))
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, 6);
        
      // If we have high-rated restaurants, return them
      if (highlyRated.length > 0) {
        return highlyRated;
      }
      
      // Otherwise, return any restaurants user hasn't viewed yet
      const unseenRestaurants = allRestaurants
        .filter(r => !recentlyViewedIds.includes(r.id))
        .slice(0, 6);
        
      if (unseenRestaurants.length > 0) {
        return unseenRestaurants;
      }
      
      // If all restaurants have been viewed, return some random ones
      return allRestaurants
        .sort(() => 0.5 - Math.random()) // Randomly shuffle
        .slice(0, 6);
    }
    
    // Calculate a score for each restaurant based on how well it matches user preferences
    const scoredRestaurants = allRestaurants.map(restaurant => {
      let score = 0;
      
      // Score based on cuisine
      if (restaurant.cuisine && userPreferences.cuisines[restaurant.cuisine]) {
        score += userPreferences.cuisines[restaurant.cuisine] * 2; // Weight cuisine more heavily
      }
      
      // Score based on price range
      if (restaurant.priceRange && userPreferences.priceRanges[restaurant.priceRange]) {
        score += userPreferences.priceRanges[restaurant.priceRange];
      }
      
      // Score based on location
      if (restaurant.address) {
        const location = restaurant.address.split(',').pop().trim();
        if (userPreferences.locations[location]) {
          score += userPreferences.locations[location];
        }
      }
      
      // Score based on rating
      if (restaurant.rating) {
        const ratingRange = Math.floor(restaurant.rating);
        if (userPreferences.ratings[ratingRange]) {
          score += userPreferences.ratings[ratingRange];
        }
        
        // Give some small weight to rating regardless of preferences
        score += (restaurant.rating / 5) * 0.5;
      }
      
      return {
        ...restaurant,
        recommendationScore: score
      };
    });
    
    // Filter out restaurants that the user has recently viewed
    const unseen = scoredRestaurants.filter(r => !recentlyViewedIds.includes(r.id));
    
    // If we have unseen recommendations with scores > 0
    const goodRecommendations = unseen.filter(r => r.recommendationScore > 0);
    
    if (goodRecommendations.length > 0) {
      // Sort by score (descending) and take top 10
      return goodRecommendations
        .sort((a, b) => b.recommendationScore - a.recommendationScore)
        .slice(0, 10);
    }
    
    // If we have no scored recommendations, use a backup method:
    // 1. Try to find restaurants of the most viewed cuisines that haven't been viewed yet
    const preferredCuisines = Object.keys(userPreferences.cuisines)
      .sort((a, b) => userPreferences.cuisines[b] - userPreferences.cuisines[a])
      .slice(0, 3); // Top 3 cuisines
      
    if (preferredCuisines.length > 0) {
      const cuisineRecommendations = allRestaurants
        .filter(r => 
          preferredCuisines.includes(r.cuisine) && 
          !recentlyViewedIds.includes(r.id)
        )
        .slice(0, 6);
        
      if (cuisineRecommendations.length > 0) {
        return cuisineRecommendations;
      }
    }
    
    // 2. If all else fails, return any restaurants the user hasn't viewed
    const anyUnseenRestaurants = allRestaurants
      .filter(r => !recentlyViewedIds.includes(r.id))
      .slice(0, 6);
      
    if (anyUnseenRestaurants.length > 0) {
      return anyUnseenRestaurants;
    }
    
    // 3. If they've viewed everything, show random restaurants
    return allRestaurants
      .sort(() => 0.5 - Math.random()) // Randomly shuffle
      .slice(0, 6);
  }, [filteredRestaurants, userPreferences, recentlyViewedRestaurants]);

  const handleSearch = (text) => {
    updateFilter('searchQuery', text);
  };

  const toggleFilter = (filterName) => {
    if (activeFilter === filterName) {
      setActiveFilter(null);
      updateFilter(filterName, false);
    } else {
      setActiveFilter(filterName);
      updateFilter(filterName, true);
    }
  };

  // Render loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1a1a1a" />
          <Text style={styles.loadingText}>Loading restaurants...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render error state
  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#e53935" />
          <Text style={styles.errorTitle}>Oops!</Text>
          <Text style={styles.errorText}>
            We encountered an error while loading the restaurants.
          </Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => window.location.reload()}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View style={styles.headerContainer}>
          <Text style={styles.mainHeading}>Find your restaurant for any occasion</Text>
          <Text style={styles.subheading}>Discover and book the best restaurant</Text>
        </View>

        {/* Search Bar Section */}
        <View style={styles.searchBarContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchBar}
            placeholder="Search restaurants, cuisines, locations..."
            placeholderTextColor="#999"
            value={filters.searchQuery}
            onChangeText={handleSearch}
          />
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => router.push('/filter')}
          >
            <Ionicons name="options-outline" size={20} color="#1a1a1a" />
          </TouchableOpacity>
        </View>

        {/* Quick Filters */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickFiltersContainer}
        >
          <TouchableOpacity 
            style={[
              styles.filterPill, 
              activeFilter === 'openNow' && styles.filterPillActive
            ]}
            onPress={() => toggleFilter('openNow')}
          >
            <Text style={[
              styles.filterText,
              activeFilter === 'openNow' && styles.filterTextActive
            ]}>
              Open Now
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.filterPill, 
              activeFilter === 'outdoorSeating' && styles.filterPillActive
            ]}
            onPress={() => toggleFilter('outdoorSeating')}
          >
            <Text style={[
              styles.filterText,
              activeFilter === 'outdoorSeating' && styles.filterTextActive
            ]}>
              Outdoor Seating
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.filterPill, 
              activeFilter === 'tableForTwo' && styles.filterPillActive
            ]}
            onPress={() => toggleFilter('tableForTwo')}
          >
            <Text style={[
              styles.filterText,
              activeFilter === 'tableForTwo' && styles.filterTextActive
            ]}>
              Table for 2
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.filterPill, 
              activeFilter === 'petFriendly' && styles.filterPillActive
            ]}
            onPress={() => toggleFilter('petFriendly')}
          >
            <Text style={[
              styles.filterText,
              activeFilter === 'petFriendly' && styles.filterTextActive
            ]}>
              Pet Friendly
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.filterPill, 
              activeFilter === 'vegetarian' && styles.filterPillActive
            ]}
            onPress={() => toggleFilter('vegetarian')}
          >
            <Text style={[
              styles.filterText,
              activeFilter === 'vegetarian' && styles.filterTextActive
            ]}>
              Vegetarian
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Recently Viewed Section */}
        {recentlyViewedRestaurants.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recently Viewed</Text>
              
            </View>

            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recentlyViewedContainer}
            >
              {recentlyViewedRestaurants.map((restaurant) => (
                <TouchableOpacity 
                  key={`recent-${restaurant.id}`}
                  style={styles.recentlyViewedItem}
                  onPress={() => navigateToRestaurantDetails(restaurant.id)}
                >
                  <Image 
                    source={{ uri: restaurant.images?.[0] || 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80' }}
                    style={styles.recentlyViewedImage}
                  />
                  <Text style={styles.recentlyViewedName} numberOfLines={2}>{restaurant.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}
        
{/* Recommended For You Section */ }
{recommendedRestaurants.length > 0 && (
  <>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>Recommended For You</Text>
    </View>

    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.recommendedContainer}
    >
      {recommendedRestaurants.map((restaurant) => {
        // --- Debugging Logs (Keep these during development) ---
        {/* console.log("Restaurant Data:", restaurant);
        console.log("  Name:", restaurant.name, typeof restaurant.name);
        console.log("  Cuisine:", restaurant.cuisine, typeof restaurant.cuisine);
        console.log("  PriceRange:", restaurant.priceRange, typeof restaurant.priceRange); */}

        return (
          <TouchableOpacity
            key={`recommended-${restaurant.id}`}
            style={styles.recommendedCard}
            onPress={() => navigateToRestaurantDetails(restaurant.id)}
          >
            <Image
              source={{ uri: restaurant.images?.[0] || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80' }}
              style={styles.recommendedImage}
            />
            <View style={styles.recommendedBadge}>
              <Ionicons name="thumbs-up" size={12} color="#FFFFFF" />
              <Text style={styles.recommendedBadgeText}>For You</Text>
            </View>
            <View style={styles.recommendedContent}>
              <Text style={styles.recommendedName}>{restaurant.name}</Text>
              <Text style={styles.recommendedInfo}>
                {typeof restaurant.cuisine === 'string' ? restaurant.cuisine : 'Cuisine Not Available'} · {typeof restaurant.priceRange === 'string' ? restaurant.priceRange : 'Price Not Available'}
              </Text>
              {restaurant.rating != null && (  // Use != null for safety
                <View style={styles.recommendedRating}>
                  <Ionicons name="star" size={12} color="#FFD700" />
                  <Text style={styles.recommendedRatingText}>{restaurant.rating.toFixed(1)}</Text>
                </View>
              )}
              <View style={styles.recommendedReason}>
                <Text style={styles.recommendedReasonText}>
                  {getRecommendationReason(restaurant)}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  </>
)}

        {/* Available Tonight */}
        {availableRestaurants.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Available Tonight</Text>
              
            </View>

            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.availableContainer}
            >
              {availableRestaurants.map((restaurant) => (
                <TouchableOpacity 
                  key={`available-${restaurant.id}`}
                  style={styles.availableCard}
                  onPress={() => navigateToRestaurantDetails(restaurant.id)}
                >
                  <Image 
                    source={{ uri: restaurant.images?.[0] || 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80' }}
                    style={styles.availableImage}
                  />
                  <View style={styles.availableContent}>
                    <Text style={styles.availableRestaurantName}>{restaurant.name}</Text>
                
                    <View style={styles.availableButton}>
                      <Text style={styles.availableButtonText}>Book Now</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* Top Rated Section */}
        {topRatedRestaurants.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Top Rated</Text>
              
            </View>

            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.topRatedContainer}
            >
              {topRatedRestaurants.map((restaurant) => (
                <TouchableOpacity 
                  key={`toprated-${restaurant.id}`}
                  style={styles.topRatedCard}
                  onPress={() => navigateToRestaurantDetails(restaurant.id)}
                >
                  <Image 
                    source={{ uri: restaurant.images?.[0] || 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80' }}
                    style={styles.topRatedImage}
                  />
                  <View style={styles.topRatedBadge}>
                    <Text style={styles.topRatedBadgeText}>{restaurant.rating.toFixed(1)}</Text>
                    <Ionicons name="star" size={12} color="#FFD700" />
                  </View>
                  <View style={styles.topRatedContent}>
                    <Text style={styles.topRatedName}>{restaurant.name}</Text>
                    <Text style={styles.topRatedInfo}>
                      {restaurant.cuisine} · {restaurant.priceRange}
                    </Text>
                  
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

  
{/* All Restaurants */}
<View style={styles.sectionHeader}>
  <Text style={styles.sectionTitle}>All Restaurants</Text>
</View>

{/* Restaurant Cards - Grid Layout */}
<View style={styles.restaurantGrid}>
  {filteredRestaurants.slice(0, 6).map((restaurant) => {
    
    {/* console.log(`Rendering restaurant: ${restaurant.name}, Address: ${restaurant.address}, Cuisine: ${restaurant.cuisine}, Rating: ${restaurant.rating}`); */}

    return (
      <TouchableOpacity 
        key={`grid-${restaurant.id}`}
        style={styles.restaurantCard}
        onPress={() => navigateToRestaurantDetails(restaurant.id)}
      >
        <Image 
          source={{ uri: restaurant.images?.[0] || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80' }}
          style={styles.restaurantImage}
        />
        <View style={styles.cardFooter}>
          <View style={styles.restaurantNameContainer}>
            <Text style={styles.restaurantName}>{restaurant.name}</Text>
          </View>
          <View style={styles.restaurantDetails}>
            <View style={styles.locationInfo}>
              <Ionicons name="location-outline" size={14} color="#1a1a1a" />
              <Text style={styles.locationText}>
                {restaurant.address 
                  ? (typeof restaurant.address === 'string' 
                      ? restaurant.address.split(',').pop().trim() 
                      : String(restaurant.address)) // Convert to string if not already
                  : 'Location not specified'}
              </Text>
            </View>
            <View style={styles.cuisineInfo}>
              <Ionicons name="restaurant-outline" size={14} color="#1a1a1a" />
              <Text style={styles.cuisineText}>
                {restaurant.cuisine ? restaurant.cuisine : 'Various'}
              </Text>
            </View>
            {restaurant.rating != null && ( // Check for null or undefined
              <View style={styles.ratingInfo}>
                <Ionicons name="star" size={14} color="#FFD700" />
                <Text style={styles.ratingText}>{restaurant.rating.toFixed(1)}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  })}
</View>
        {filteredRestaurants.length === 0 && (
          <View style={styles.noResultsContainer}>
            <Ionicons name="search-outline" size={64} color="#ccc" />
            <Text style={styles.noResultsTitle}>No restaurants found</Text>
            <Text style={styles.noResultsText}>
              Try adjusting your filters or search terms
            </Text>
            <TouchableOpacity 
              style={styles.resetButton}
              onPress={resetFilters}
            >
              <Text style={styles.resetButtonText}>Reset Filters</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Spacing at the bottom */}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#e8f0ed",
  },
  recommendedReasonText: {
  fontSize: 12,
  color: '#555',
},
  container: {
    flex: 1,
    padding: 16,
  },
  headerContainer: {
    marginTop: 12,
    marginBottom: 16,
  },
  mainHeading: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1a1a1a",
    lineHeight: 30,
    marginBottom: 6,
  },
  subheading: {
    fontSize: 14,
    color: "#555555",
    lineHeight: 18,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    paddingHorizontal: 12,
    marginBottom: 16,
    height: 45,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchBar: {
    flex: 1,
    height: 45,
    fontSize: 14,
    color: '#333333',
  },
  filterButton: {
    padding: 6,
  },
  quickFiltersContainer: {
    paddingBottom: 16,
  },
  filterPill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  filterPillActive: {
    backgroundColor: '#1a1a1a',
  },
  filterText: {
    fontSize: 12,
    color: '#1a1a1a',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  seeAllText: {
    fontSize: 14,
    color: '#1a1a1a',
  },
  // Recently Viewed Styles
  recentlyViewedContainer: {
    paddingBottom: 20,
  },
  recentlyViewedItem: {
    width: 100,
    marginRight: 14,
    alignItems: 'center',
  },
  recentlyViewedImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  recentlyViewedName: {
    fontSize: 12,
    color: '#1a1a1a',
    textAlign: 'center',
    fontWeight: '500',
  },
  // Recommended Restaurants Styles
  recommendedContainer: {
    paddingBottom: 20,
  },
  recommendedCard: {
    width: 240,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginRight: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  recommendedImage: {
    width: '100%',
    height: 140,
  },
  recommendedBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#6e3de0',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  recommendedBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  recommendedContent: {
    padding: 12,
  },
  recommendedName: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#1a1a1a',
  },
  recommendedInfo: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
  },
  recommendedRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  recommendedRatingText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginLeft: 4,
  },
  recommendedReason: {
    backgroundColor: '#f0f7f5',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  recommendedReasonText: {
    fontSize: 11,
    color: '#4a4a4a',
    fontStyle: 'italic',
  },
  promotionsContainer: {
    paddingBottom: 20,
  },
  promotionCard: {
    width: 280,
    height: 150,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 16,
    position: 'relative',
  },
  promotionImage: {
    width: '100%',
    height: '100%',
  },
  promotionOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  promotionBadge: {
    backgroundColor: '#FF6B00',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  promotionBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  promotionTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  promotionSubtitle: {
    color: 'white',
    fontSize: 12,
  },
  categoriesContainer: {
    paddingBottom: 12,
    paddingLeft: 4,
  },
  categoryItem: {
    alignItems: 'center',
    marginRight: 16,
  },
  categoryIcon: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryLabel: {
    fontSize: 12,
    color: '#333333',
  },
  paginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 14,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ccc',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#1a1a1a',
  },
  availableContainer: {
    paddingBottom: 20,
  },
  availableCard: {
    width: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginRight: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  availableImage: {
    width: '100%',
    height: 120,
  },
  availableContent: {
    padding: 12,
  },
  availableRestaurantName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#1a1a1a',
  },
  availableTime: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
  },
  availableButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
  },
  availableButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  topRatedContainer: {
    paddingBottom: 20,
  },
  topRatedCard: {
    width: 180,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginRight: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  topRatedImage: {
    width: '100%',
    height: 120,
  },
  topRatedBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'white',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  topRatedBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginRight: 4,
  },
  topRatedContent: {
    padding: 12,
  },
  topRatedName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
    color: '#1a1a1a',
  },
  topRatedInfo: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  topRatedReviews: {
    fontSize: 11,
    color: '#999',
  },
  newRestaurantsContainer: {
    paddingBottom: 20,
  },
  newRestaurantCard: {
    width: 200,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginRight: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  newRestaurantImage: {
    width: '100%',
    height: 120,
  },
  newBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#20B2AA',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  newBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  newRestaurantContent: {
    padding: 12,
  },
  newRestaurantName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
    color: '#1a1a1a',
  },
  newRestaurantInfo: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  newRestaurantDate: {
    fontSize: 11,
    color: '#999',
  },
  collectionCard: {
    width: 240,
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 16,
    position: 'relative',
  },
  collectionImage: {
    width: '100%',
    height: '100%',
  },
  collectionOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  collectionTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  collectionCount: {
    color: 'white',
    fontSize: 12,
  },
  restaurantGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  restaurantCard: {
    width: '48%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  restaurantImage: {
    width: '100%',
    height: 120,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  cardFooter: {
    padding: 10,
  },
  restaurantNameContainer: {
    marginBottom: 6,
  },
  restaurantName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  restaurantDetails: {
    marginTop: 2,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#1a1a1a',
    marginLeft: 4,
  },
  cuisineInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  cuisineText: {
    fontSize: 12,
    color: '#1a1a1a',
    marginLeft: 4,
  },
  ratingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    color: '#1a1a1a',
    marginLeft: 4,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#1a1a1a',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginTop: 10,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  noResultsContainer: {
    alignItems: 'center',
    padding: 40,
  },
  noResultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginTop: 16,
    marginBottom: 8,
  },
  noResultsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  resetButton: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  resetButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  }
})

export default RestaurantsScreen