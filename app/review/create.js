import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Alert,
  } from "react-native";
  import React, { useState, useEffect } from "react";
  import { useLocalSearchParams, useRouter } from "expo-router";
  import { Ionicons } from "@expo/vector-icons";
  import { getAuth, onAuthStateChanged } from "firebase/auth";
  import RestaurantService from "@/services/restaurantService";
  import databaseService from "@/services/databaseService";
  
  const CreateReview = () => {
    const router = useRouter();
    const { restaurantId } = useLocalSearchParams();
    const [rating, setRating] = useState(0);
    const [reviewText, setReviewText] = useState("");
    const [title, setTitle] = useState("");
    const [loading, setLoading] = useState(false);
    const [restaurant, setRestaurant] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userId, setUserId] = useState(null);
    const [fetchingRestaurant, setFetchingRestaurant] = useState(true);
  
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
  
    // Check authentication status
    useEffect(() => {
      const auth = getAuth();
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setIsAuthenticated(!!user);
        if (user) {
          setUserId(user.uid);
        } else {
          // Not authenticated, redirect to login
          showPlatformAlert(
            "Login Required",
            "Please login to write a review",
            () => router.push("/login"),
            () => router.back()
          );
        }
      });
      return () => unsubscribe();
    }, []);
  
    // Fetch restaurant details
    useEffect(() => {
        const fetchRestaurantDetails = async () => {
          if (!restaurantId) return;
      
          try {
            setFetchingRestaurant(true);
            const result = await RestaurantService.getRestaurantById(restaurantId);
            if (result && result.data) {
              setRestaurant(result.data);
              
              // Check if current user is the owner of this restaurant
              const auth = getAuth();
              const user = auth.currentUser;
              
              if (user && result.data.ownerId === user.uid) {
                // User is the owner, redirect back with message
                showPlatformAlert(
                  "Cannot Review Own Restaurant",
                  "As the owner, you cannot review your own restaurant.",
                  () => router.back()
                );
              }
            } else {
              showPlatformAlert(
                "Error",
                "Restaurant not found",
                () => router.back()
              );
            }
          } catch (error) {
            console.log("Error fetching restaurant details:", error);
            showPlatformAlert(
              "Error",
              "Failed to load restaurant details",
              () => router.back()
            );
          } finally {
            setFetchingRestaurant(false);
          }
        };
      
        fetchRestaurantDetails();
      }, [restaurantId]);
  
    const handleRatingPress = (selectedRating) => {
      setRating(selectedRating);
    };
  
    const renderStars = () => {
      const stars = [];
      for (let i = 1; i <= 5; i++) {
        stars.push(
          <TouchableOpacity
            key={i}
            onPress={() => handleRatingPress(i)}
            style={styles.starContainer}
          >
            <Ionicons
              name={i <= rating ? "star" : "star-outline"}
              size={36}
              color="#FFD700"
            />
          </TouchableOpacity>
        );
      }
      return (
        <View style={styles.starsContainer}>
          {stars}
          <Text style={styles.ratingText}>
            {rating > 0 ? `${rating}.0/5.0` : "Select Rating"}
          </Text>
        </View>
      );
    };
  
    const validateReview = () => {
      if (rating === 0) {
        showPlatformAlert("Error", "Please select a rating");
        return false;
      }
  
      if (!title.trim()) {
        showPlatformAlert("Error", "Please add a review title");
        return false;
      }
  
      if (!reviewText.trim() || reviewText.length < 10) {
        showPlatformAlert("Error", "Please write a review (minimum 10 characters)");
        return false;
      }
  
      return true;
    };
  
    const submitReview = async () => {
      if (!validateReview()) return;
  
      try {
        setLoading(true);
  
        // Check if user has already reviewed this restaurant
        const existingReviewQuery = await databaseService.getDocuments("reviews", [
          databaseService.queries.where("userId", "==", userId),
          databaseService.queries.where("restaurantId", "==", restaurantId)
        ]);
  
        if (existingReviewQuery.success && existingReviewQuery.data.length > 0) {
          showPlatformAlert(
            "Already Reviewed",
            "You have already reviewed this restaurant. Would you like to update your review?",
            async () => {
              // Update existing review
              const existingReview = existingReviewQuery.data[0];
              const updateResult = await databaseService.updateDocument("reviews", existingReview.id, {
                rating: rating,
                title: title,
                text: reviewText,
                updatedAt: new Date().toISOString()
              });
  
              if (updateResult.success) {
                await updateRestaurantRating();
                showPlatformAlert(
                  "Success",
                  "Your review has been updated",
                  () => router.back()
                );
              } else {
                showPlatformAlert("Error", "Failed to update your review");
              }
              setLoading(false);
            },
            () => {
              setLoading(false);
            }
          );
          return;
        }
  
        // Create new review
        const reviewData = {
          userId: userId,
          restaurantId: restaurantId,
          restaurantName: restaurant.name,
          rating: rating,
          title: title,
          text: reviewText,
          createdAt: new Date().toISOString(),
          status: "published" // or "pending" if you want to review them before publishing
        };
  
        const result = await databaseService.createDocument("reviews", reviewData);
  
        if (result.success) {
          await updateRestaurantRating();
          showPlatformAlert(
            "Success",
            "Thank you for your review!",
            () => router.back()
          );
        } else {
          showPlatformAlert("Error", "Failed to submit your review");
        }
      } catch (error) {
        console.log("Error submitting review:", error);
        showPlatformAlert("Error", "Failed to submit your review");
      } finally {
        setLoading(false);
      }
    };
  
    const updateRestaurantRating = async () => {
      try {
        // Get all published reviews for this restaurant
        const reviewsQuery = await databaseService.getDocuments("reviews", [
          databaseService.queries.where("restaurantId", "==", restaurantId),
          databaseService.queries.where("status", "==", "published")
        ]);
  
        if (reviewsQuery.success) {
          const reviews = reviewsQuery.data;
          const reviewCount = reviews.length;
          
          // Calculate new average rating
          let totalRating = 0;
          reviews.forEach(review => {
            totalRating += review.rating;
          });
          
          const averageRating = reviewCount > 0 ? totalRating / reviewCount : 0;
          
          // Update restaurant document
          await databaseService.updateDocument("restaurants", restaurantId, {
            rating: parseFloat(averageRating.toFixed(1)),
            reviews: reviewCount,
            updatedAt: new Date().toISOString()
          });
        }
      } catch (error) {
        console.log("Error updating restaurant rating:", error);
      }
    };
  
    if (fetchingRestaurant) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007aff" />
          <Text style={styles.loadingText}>Loading restaurant details...</Text>
        </View>
      );
    }
  
    if (!restaurant) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Restaurant not found</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      );
    }
  
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.headerContainer}>
            <Text style={styles.restaurantName}>{restaurant.name}</Text>
            <Text style={styles.ratingLabel}>Tap to rate:</Text>
            {renderStars()}
          </View>
  
          <View style={styles.formContainer}>
            <Text style={styles.label}>Review Title</Text>
            <TextInput
              style={styles.titleInput}
              placeholder="Summarize your experience"
              value={title}
              onChangeText={setTitle}
              maxLength={50}
            />
            <Text style={styles.charCount}>{title.length}/50</Text>
  
            <Text style={styles.label}>Your Review</Text>
            <TextInput
              style={styles.reviewInput}
              placeholder="Tell others about your experience"
              value={reviewText}
              onChangeText={setReviewText}
              multiline
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={styles.charCount}>{reviewText.length}/500</Text>
  
            <TouchableOpacity
              style={[styles.submitButton, (loading || rating === 0) && styles.disabledButton]}
              onPress={submitReview}
              disabled={loading || rating === 0}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Review</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  };
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#FFFFFF",
    },
    scrollContainer: {
      padding: 16,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    loadingText: {
      marginTop: 10,
      fontSize: 16,
      color: "#666",
    },
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    errorText: {
      fontSize: 18,
      color: "#666",
      marginBottom: 16,
    },
    backButton: {
      paddingVertical: 10,
      paddingHorizontal: 20,
      backgroundColor: "#f0f0f0",
      borderRadius: 8,
    },
    backButtonText: {
      fontSize: 16,
      color: "#1a1a1a",
    },
    headerContainer: {
      marginBottom: 24,
    },
    restaurantName: {
      fontSize: 24,
      fontWeight: "700",
      color: "#1a1a1a",
      marginBottom: 16,
      textAlign: "center",
    },
    ratingLabel: {
      fontSize: 16,
      color: "#666",
      marginBottom: 8,
      textAlign: "center",
    },
    starsContainer: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 8,
    },
    starContainer: {
      padding: 5,
    },
    ratingText: {
      position: "absolute",
      bottom: -25,
      fontSize: 14,
      color: "#666",
    },
    formContainer: {
      paddingTop: 24,
    },
    label: {
      fontSize: 16,
      fontWeight: "600",
      color: "#1a1a1a",
      marginBottom: 8,
    },
    titleInput: {
      borderWidth: 1,
      borderColor: "#ddd",
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 16,
      marginBottom: 4,
    },
    reviewInput: {
      borderWidth: 1,
      borderColor: "#ddd",
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 16,
      minHeight: 150,
      marginBottom: 4,
    },
    charCount: {
      fontSize: 12,
      color: "#999",
      textAlign: "right",
      marginBottom: 16,
    },
    submitButton: {
      backgroundColor: "#1a1a1a",
      paddingVertical: 14,
      borderRadius: 8,
      alignItems: "center",
      marginTop: 16,
    },
    disabledButton: {
      backgroundColor: "#cccccc",
    },
    submitButtonText: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "600",
    },
  });
  
  export default CreateReview;