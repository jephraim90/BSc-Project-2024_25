import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import React, { useState, useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import RestaurantService from "@/services/restaurantService";

const RestaurantDetails = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    const fetchRestaurantDetails = async () => {
      try {
        setLoading(true);
        const result = await RestaurantService.getRestaurantById(id);
        if (result) {
          setRestaurant(result);
        }
      } catch (error) {
        console.error("Error fetching restaurant details:", error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchRestaurantDetails();
    }
  }, [id]);

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
              <Text style={styles.reviewRating}>
                {restaurant.rating.toFixed(1)}
              </Text>
              {renderStars(restaurant.rating)}
              <Text style={styles.reviewCount}>
                Based on {restaurant.reviews} reviews
              </Text>
            </View>

            {/* display actual reviews here */}
            <Text style={styles.emptyStateText}>
              No reviews yet. Be the first to review!
            </Text>

            <TouchableOpacity style={styles.writeReviewButton}>
              <Text style={styles.writeReviewButtonText}>Write a Review</Text>
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
        {/* Restaurant Images Carousel (simplified) */}
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
            onPress={() => setIsFavorite(!isFavorite)}
          >
            <Ionicons
              name={isFavorite ? "heart" : "heart-outline"}
              size={24}
              color={isFavorite ? "#FF6B6B" : "#fff"}
            />
          </TouchableOpacity>
        </View>

        {/* Restaurant Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.restaurantName}>{restaurant.name}</Text>

          <View style={styles.ratingContainer}>
            {renderStars(restaurant.rating)}
            <Text style={styles.ratingText}>
              {restaurant.rating.toFixed(1)} ({restaurant.reviews} reviews)
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
