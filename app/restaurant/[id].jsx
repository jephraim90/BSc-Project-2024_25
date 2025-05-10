import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Platform,
  Alert,
  FlatList,
} from "react-native";
import React, { useState, useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import RestaurantService from "@/services/restaurantService";
import favouritesService from "@/services/favouritesService";
import reviewService from "@/services/reviewService";
import { getAuth, onAuthStateChanged } from "firebase/auth";

const RestaurantDetails = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [isFavorite, setIsFavorite] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [userReview, setUserReview] = useState(null);
  const [isOwner, setIsOwner] = useState(false);

  const showPlatformAlert = (
    title,
    message,
    confirmAction,
    cancelAction = () => {}
  ) => {
    if (Platform.OS === "web") {
      if (confirmAction) {
        const isConfirmed = window.confirm(`${title}\n\n${message}`);
        isConfirmed ? confirmAction() : cancelAction();
      } else {
        window.alert(`${title}\n\n${message}`);
      }
    } else {
      if (confirmAction) {
        Alert.alert(
          title,
          message,
          [
            {
              text: "Cancel",
              style: "cancel",
              onPress: cancelAction,
            },
            {
              text: "OK",
              onPress: confirmAction,
            },
          ],
          { cancelable: false }
        );
      } else {
        Alert.alert(title, message);
      }
    }
  };
  // Check if the user is the owner of the restaurant
  useEffect(() => {
    const checkOwnership = () => {
      if (isAuthenticated && restaurant) {
        const auth = getAuth();
        const user = auth.currentUser;
        setIsOwner(user && restaurant.ownerId === user.uid);
      } else {
        setIsOwner(false);
      }
    };

    checkOwnership();
  }, [isAuthenticated, restaurant]);
  // Check authentication status
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user); // Convert user object to boolean
    });
    return () => unsubscribe(); // Cleanup on unmount
  }, []);

  // Fetch restaurant details
  useEffect(() => {
    const fetchRestaurantDetails = async () => {
      try {
        // console.log("Fetching restaurant with ID:", id);
        setLoading(true);
        const result = await RestaurantService.getRestaurantById(id);
        // console.log("Restaurant fetch result:", result);

        if (result && result.data) {
          // console.log("Setting restaurant data:", result.data);
          setRestaurant(result.data);
        } else {
          console.log("Restaurant data not found in result");
        }
      } catch (error) {
        console.log("Error fetching restaurant details:", error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchRestaurantDetails();
    }
  }, [id]);

  // Check favorite status when authenticated and restaurant ID is available
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (isAuthenticated && id) {
        try {
          const favoriteStatus = await favouritesService.checkIsFavorite(id);
          setIsFavorite(favoriteStatus.isFavorite);
        } catch (error) {
          console.log("Error checking favorite status:", error);
        }
      }
    };

    checkFavoriteStatus();
  }, [isAuthenticated, id]);

  // Fetch reviews for this restaurant
  useEffect(() => {
    const fetchReviews = async () => {
      if (id && activeTab === "reviews") {
        try {
          setReviewsLoading(true);
          const result = await reviewService.getRestaurantReviews(id);

          if (result.success) {
            setReviews(result.data);
          }

          // If authenticated, check if user has reviewed this restaurant
          if (isAuthenticated) {
            const userReviewResult =
              await reviewService.getUserReviewForRestaurant(id);
            if (userReviewResult.success && userReviewResult.data) {
              setUserReview(userReviewResult.data);
            } else {
              setUserReview(null);
            }
          }
        } catch (error) {
          console.log("Error fetching reviews:", error);
        } finally {
          setReviewsLoading(false);
        }
      }
    };

    fetchReviews();
  }, [id, activeTab, isAuthenticated]);

  const handleToggleFavorite = async () => {
    // If not authenticated, prompt to login
    if (!isAuthenticated) {
      showPlatformAlert(
        "Login Required",
        "Please login to save favorites",
        () => router.push("/auth"),
        () => {} // Cancel handler
      );
      return;
    }

    try {
      setFavoriteLoading(true);
      const result = await favouritesService.toggleFavorite(id);

      if (result.success) {
        setIsFavorite(result.isFavorite);
        // Show platform-appropriate feedback
        showPlatformAlert(
          result.isFavorite ? "Added to favorites" : "Removed from favorites",
          "",
          null // No confirmation needed
        );
      } else {
        console.log("Error toggling favorite:", result.error);
        showPlatformAlert("Error", "Could not update favorites");
      }
    } catch (error) {
      console.log("Error in favorite toggle:", error);
      showPlatformAlert("Error", "Could not update favorites");
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleWriteReview = () => {
    if (isOwner) {
      showPlatformAlert(
        "Cannot Review Own Restaurant",
        "As the owner, you cannot review your own restaurant."
      );
      return;
    }

    if (!isAuthenticated) {
      showPlatformAlert(
        "Login Required",
        "Please login to write a review",
        () => router.push("/login"),
        () => {} // Cancel handler
      );
      return;
    }

    router.push(`/review/create?restaurantId=${id}`);
  };
  const handleDeleteReview = async (reviewId) => {
    showPlatformAlert(
      "Delete Review",
      "Are you sure you want to delete your review?",
      async () => {
        try {
          const result = await reviewService.deleteReview(reviewId);

          if (result.success) {
            // Refresh restaurant data to update rating
            const restaurantResult = await RestaurantService.getRestaurantById(
              id
            );
            if (restaurantResult && restaurantResult.data) {
              setRestaurant(restaurantResult.data);
            }

            // Refresh reviews
            const reviewsResult = await reviewService.getRestaurantReviews(id);
            if (reviewsResult.success) {
              setReviews(reviewsResult.data);
            }

            setUserReview(null);
            showPlatformAlert("Success", "Your review has been deleted");
          } else {
            showPlatformAlert("Error", "Failed to delete your review");
          }
        } catch (error) {
          console.log("Error deleting review:", error);
          showPlatformAlert("Error", "Failed to delete your review");
        }
      }
    );
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;

    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push(
          <Ionicons
            key={i}
            name="star"
            size={18}
            color="#FFD700"
            style={{ marginRight: 2 }}
          />
        );
      } else if (i === fullStars + 1 && halfStar) {
        stars.push(
          <Ionicons
            key={i}
            name="star-half"
            size={18}
            color="#FFD700"
            style={{ marginRight: 2 }}
          />
        );
      } else {
        stars.push(
          <Ionicons
            key={i}
            name="star-outline"
            size={18}
            color="#FFD700"
            style={{ marginRight: 2 }}
          />
        );
      }
    }

    return (
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {stars}
      </View>
    );
  };

  const renderReviewItem = ({ item }) => {
    const isUserReview = userReview && item.id === userReview.id;

    // Define a default formatted date
    let formattedDate = "Unknown date";

    if (item.createdAt) {
      try {
        let date;

        // Check if it's a Firestore Timestamp object
        if (
          item.createdAt &&
          typeof item.createdAt === "object" &&
          "seconds" in item.createdAt &&
          "nanoseconds" in item.createdAt
        ) {
          // Convert Firestore Timestamp to JavaScript Date
          date = new Date(item.createdAt.seconds * 1000);
        } else {
          // Try normal date parsing if it's not a Firestore Timestamp
          date = new Date(item.createdAt);
        }

        // Check if date is valid after our attempts
        if (!isNaN(date.getTime())) {
          formattedDate = `${date.toLocaleDateString()} at ${date.toLocaleTimeString(
            [],
            { hour: "2-digit", minute: "2-digit" }
          )}`;
        } else {
          // If we still don't have a valid date, show a fallback
          formattedDate = "Date not available";
        }
      } catch (error) {
        console.log("Error formatting date:", error);
        formattedDate = "Date not available";
      }
    }

    return (
      <View style={[styles.reviewItem, isUserReview && styles.userReviewItem]}>
        <View style={styles.reviewHeader}>
          <View>
            <Text style={styles.reviewTitle}>{item.title}</Text>
            <View style={styles.reviewRatingRow}>
              {renderStars(item.rating)}
              <Text style={styles.reviewerName}>
                by {item.userDisplayName || "Anonymous"}
              </Text>
            </View>
          </View>

          {isUserReview && (
            <View style={styles.reviewActions}>
              <TouchableOpacity
                onPress={() =>
                  router.push(`/review/create?restaurantId=${id}&edit=true`)
                }
                style={styles.editButton}
              >
                <Ionicons name="pencil" size={18} color="#666" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDeleteReview(item.id)}
                style={styles.deleteButton}
              >
                <Ionicons name="trash" size={18} color="#666" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <Text style={styles.reviewDate}>{formattedDate}</Text>
        <Text style={styles.reviewText}>{item.text}</Text>
      </View>
    );
  };
  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color="#007aff" />
        <Text style={{ marginTop: 10 }}>Loading restaurant details...</Text>
      </View>
    );
  }

  if (!restaurant) {
    return (
      <View style={styles.errorContainer}>
        <Text>Restaurant not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.description}>{restaurant.description}</Text>

            <Text style={styles.sectionTitle}>Specialties</Text>
            <View style={styles.specialtiesContainer}>
              {restaurant.specialties?.map((specialty, index) => (
                <View key={index} style={styles.specialtyItem}>
                  <Ionicons
                    name="restaurant-outline"
                    size={16}
                    color="#1a1a1a"
                  />
                  <Text style={styles.specialtyText}>{specialty}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Hours</Text>
            {restaurant.hours?.map((timeSlot, index) => (
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
      case "menu":
        return (
          <View style={styles.tabContent}>
            {restaurant.menuSections?.length > 0 ? (
              restaurant.menuSections.map((section, sectionIndex) => (
                <View key={sectionIndex} style={styles.menuSection}>
                  <Text style={styles.menuSectionTitle}>{section.name}</Text>
                  {section.items?.map((item, itemIndex) => (
                    <View key={itemIndex} style={styles.menuItem}>
                      <View style={styles.menuItemHeader}>
                        <Text style={styles.menuItemName}>{item.name}</Text>
                        <Text style={styles.menuItemPrice}>{item.price}</Text>
                      </View>
                      <Text style={styles.menuItemDescription}>
                        {item.description}
                      </Text>
                    </View>
                  ))}
                </View>
              ))
            ) : (
              <Text style={styles.emptyStateText}>
                Menu information coming soon!
              </Text>
            )}
          </View>
        );
      case "reviews":
        return (
          <View style={styles.tabContent}>
            <View style={styles.reviewSummary}>
              <Text style={styles.reviewRatingLarge}>
                {restaurant.rating ? restaurant.rating.toFixed(1) : "0.0"}
              </Text>
              {renderStars(restaurant.rating || 0)}
              <Text style={styles.reviewCount}>
                Based on {restaurant.reviews || 0}{" "}
                {restaurant.reviews === 1 ? "review" : "reviews"}
              </Text>
            </View>

            {reviewsLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#007aff" />
                <Text style={{ marginTop: 10 }}>Loading reviews...</Text>
              </View>
            ) : reviews.length > 0 ? (
              <FlatList
                data={reviews}
                renderItem={renderReviewItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                style={styles.reviewsList}
              />
            ) : (
              <Text style={styles.emptyStateText}>
                No reviews yet. Be the first to review!
              </Text>
            )}

            {!isOwner && (
              <TouchableOpacity
                style={styles.writeReviewButton}
                onPress={handleWriteReview}
              >
                <Text style={styles.writeReviewButtonText}>
                  {userReview ? "Edit Your Review" : "Write a Review"}
                </Text>
              </TouchableOpacity>
            )}
            {isOwner && (
              <View style={styles.ownerMessageContainer}>
                <Text style={styles.ownerMessageText}>
                  As the owner, you cannot review your own restaurant.
                </Text>
              </View>
            )}
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
          <Image
            source={{
              uri:
                restaurant.images?.[0] ||
                "https://via.placeholder.com/400x200?text=No+Image",
            }}
            style={styles.restaurantImage}
          />

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={handleToggleFavorite}
            disabled={favoriteLoading}
          >
            {favoriteLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons
                name={isFavorite ? "heart" : "heart-outline"}
                size={24}
                color={isFavorite ? "#FF6B6B" : "#fff"}
              />
            )}
          </TouchableOpacity>
        </View>

        {/* Restaurant Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.restaurantName}>{restaurant.name}</Text>

          <View style={styles.ratingContainer}>
            {renderStars(restaurant.rating || 0)}
            <Text style={styles.ratingText}>
              {restaurant.rating ? restaurant.rating.toFixed(1) : "0.0"} (
              {restaurant.reviews || 0}{" "}
              {restaurant.reviews === 1 ? "review" : "reviews"})
            </Text>
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
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.reserveButton}
            onPress={() => router.push(`/EnhancedRes/${id}`)}
          >
            <Text style={styles.reserveButtonText}>Reserve a Table</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tabItem,
              activeTab === "overview" && styles.selectedTab,
            ]}
            onPress={() => setActiveTab("overview")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "overview" && styles.selectedTabText,
              ]}
            >
              Overview
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === "menu" && styles.selectedTab]}
            onPress={() => setActiveTab("menu")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "menu" && styles.selectedTabText,
              ]}
            >
              Menu
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabItem,
              activeTab === "reviews" && styles.selectedTab,
            ]}
            onPress={() => setActiveTab("reviews")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "reviews" && styles.selectedTabText,
              ]}
            >
              Reviews
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {renderTabContent()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  backLink: {
    marginTop: 16,
    color: "#1a1a1a",
    fontWeight: "500",
    fontSize: 16,
  },
  imageContainer: {
    position: "relative",
    height: 250,
  },
  restaurantImage: {
    width: "100%",
    height: "100%",
  },
  backButton: {
    position: "absolute",
    top: 16,
    left: 16,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  favoriteButton: {
    position: "absolute",
    top: 16,
    right: 16,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  infoContainer: {
    padding: 16,
  },
  restaurantName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  ratingText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
  },
  tagsContainer: {
    flexDirection: "row",
    marginBottom: 16,
  },
  tagItem: {
    backgroundColor: "#e8f0ed",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  tagText: {
    fontSize: 12,
    color: "#1a1a1a",
  },
  actionContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  reserveButton: {
    backgroundColor: "#1a1a1a",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  reserveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  tabContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  tabItem: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  selectedTab: {
    borderBottomColor: "#1a1a1a",
  },
  tabText: {
    fontSize: 14,
    color: "#666",
  },
  selectedTabText: {
    color: "#1a1a1a",
    fontWeight: "600",
  },
  tabContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    marginTop: 16,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: "#444",
    marginBottom: 16,
  },
  specialtiesContainer: {
    marginBottom: 16,
  },
  specialtyItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  specialtyText: {
    fontSize: 14,
    color: "#444",
    marginLeft: 8,
  },
  hoursRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  hoursDay: {
    fontSize: 14,
    color: "#444",
  },
  hoursTime: {
    fontSize: 14,
    color: "#444",
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  contactText: {
    fontSize: 14,
    color: "#444",
    marginLeft: 8,
  },
  menuSection: {
    marginBottom: 24,
  },
  menuSectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 12,
  },
  menuItem: {
    marginBottom: 16,
  },
  menuItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  menuItemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  menuItemPrice: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  menuItemDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  reviewSummary: {
    alignItems: "center",
    marginBottom: 24,
    padding: 16,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
  },
  reviewRating: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  reviewCount: {
    marginTop: 8,
    fontSize: 14,
    color: "#666",
  },
  emptyStateText: {
    textAlign: "center",
    fontSize: 16,
    color: "#666",
    marginVertical: 24,
  },
  writeReviewButton: {
    backgroundColor: "#1a1a1a",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 16,
  },
  writeReviewButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default RestaurantDetails;
