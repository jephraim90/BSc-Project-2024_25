import { View, Text, TextInput, ScrollView, Image, TouchableOpacity, SafeAreaView, StyleSheet, FlatList } from 'react-native';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';



const RestaurantsScreen = () => {
  const router = useRouter();
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
          />
          <TouchableOpacity style={styles.filterButton}>
            <Ionicons name="options-outline" size={20} color="#1a1a1a" />
          </TouchableOpacity>
        </View>

        {/* Quick Filters */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickFiltersContainer}
        >
          <TouchableOpacity style={styles.filterPill}>
            <Text style={styles.filterText}>Open Now</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterPill}>
            <Text style={styles.filterText}>Outdoor Seating</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterPill}>
            <Text style={styles.filterText}>Table for 2</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterPill}>
            <Text style={styles.filterText}>Pet Friendly</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterPill}>
            <Text style={styles.filterText}>Vegetarian</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Featured Promotions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Special Offers</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>See all</Text>
          </TouchableOpacity>
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.promotionsContainer}
        >
          <TouchableOpacity style={styles.promotionCard} onPress={()=>router.push("/details")}>
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1559329007-40df8a9345d8?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80' }}
              style={styles.promotionImage}
            />
            <View style={styles.promotionOverlay}>
              <View style={styles.promotionBadge}>
                <Text style={styles.promotionBadgeText}>20% OFF</Text>
              </View>
              <Text style={styles.promotionTitle}>Weekend Brunch Special</Text>
              <Text style={styles.promotionSubtitle}>Valid until May 31</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.promotionCard}>
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80' }}
              style={styles.promotionImage}
            />
            <View style={styles.promotionOverlay}>
              <View style={styles.promotionBadge}>
                <Text style={styles.promotionBadgeText}>BOGO</Text>
              </View>
              <Text style={styles.promotionTitle}>Happy Hour Drinks</Text>
              <Text style={styles.promotionSubtitle}>Daily 4-7 PM</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>

        {/* Categories Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>See all</Text>
          </TouchableOpacity>
        </View>

        {/* Category Icons */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        >
          <TouchableOpacity style={styles.categoryItem}>
            <View style={[styles.categoryIcon, {backgroundColor: '#FFECCD'}]}>
              <Ionicons name="fast-food-outline" size={22} color="#1a1a1a" />
            </View>
            <Text style={styles.categoryLabel}>Burger</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.categoryItem}>
            <View style={[styles.categoryIcon, {backgroundColor: '#FFE0DC'}]}>
              <Ionicons name="pizza-outline" size={22} color="#1a1a1a" />
            </View>
            <Text style={styles.categoryLabel}>Pizza</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.categoryItem}>
            <View style={[styles.categoryIcon, {backgroundColor: '#E5F0EB'}]}>
              <Ionicons name="cafe-outline" size={22} color="#1a1a1a" />
            </View>
            <Text style={styles.categoryLabel}>Coffee</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.categoryItem}>
            <View style={[styles.categoryIcon, {backgroundColor: '#FFE8B3'}]}>
              <Ionicons name="restaurant-outline" size={22} color="#1a1a1a" />
            </View>
            <Text style={styles.categoryLabel}>Bakery</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Pagination Dots */}
        <View style={styles.paginationDots}>
          <View style={[styles.dot, styles.activeDot]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>

        {/* Available Tonight */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Available Tonight</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>See all</Text>
          </TouchableOpacity>
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.availableContainer}
        >
          <TouchableOpacity style={styles.availableCard}>
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80' }}
              style={styles.availableImage}
            />
            <View style={styles.availableContent}>
              <Text style={styles.availableRestaurantName}>Harbor Bistro</Text>
              <Text style={styles.availableTime}>7:30 PM · 2 people</Text>
              <View style={styles.availableButton}>
                <Text style={styles.availableButtonText}>Book Now</Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.availableCard}>
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1544148103-0773bf10d330?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80' }}
              style={styles.availableImage}
            />
            <View style={styles.availableContent}>
              <Text style={styles.availableRestaurantName}>Olive Garden</Text>
              <Text style={styles.availableTime}>8:00 PM · 2 people</Text>
              <View style={styles.availableButton}>
                <Text style={styles.availableButtonText}>Book Now</Text>
              </View>
            </View>
          </TouchableOpacity>
        </ScrollView>

        {/* Top Rated Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Top Rated Near You</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>See all</Text>
          </TouchableOpacity>
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.topRatedContainer}
        >
          <TouchableOpacity style={styles.topRatedCard}>
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80' }}
              style={styles.topRatedImage}
            />
            <View style={styles.topRatedBadge}>
              <Text style={styles.topRatedBadgeText}>4.9</Text>
              <Ionicons name="star" size={12} color="#FFD700" />
            </View>
            <View style={styles.topRatedContent}>
              <Text style={styles.topRatedName}>The Golden Spoon</Text>
              <Text style={styles.topRatedInfo}>Italian · $$$</Text>
              <Text style={styles.topRatedReviews}>496 reviews</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.topRatedCard}>
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80' }}
              style={styles.topRatedImage}
            />
            <View style={styles.topRatedBadge}>
              <Text style={styles.topRatedBadgeText}>4.8</Text>
              <Ionicons name="star" size={12} color="#FFD700" />
            </View>
            <View style={styles.topRatedContent}>
              <Text style={styles.topRatedName}>Fresh Farm</Text>
              <Text style={styles.topRatedInfo}>Organic · $$</Text>
              <Text style={styles.topRatedReviews}>384 reviews</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>

        {/* Recently Viewed */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recently Viewed</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>Clear</Text>
          </TouchableOpacity>
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.recentlyViewedContainer}
        >
          <TouchableOpacity style={styles.recentlyViewedItem}>
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80' }}
              style={styles.recentlyViewedImage}
            />
            <Text style={styles.recentlyViewedName}>Sushi Palace</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.recentlyViewedItem}>
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80' }}
              style={styles.recentlyViewedImage}
            />
            <Text style={styles.recentlyViewedName}>Pizza Heaven</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.recentlyViewedItem}>
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1453614512568-c4024d13c247?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80' }}
              style={styles.recentlyViewedImage}
            />
            <Text style={styles.recentlyViewedName}>Craft Burgers</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Cuisine Collections */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Collections</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>See all</Text>
          </TouchableOpacity>
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.collectionsContainer}
        >
          <TouchableOpacity style={styles.collectionCard}>
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80' }}
              style={styles.collectionImage}
            />
            <View style={styles.collectionOverlay}>
              <Text style={styles.collectionTitle}>Romantic Dinner Spots</Text>
              <Text style={styles.collectionCount}>12 restaurants</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.collectionCard}>
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80' }}
              style={styles.collectionImage}
            />
            <View style={styles.collectionOverlay}>
              <Text style={styles.collectionTitle}>Summer Patios</Text>
              <Text style={styles.collectionCount}>8 restaurants</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>

        {/* Restaurants You May Like */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Restaurants You may like</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>See all</Text>
          </TouchableOpacity>
        </View>

        {/* Restaurant Cards - Grid Layout */}
        <View style={styles.restaurantGrid}>
          <TouchableOpacity style={styles.restaurantCard}>
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80' }}
              style={styles.restaurantImage}
            />
            <View style={styles.cardFooter}>
              <View style={styles.locationInfo}>
                <Ionicons name="location-outline" size={14} color="#1a1a1a" />
                <Text style={styles.locationText}>30122, Venice</Text>
              </View>
              <View style={styles.cuisineInfo}>
                <Ionicons name="restaurant-outline" size={14} color="#1a1a1a" />
                <Text style={styles.cuisineText}>Italian</Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.restaurantCard}>
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80' }}
              style={styles.restaurantImage}
            />
            <View style={styles.cardFooter}>
              <View style={styles.locationInfo}>
                <Ionicons name="location-outline" size={14} color="#1a1a1a" />
                <Text style={styles.locationText}>30122, Venice</Text>
              </View>
              <View style={styles.cuisineInfo}>
                <Ionicons name="restaurant-outline" size={14} color="#1a1a1a" />
                <Text style={styles.cuisineText}>French</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* New to DineConnect */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>New to DineConnect</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>See all</Text>
          </TouchableOpacity>
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.newRestaurantsContainer}
        >
          <TouchableOpacity style={styles.newRestaurantCard}>
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1555992336-fb0d29498b13?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80' }}
              style={styles.newRestaurantImage}
            />
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>NEW</Text>
            </View>
            <View style={styles.newRestaurantContent}>
              <Text style={styles.newRestaurantName}>Garden Café</Text>
              <Text style={styles.newRestaurantInfo}>Vegetarian · $$</Text>
              <Text style={styles.newRestaurantDate}>Joined May 2025</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.newRestaurantCard}>
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1551632436-cbf8dd35adfa?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80' }}
              style={styles.newRestaurantImage}
            />
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>NEW</Text>
            </View>
            <View style={styles.newRestaurantContent}>
              <Text style={styles.newRestaurantName}>Smokehouse BBQ</Text>
              <Text style={styles.newRestaurantInfo}>American · $$$</Text>
              <Text style={styles.newRestaurantDate}>Joined May 2025</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>

        {/* Upcoming Events */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Dining Events</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>See all</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.eventCard}>
          <Image 
            source={{ uri: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80' }}
            style={styles.eventImage}
          />
          <View style={styles.eventContent}>
            <Text style={styles.eventDate}>May 22-29, 2025</Text>
            <Text style={styles.eventTitle}>Venice Restaurant Week</Text>
            <Text style={styles.eventDescription}>Special prix fixe menus at 25+ restaurants</Text>
          </View>
        </TouchableOpacity>

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