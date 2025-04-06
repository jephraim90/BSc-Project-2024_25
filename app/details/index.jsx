import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import React, { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';


const Details = () => {
  const router = useRouter();
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedTab, setSelectedTab] = useState('overview');
  
  // Sample restaurant data
  const restaurant = {
    id: '1',
    name: 'La Trattoria Italiana',
    rating: 4.8,
    reviews: 342,
    priceRange: '£££',
    cuisine: 'Italian',
    address: '123 Venice Street, Venice, 30122',
    phone: '+39 123 456 7890',
    hours: [
      { day: 'Monday-Thursday', hours: '12:00 PM - 10:00 PM' },
      { day: 'Friday-Saturday', hours: '12:00 PM - 11:00 PM' },
      { day: 'Sunday', hours: '11:00 AM - 9:00 PM' },
    ],
    description: 'Authentic Italian cuisine with a focus on fresh seafood and homemade pasta. Our recipes have been passed down through generations, bringing the true taste of Italy to Venice.',
    specialties: ['Seafood Risotto', 'Homemade Tagliatelle', 'Tiramisu'],
    images: [
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80',
    ],
    menuSections: [
      {
        name: 'Appetizers',
        items: [
          { name: 'Bruschetta', description: 'Toasted bread with fresh tomatoes, garlic and basil', price: '€8' },
          { name: 'Calamari Fritti', description: 'Crispy fried calamari with lemon and marinara sauce', price: '€12' },
          { name: 'Caprese Salad', description: 'Fresh mozzarella, tomatoes, and basil with balsamic glaze', price: '€10' },
        ]
      },
      {
        name: 'Pasta',
        items: [
          { name: 'Spaghetti Carbonara', description: 'Classic carbonara with pancetta, egg, and pecorino cheese', price: '€14' },
          { name: 'Seafood Risotto', description: 'Creamy risotto with fresh seafood and saffron', price: '€18' },
          { name: 'Tagliatelle Bolognese', description: 'Homemade tagliatelle with traditional bolognese sauce', price: '€16' },
        ]
      },
      {
        name: 'Main Courses',
        items: [
          { name: 'Grilled Sea Bass', description: 'Fresh sea bass with lemon, herbs and seasonal vegetables', price: '€24' },
          { name: 'Veal Saltimbocca', description: 'Tender veal with prosciutto and sage in white wine sauce', price: '€22' },
          { name: 'Chicken Marsala', description: 'Chicken breast with mushrooms in marsala wine sauce', price: '€20' },
        ]
      }
    ],
    reviewsList: [
      { id: '1', user: 'Marco R.', rating: 5, comment: 'Authentic Italian cuisine! The seafood risotto was amazing.', date: 'April 28, 2025' },
      { id: '2', user: 'Julia S.', rating: 4, comment: 'Great pasta and friendly service. Will definitely return.', date: 'April 15, 2025' },
      { id: '3', user: 'David L.', rating: 5, comment: 'Best Italian food in the city. The tiramisu is to die for!', date: 'March 30, 2025' },
    ]
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons 
          key={i} 
          name={i <= rating ? "star" : i - 0.5 <= rating ? "star-half" : "star-outline"} 
          size={18} 
          color="#FFD700" 
          style={{ marginRight: 2 }}
        />
      );
    }
    return <View style={{ flexDirection: 'row' }}>{stars}</View>;
  };

  const renderTabContent = () => {
    switch(selectedTab) {
      case 'overview':
        return (
          <View>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.description}>{restaurant.description}</Text>
            
            <Text style={styles.sectionTitle}>Specialties</Text>
            <View style={styles.specialtiesContainer}>
              {restaurant.specialties.map((item, index) => (
                <View key={index} style={styles.specialtyItem}>
                  <Ionicons name="restaurant-outline" size={16} color="#1a1a1a" />
                  <Text style={styles.specialtyText}>{item}</Text>
                </View>
              ))}
            </View>
            
            <Text style={styles.sectionTitle}>Hours</Text>
            {restaurant.hours.map((timeSlot, index) => (
              <View key={index} style={styles.hoursRow}>
                <Text style={styles.hoursDay}>{timeSlot.day}</Text>
                <Text style={styles.hoursTime}>{timeSlot.hours}</Text>
              </View>
            ))}
            
            <Text style={styles.sectionTitle}>Contact</Text>
            <View style={styles.contactItem}>
              <Ionicons name="location-outline" size={18} color="#1a1a1a" />
              <Text style={styles.contactText}>{restaurant.address}</Text>
            </View>
            <View style={styles.contactItem}>
              <Ionicons name="call-outline" size={18} color="#1a1a1a" />
              <Text style={styles.contactText}>{restaurant.phone}</Text>
            </View>
          </View>
        );
      case 'menu':
        return (
          <View>
            {restaurant.menuSections.map((section, index) => (
              <View key={index} style={styles.menuSection}>
                <Text style={styles.menuSectionTitle}>{section.name}</Text>
                {section.items.map((item, itemIndex) => (
                  <View key={itemIndex} style={styles.menuItem}>
                    <View style={styles.menuItemHeader}>
                      <Text style={styles.menuItemName}>{item.name}</Text>
                      <Text style={styles.menuItemPrice}>{item.price}</Text>
                    </View>
                    <Text style={styles.menuItemDescription}>{item.description}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        );
      case 'reviews':
        return (
          <View>
            <View style={styles.reviewSummary}>
              <Text style={styles.reviewRating}>{restaurant.rating}</Text>
              {renderStars(restaurant.rating)}
              <Text style={styles.reviewCount}>Based on {restaurant.reviews} reviews</Text>
            </View>
            
            {restaurant.reviewsList.map((review) => (
              <View key={review.id} style={styles.reviewItem}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewerName}>{review.user}</Text>
                  <Text style={styles.reviewDate}>{review.date}</Text>
                </View>
                <View style={styles.reviewStars}>
                  {renderStars(review.rating)}
                </View>
                <Text style={styles.reviewComment}>{review.comment}</Text>
              </View>
            ))}
            
            <TouchableOpacity style={styles.seeAllReviews}>
              <Text style={styles.seeAllReviewsText}>See all {restaurant.reviews} reviews</Text>
            </TouchableOpacity>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Restaurant Images Carousel */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: restaurant.images[0] }} style={styles.restaurantImage} />
          
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.favoriteButton} 
            onPress={() => setIsFavorite(!isFavorite)}
          >
            <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={24} color={isFavorite ? "#FF6B6B" : "#fff"} />
          </TouchableOpacity>
          
          <View style={styles.imageIndicator}>
            <View style={[styles.indicatorDot, styles.activeDot]} />
            <View style={styles.indicatorDot} />
            <View style={styles.indicatorDot} />
          </View>
        </View>
        
        {/* Restaurant Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.restaurantName}>{restaurant.name}</Text>
          
          <View style={styles.ratingContainer}>
            {renderStars(restaurant.rating)}
            <Text style={styles.ratingText}>{restaurant.rating} ({restaurant.reviews} reviews)</Text>
          </View>
          
          <View style={styles.tagsContainer}>
            <View style={styles.tagItem}>
              <Text style={styles.tagText}>{restaurant.cuisine}</Text>
            </View>
            <View style={styles.tagItem}>
              <Text style={styles.tagText}>{restaurant.priceRange}</Text>
            </View>
          </View>
        </View>
        
        {/* Action Buttons */}
        <View style={styles.actionContainer} >
          <TouchableOpacity style={styles.reserveButton} onPress={()=> router.push("/reservation")}>
            <Text style={styles.reserveButtonText}>Reserve a Table</Text>
          </TouchableOpacity>
        </View>
        
        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tabItem, selectedTab === 'overview' && styles.selectedTab]}
            onPress={() => setSelectedTab('overview')}
          >
            <Text style={[styles.tabText, selectedTab === 'overview' && styles.selectedTabText]}>Overview</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tabItem, selectedTab === 'menu' && styles.selectedTab]}
            onPress={() => setSelectedTab('menu')}
          >
            <Text style={[styles.tabText, selectedTab === 'menu' && styles.selectedTabText]}>Menu</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tabItem, selectedTab === 'reviews' && styles.selectedTab]}
            onPress={() => setSelectedTab('reviews')}
          >
            <Text style={[styles.tabText, selectedTab === 'reviews' && styles.selectedTabText]}>Reviews</Text>
          </TouchableOpacity>
        </View>
        
        {/* Tab Content */}
        <View style={styles.contentContainer}>
          {renderTabContent()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  imageContainer: {
    position: 'relative',
    height: 250,
  },
  restaurantImage: {
    width: '100%',
    height: '100%',
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageIndicator: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#FFFFFF',
  },
  infoContainer: {
    padding: 16,
  },
  restaurantName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  tagItem: {
    backgroundColor: '#e8f0ed',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  tagText: {
    fontSize: 12,
    color: '#1a1a1a',
  },
  actionContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  reserveButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  reserveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  selectedTab: {
    borderBottomColor: '#1a1a1a',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  selectedTabText: {
    color: '#1a1a1a',
    fontWeight: '600',
  },
  contentContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginTop: 16,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: '#444',
    marginBottom: 16,
  },
  specialtiesContainer: {
    marginBottom: 16,
  },
  specialtyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  specialtyText: {
    fontSize: 14,
    color: '#444',
    marginLeft: 8,
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  hoursDay: {
    fontSize: 14,
    color: '#444',
  },
  hoursTime: {
    fontSize: 14,
    color: '#444',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  contactText: {
    fontSize: 14,
    color: '#444',
    marginLeft: 8,
  },
  menuSection: {
    marginBottom: 24,
  },
  menuSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  menuItem: {
    marginBottom: 16,
  },
  menuItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  menuItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  menuItemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  menuItemDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  reviewSummary: {
    alignItems: 'center',
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  reviewRating: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  reviewCount: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  reviewItem: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  reviewDate: {
    fontSize: 12,
    color: '#888',
  },
  reviewStars: {
    marginBottom: 8,
  },
  reviewComment: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
  },
  seeAllReviews: {
    padding: 16,
    alignItems: 'center',
  },
  seeAllReviewsText: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '600',
  },
});

export default Details;