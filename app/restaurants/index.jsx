import { View, Text, TextInput, ScrollView, Image, TouchableOpacity, SafeAreaView, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import React, { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import useRestaurants from '@/hooks/useRestaurants';
import RestaurantCard from '@/components/RestaurantCard'; 

const RestaurantsScreen = () => {
  const router = useRouter();
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

  const navigateToRestaurantDetails = (restaurantId) => {
    router.push(`/restaurant/${restaurantId}`);
  };

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
          <Text style={styles.mainHeading}>Find your table for any occasion</Text>
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

        {/* Available Tonight */}
        {availableRestaurants.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Available Tonight</Text>
              <TouchableOpacity onPress={() => router.push('/available')}>
                <Text style={styles.seeAllText}>See all</Text>
              </TouchableOpacity>
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
                    <Text style={styles.availableTime}>
                      {restaurant.availableTime || '7:30 PM · 2 people'}
                    </Text>
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
              <Text style={styles.sectionTitle}>Top Rated Near You</Text>
              <TouchableOpacity onPress={() => router.push('/top-rated')}>
                <Text style={styles.seeAllText}>See all</Text>
              </TouchableOpacity>
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
                    <Text style={styles.topRatedReviews}>
                      {restaurant.reviewCount || 0} reviews
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* New to DineConnect */}
        {newRestaurants.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>New on DineConnect</Text>
              <TouchableOpacity onPress={() => router.push('/new-restaurants')}>
                <Text style={styles.seeAllText}>See all</Text>
              </TouchableOpacity>
            </View>

            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.newRestaurantsContainer}
            >
              {newRestaurants.map((restaurant) => (
                <TouchableOpacity 
                  key={`new-${restaurant.id}`}
                  style={styles.newRestaurantCard}
                  onPress={() => navigateToRestaurantDetails(restaurant.id)}
                >
                  <Image 
                    source={{ uri: restaurant.images?.[0] || 'https://images.unsplash.com/photo-1555992336-fb0d29498b13?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80' }}
                    style={styles.newRestaurantImage}
                  />
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>NEW</Text>
                  </View>
                  <View style={styles.newRestaurantContent}>
                    <Text style={styles.newRestaurantName}>{restaurant.name}</Text>
                    <Text style={styles.newRestaurantInfo}>
                      {restaurant.cuisine || 'Various'} · {restaurant.priceRange || '$$'}
                    </Text>
                    <Text style={styles.newRestaurantDate}>
                      {restaurant.createdAt ? 
                        `Joined ${new Date(restaurant.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}` :
                        'New addition'
                      }
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
          <TouchableOpacity onPress={() => router.push('/all-restaurants')}>
            <Text style={styles.seeAllText}>See all</Text>
          </TouchableOpacity>
        </View>

        {/* Restaurant Cards - Grid Layout */}
        <View style={styles.restaurantGrid}>
          {filteredRestaurants.slice(0, 6).map((restaurant) => (
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
                      {restaurant.address ? restaurant.address.split(',').pop().trim() : 'Location not specified'}
                    </Text>
                  </View>
                  <View style={styles.cuisineInfo}>
                    <Ionicons name="restaurant-outline" size={14} color="#1a1a1a" />
                    <Text style={styles.cuisineText}>{restaurant.cuisine || 'Various'}</Text>
                  </View>
                  {restaurant.rating && (
                    <View style={styles.ratingInfo}>
                      <Ionicons name="star" size={14} color="#FFD700" />
                      <Text style={styles.ratingText}>{restaurant.rating.toFixed(1)}</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))}
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
  filterText: {
    fontSize: 12,
    color: '#1a1a1a',
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
  },
  recentlyViewedName: {
    fontSize: 12,
    color: '#1a1a1a',
    textAlign: 'center',
  },
  collectionsContainer: {
    paddingBottom: 20,
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
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  restaurantCard: {
    width: '48%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
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
  },
  cuisineText: {
    fontSize: 12,
    color: '#1a1a1a',
    marginLeft: 4,
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
  eventCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  eventImage: {
    width: '100%',
    height: 160,
  },
  eventContent: {
    padding: 16,
  },
  eventDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 6,
  },
  eventDescription: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
  },

});

export default RestaurantsScreen;