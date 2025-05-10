import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import databaseService from '@/services/databaseService';
import reviewService from '@/services/reviewService';
import RestaurantService from '@/services/restaurantService';

const ReviewsScreen = () => {
  const router = useRouter();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState('user'); // Default to 'user' role
  const [restaurantNames, setRestaurantNames] = useState({}); // Map of restaurant IDs to names

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        
        // Get user role
        try {
          const userDoc = await databaseService.getDocumentById('users', currentUser.uid);
          if (userDoc.success && userDoc.data) {
            setUserRole(userDoc.data.role || 'user');
          }
        } catch (error) {
          console.log('Error fetching user role:', error);
        }
      } else {
        router.replace('/login');
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      fetchReviews();
    }
  }, [user, userRole]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      let reviewsData = [];
      
      if (userRole === 'owner') {
        // For restaurant owners, fetch reviews for all their restaurants
        const restaurantsResult = await RestaurantService.getRestaurantsByOwnerId(user.uid);
        
        if (restaurantsResult && restaurantsResult.length > 0) {
          // Create restaurant name mapping
          const nameMap = {};
          restaurantsResult.forEach(restaurant => {
            nameMap[restaurant.id] = restaurant.name;
          });
          setRestaurantNames(nameMap);
          
          // Get restaurant IDs
          const restaurantIds = restaurantsResult.map(restaurant => restaurant.id);
          
          // Fetch reviews for each restaurant
          const reviewsPromises = restaurantIds.map(async (restaurantId) => {
            const result = await reviewService.getRestaurantReviews(restaurantId, 100);
            return result.success ? result.data : [];
          });
          
          const reviewsArrays = await Promise.all(reviewsPromises);
          reviewsData = reviewsArrays.flat();
        }
      } else {
        // For regular users, fetch their own reviews
        const result = await reviewService.getUserReviews();
        reviewsData = result.success ? result.data : [];
        
        // Fetch restaurant details for user's reviews
        if (reviewsData.length > 0) {
          const restaurantIds = [...new Set(reviewsData.map(review => review.restaurantId))];
          const nameMap = {};
          
          await Promise.all(restaurantIds.map(async (restaurantId) => {
            try {
              const restaurant = await RestaurantService.getRestaurantById(restaurantId);
              if (restaurant.success && restaurant.data) {
                nameMap[restaurantId] = restaurant.data.name;
              }
            } catch (error) {
              console.log(`Error fetching restaurant ${restaurantId}:`, error);
            }
          }));
          
          setRestaurantNames(nameMap);
        }
      }
      
      // Sort reviews by date (newest first)
      reviewsData.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return dateB - dateA;
      });
      
      setReviews(reviewsData);
    } catch (error) {
      console.log('Error fetching reviews:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchReviews();
  };

  const handleDeleteReview = async (reviewId, restaurantId) => {
    try {
      const result = await reviewService.deleteReview(reviewId);
      if (result.success) {
        // Remove the review from the list
        setReviews(currentReviews => currentReviews.filter(review => review.id !== reviewId));
      }
    } catch (error) {
      console.log('Error deleting review:', error);
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= rating ? "star" : "star-outline"}
          size={16}
          color="#FFD700"
          style={{ marginRight: 2 }}
        />
      );
    }
    return <View style={{ flexDirection: "row" }}>{stars}</View>;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "No date";
    
    try {
      let date;
      
      // Check if it's a Firestore Timestamp object
      if (dateString && 
          typeof dateString === 'object' && 
          'seconds' in dateString && 
          'nanoseconds' in dateString) {
        
        date = new Date(dateString.seconds * 1000);
      } else {
        date = new Date(dateString);
      }
      
      if (isNaN(date.getTime())) {
        return dateString.toString();
      }
      
      return `${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch (error) {
      console.log("Error formatting date:", error);
      return dateString.toString();
    }
  };

  const renderReviewItem = ({ item }) => {
    const isUserReview = item.userId === user?.uid;
    const restaurantName = restaurantNames[item.restaurantId] || item.restaurantName || "Unknown Restaurant";
    
    return (
      <View style={styles.reviewItem}>
        <View style={styles.reviewHeader}>
          <View>
            <TouchableOpacity 
              onPress={() => router.push(`/restaurant/${item.restaurantId}`)}
              style={styles.restaurantNameContainer}
            >
              <Text style={styles.restaurantName}>{restaurantName}</Text>
              <Ionicons name="chevron-forward" size={16} color="#666" />
            </TouchableOpacity>
            <Text style={styles.reviewTitle}>{item.title}</Text>
            <View style={styles.reviewRatingRow}>
              {renderStars(item.rating)}
              <Text style={styles.reviewerName}>
                {userRole === 'owner' ? `by ${item.userDisplayName || "Anonymous"}` : ''}
              </Text>
            </View>
          </View>
          
          {isUserReview && (
            <View style={styles.reviewActions}>
              <TouchableOpacity 
                onPress={() => router.push(`/review/create?restaurantId=${item.restaurantId}&edit=true`)}
                style={styles.editButton}
              >
                <Ionicons name="pencil" size={18} color="#666" />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => handleDeleteReview(item.id, item.restaurantId)}
                style={styles.deleteButton}
              >
                <Ionicons name="trash" size={18} color="#666" />
              </TouchableOpacity>
            </View>
          )}
        </View>
        
        <Text style={styles.reviewDate}>{formatDate(item.createdAt)}</Text>
        <Text style={styles.reviewText}>{item.text}</Text>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <Text style={styles.headerTitle}>
        {userRole === 'owner' ? 'Restaurant Reviews' : 'My Reviews'}
      </Text>
      <Text style={styles.headerSubtitle}>
        {userRole === 'owner' 
          ? 'Reviews from all your restaurants' 
          : 'Your restaurant reviews'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={reviews}
        renderItem={renderReviewItem}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#007bff"]}
            tintColor={"#007bff"}
          />
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007aff" />
              <Text style={styles.loadingText}>Loading reviews...</Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="star-outline" size={64} color="#ddd" />
              <Text style={styles.emptyText}>
                {userRole === 'owner' 
                  ? "No reviews for your restaurants yet" 
                  : "You haven't written any reviews yet"}
              </Text>
              {userRole !== 'owner' && (
                <TouchableOpacity 
                  style={styles.exploreButton}
                  onPress={() => router.push('/')}
                >
                  <Text style={styles.exploreButtonText}>Explore Restaurants</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  headerContainer: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  reviewItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  restaurantNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  restaurantName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007aff',
    marginRight: 4,
  },
  reviewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 6,
  },
  reviewRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewerName: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  reviewDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  reviewText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#444',
  },
  reviewActions: {
    flexDirection: 'row',
  },
  editButton: {
    padding: 6,
    marginRight: 8,
  },
  deleteButton: {
    padding: 6,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 16,
    marginBottom: 24,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  exploreButton: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  exploreButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ReviewsScreen;