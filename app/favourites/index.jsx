import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from "react-native";
import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";

const FAVORITE_RESTAURANTS = [
  {
    id: "1",
    name: "La Trattoria Italiana",
    chef: "Marco Rossi",
    location: "Venice, Italy",
    rating: 5,
    description:
      "Traditional Italian cuisine with a focus on fresh seafood and homemade pasta.",
    image:
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80",
    badge: "Best Seller",
    badgeColor: "#FFD700",
  },
  {
    id: "2",
    name: "Le Petit Bistro",
    chef: "Sophie Dubois",
    location: "Paris, France",
    rating: 5,
    description:
      "Intimate French bistro serving classic dishes with a modern twist.",
    image:
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80",
    badge: null,
  },
  {
    id: "3",
    name: "Sakura Sushi",
    chef: "Hiroshi Tanaka",
    location: "Tokyo, Japan",
    rating: 5,
    description:
      "Authentic Japanese sushi prepared with the freshest ingredients.",
    image:
      "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80",
    badge: null,
  },
  {
    id: "4",
    name: "El Cantina",
    chef: "Carlos Mendez",
    location: "Mexico City, Mexico",
    rating: 4,
    description:
      "Vibrant Mexican cantina offering traditional street food and craft tequilas.",
    image:
      "https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80",
    badge: "Hot This Week",
    badgeColor: "#FF4136",
  },
  {
    id: "5",
    name: "The Spice Garden",
    chef: "Rajesh Patel",
    location: "Mumbai, India",
    rating: 5,
    description:
      "Authentic Indian cuisine featuring fragrant curries, fresh-baked naan, and house special tandoori dishes.",
    image:
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80",
    badge: "Most Popular",
    badgeColor: "#9370DB", 
  },
  {
    id: "6",
    name: "Mediterranean Haven",
    chef: "Elena Dimitriou",
    location: "Santorini, Greece",
    rating: 4,
    description:
      "Fresh Mediterranean flavors with emphasis on seafood, olive oils, and locally-sourced ingredients overlooking the Aegean Sea.",
    image:
      "https://images.unsplash.com/photo-1515668236457-83c3b8764839?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80",
    badge: "New Addition",
    badgeColor: "#20B2AA", 
  },
  {
    id: "7",
    name: "Texas Smokehouse",
    chef: "Bobby Johnson",
    location: "Austin, Texas",
    rating: 5,
    description:
      "Authentic American BBQ featuring slow-smoked brisket, fall-off-the-bone ribs, and all the classic Southern sides.",
    image:
      "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80",
    badge: null,
  },
];

const Favourites = () => {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [checkedAuth, setCheckedAuth] = React.useState(false);
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace("/auth");
      }
      setCheckedAuth(true);
    }
  }, [user, authLoading]);
  if (authLoading || !checkedAuth) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  } 

  if (user) {
    console.log("User Details:", user);
  }
  const renderStars = (rating) => {
    const stars = [];
    for (let i = 0; i < 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i < rating ? "star" : "star-outline"}
          size={16}
          color="#FFD700"
          style={{ marginRight: 2 }}
        />
      );
    }
    return <View style={{ flexDirection: "row" }}>{stars}</View>;
  };

  const renderFavoriteItem = ({ item }) => (
    <TouchableOpacity style={styles.favoriteItem}>
      {item.badge && (
        <View
          style={[
            styles.badgeContainer,
            { backgroundColor: item.badgeColor || "#FFD700" },
          ]}
        >
          <Text style={styles.badgeText}>{item.badge}</Text>
        </View>
      )}

      <Image source={{ uri: item.image }} style={styles.restaurantImage} />

      <View style={styles.restaurantInfo}>
        <Text style={styles.restaurantName}>{item.name}</Text>
        <Text style={styles.chefName}>{item.chef}</Text>
        <View style={styles.ratingContainer}>{renderStars(item.rating)}</View>
        <Text numberOfLines={2} style={styles.description}>
          {item.description}
        </Text>
      </View>

      <TouchableOpacity style={styles.favoriteButton}>
        <Ionicons name="heart" size={24} color="#6A0DAD" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.mainHeading}>Favorites</Text>

        <FlatList
          data={FAVORITE_RESTAURANTS}
          renderItem={renderFavoriteItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
        />
      </View>
    </SafeAreaView>
  );
};
export const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#e8f0ed",
  },
  container: {
    flex: 1,
    padding: 20,
  },
  mainHeading: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1a1a1a",
    marginBottom: 24,
  },
  listContainer: {
    paddingBottom: 20,
  },
  favoriteItem: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 16,
    padding: 12,
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  badgeContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    backgroundColor: "#FFD700", 
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderTopLeftRadius: 12,
    borderBottomRightRadius: 12,
    zIndex: 1,
  },
  badgeText: {
    color: "#000",
    fontSize: 10,
    fontWeight: "bold",
  },
  restaurantImage: {
    width: 80,
    height: 110,
    borderRadius: 8,
  },
  restaurantInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "center",
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  chefName: {
    fontSize: 14,
    color: "#666",
    marginBottom: 6,
  },
  ratingContainer: {
    flexDirection: "row",
    marginBottom: 6,
  },
  description: {
    fontSize: 13,
    color: "#888",
    lineHeight: 18,
  },
  favoriteButton: {
    alignSelf: "flex-start",
    padding: 4,
  },
});

export default Favourites;
