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
  RefreshControl,
  Platform,
  Alert
} from "react-native";
import React, { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import favouritesService from "@/services/favouritesService";
import RestaurantService from "@/services/restaurantService";

const Favourites = () => {
  const router = useRouter();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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
      if (!user) {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Fetch favorites
  const fetchFavorites = async () => {
    if (!isAuthenticated) return;
    
    try {
      setLoading(true);
      const favoritesResult = await favouritesService.getUserFavorites();
      
      if (favoritesResult.success && favoritesResult.data.length > 0) {
        // Fetch full restaurant details for each favorite
        const favoriteRestaurants = await Promise.all(
          favoritesResult.data.map(async (favorite) => {
            try {
              const restaurantResult = await RestaurantService.getRestaurantById(favorite.restaurantId);
              if (restaurantResult && restaurantResult.success && restaurantResult.data) {
                return {
                  ...restaurantResult.data,
                  favoriteId: favorite.id
                };
              }
              return null;
            } catch (error) {
              console.log(`Error fetching restaurant ${favorite.restaurantId}:`, error);
              return null;
            }
          })
        );
        
        // Filter out any null results
        setFavorites(favoriteRestaurants.filter(restaurant => restaurant !== null));
      } else {
        setFavorites([]);
      }
    } catch (error) {
      console.log('Error fetching favorites:', error);
      showPlatformAlert('Error', 'Failed to load favorites');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch favorites when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchFavorites();
    }
  }, [isAuthenticated]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchFavorites();
  };

  const handleRemoveFavorite = async (restaurantId) => {
    try {
      const result = await favouritesService.removeFavorite(restaurantId);
      if (result.success) {
        // Remove from state without refetching
        setFavorites(currentFavorites => 
          currentFavorites.filter(restaurant => restaurant.id !== restaurantId)
        );
        showPlatformAlert('Success', 'Removed from favorites');
      } else {
        console.log('Error removing favorite:', result.error);
        showPlatformAlert('Error', 'Could not remove from favorites');
      }
    } catch (error) {
      console.log('Error removing favorite:', error);
      showPlatformAlert('Error', 'Could not remove from favorites');
    }
  };

  const handleNavigateToRestaurant = (restaurantId) => {
    router.push(`/restaurant/${restaurantId}`);
  };

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
    <TouchableOpacity 
      style={styles.favoriteItem}
      onPress={() => handleNavigateToRestaurant(item.id)}
    >
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

      <Image 
        source={{ 
          uri: item.images?.[0] || "https://via.placeholder.com/400x200?text=No+Image" 
        }} 
        style={styles.restaurantImage} 
      />

      <View style={styles.restaurantInfo}>
        <Text style={styles.restaurantName}>{item.name}</Text>
        <Text style={styles.chefName}>{item.chef || item.cuisine}</Text>
        <View style={styles.ratingContainer}>{renderStars(item.rating)}</View>
        <Text numberOfLines={2} style={styles.description}>
          {item.description}
        </Text>
      </View>

      <TouchableOpacity 
        style={styles.favoriteButton}
        onPress={() => handleRemoveFavorite(item.id)}
      >
        <Ionicons name="heart" size={24} color="#FF6B6B" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  // If not authenticated, prompt to login
  if (!isAuthenticated && !loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.mainHeading}>Favorites</Text>
          <View style={styles.authContainer}>
            <Text style={styles.authMessage}>Please login to view your favorites</Text>
            <TouchableOpacity 
              style={styles.loginButton}
              onPress={() => router.push('/login')}
            >
              <Text style={styles.loginButtonText}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.mainHeading}>Favorites</Text>

        {loading ? (
          <View style={styles.centeredContainer}>
            <ActivityIndicator size="large" color="#007bff" />
          </View>
        ) : favorites.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="heart-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>You haven't added any favorites yet</Text>
            <TouchableOpacity 
              style={styles.browseButton}
              onPress={() => router.push('/')}
            >
              <Text style={styles.browseButtonText}>Browse Restaurants</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={favorites}
            renderItem={renderFavoriteItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={["#007bff"]}
                tintColor={"#007bff"}
              />
            }
          />
        )}
      </View>
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
    backgroundColor: "#FFD700", // Default gold color
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
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 100,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    marginTop: 16,
    marginBottom: 24,
    textAlign: "center",
  },
  browseButton: {
    backgroundColor: "#FF6B6B",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  browseButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  authContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 100,
  },
  authMessage: {
    fontSize: 16,
    color: "#666",
    marginBottom: 24,
    textAlign: "center",
  },
  loginButton: {
    backgroundColor: "#007bff",
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 8,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default Favourites;