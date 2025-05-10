import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import RestaurantService from "@/services/restaurantService";
import databaseService from '@/services/databaseService';
import { where } from "firebase/firestore";
import RestaurantReservations from "@/components/RestaurantReservations";

const Profile = () => {
  const router = useRouter();
  const { user, loading: authLoading,logout } = useAuth();
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
        <ActivityIndicator size="large" color="#1a1a1a" />
      </View>
    );
  }

  const handleLogout = async () => {
    console.log("handleLogout function called");
    await logout();
    router.replace("/auth");
  };
  // Function to render content based on user role
  const renderRoleBasedContent = () => {
    switch (user?.role) {
      case "admin":
        return <AdminContent user={user} handleLogout={handleLogout} />; // Pass handleLogout
      case "owner":
        return <OwnerContent user={user} handleLogout={handleLogout} />; // Pass handleLogout
      case "user":
      default:
        return <UserContent user={user} handleLogout={handleLogout} />; // Pass handleLogout
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.profileHeader}>
        <View style={styles.profileImageContainer}>
          <Text style={styles.profileImagePlaceholder}>
            {user?.email?.charAt(0).toUpperCase() || "U"}
          </Text>
        </View>
        <Text style={styles.welcomeText}>Welcome, {user?.email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>
            {user?.role?.toUpperCase() || "USER"}
          </Text>
        </View>
      </View>

      {renderRoleBasedContent()}
    </ScrollView>
  );
};

// Admin-specific content component
const AdminContent = ({ user,handleLogout }) => {
  const router = useRouter();
  const [stats, setStats] = useState({
    restaurants: 0,
    users: 0,
    reservations: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminStats = async () => {
      if (!user || user.role !== 'admin') return;
      
      setLoading(true);
      try {
        // Get collection counts
        const restaurantsResult = await databaseService.getDocuments('restaurants');
        const usersResult = await databaseService.getDocuments('users');
        const reservationsResult = await databaseService.getDocuments('reservations', [
          where('status', '!=', 'cancelled')
        ]);
        
        setStats({
          restaurants: restaurantsResult.success ? restaurantsResult.data.length : 0,
          users: usersResult.success ? usersResult.data.length : 0,
          reservations: reservationsResult.success ? reservationsResult.data.length : 0
        });
      } catch (error) {
        console.log('Error fetching admin stats:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAdminStats();
  }, [user]);

  return (
    <View style={styles.roleContainer}>
      <Text style={styles.sectionTitle}>Admin Dashboard</Text>
      
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          {loading ? (
            <ActivityIndicator size="small" color="#1a1a1a" />
          ) : (
            <Text style={styles.statNumber}>{stats.restaurants}</Text>
          )}
          <Text style={styles.statLabel}>Restaurants</Text>
        </View>
        <View style={styles.statItem}>
          {loading ? (
            <ActivityIndicator size="small" color="#1a1a1a" />
          ) : (
            <Text style={styles.statNumber}>{stats.users}</Text>
          )}
          <Text style={styles.statLabel}>Users</Text>
        </View>
        <View style={styles.statItem}>
          {loading ? (
            <ActivityIndicator size="small" color="#1a1a1a" />
          ) : (
            <Text style={styles.statNumber}>{stats.reservations}</Text>
          )}
          <Text style={styles.statLabel}>Reservations</Text>
        </View>
      </View>
      
      <Text style={styles.sectionTitle}>Management</Text>
      
      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => router.push("/admin/restaurants")}
      >
        <Ionicons name="restaurant-outline" size={24} color="#1a1a1a" />
        <Text style={styles.menuItemText}>Manage Restaurants</Text>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => router.push("/admin/users")}
      >
        <Ionicons name="people-outline" size={24} color="#1a1a1a" />
        <Text style={styles.menuItemText}>Manage Users</Text>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => router.push("/admin/reservations")}
      >
        <Ionicons name="calendar-outline" size={24} color="#1a1a1a" />
        <Text style={styles.menuItemText}>View All Reservations</Text>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => router.push("/admin/analytics")}
      >
        <Ionicons name="bar-chart-outline" size={24} color="#1a1a1a" />
        <Text style={styles.menuItemText}>Analytics Dashboard</Text>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
  <Ionicons name="log-out-outline" size={24} color="#ffffff" />
  <Text style={styles.logoutText}>Logout</Text>
</TouchableOpacity>
    </View>
  );
};

// Restaurant Owner content component
const OwnerContent = ({ user,handleLogout }) => {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState([]);
  const [stats, setStats] = useState({
    count: 0,
    reservations: 0,
    avgRating: 0,
    totalReviews: 0 
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOwnerRestaurants = async () => {
      try {
        setLoading(true);
        // Fetch restaurants owned by current user
        const result = await RestaurantService.getRestaurantsByOwnerId(
          user.uid
        );

        if (result && result.length > 0) {
          setRestaurants(result);

          // Filter out restaurants that haven't been rated
          const ratedRestaurants = result.filter(restaurant => 
            restaurant.rating !== undefined && 
            restaurant.rating !== null && 
            restaurant.rating > 0
          );
          
          // Calculate average rating only for restaurants that have ratings
          const totalRating = ratedRestaurants.reduce(
            (sum, restaurant) => sum + restaurant.rating,
            0
          );
          
          const avgRating = ratedRestaurants.length > 0 
            ? (totalRating / ratedRestaurants.length).toFixed(1) 
            : 0;

          // Calculate total reviews count
          const totalReviews = result.reduce(
            (sum, restaurant) => sum + (restaurant.reviews || 0),
            0
          );

          // Get today's reservations count
          const todaysReservations =
            await RestaurantService.getTodaysReservationsCount(user.uid);

          setStats({
            count: result.length,
            reservations: todaysReservations,
            avgRating: avgRating,
            totalReviews: totalReviews
          });
        }
      } catch (error) {
        console.log("Error fetching owner restaurants:", error);
      } finally {
        setLoading(false);
      }
    };

    if (user && user.uid) {
      fetchOwnerRestaurants();
    }
  }, [user]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#1a1a1a" />
        <Text style={styles.loadingText}>Loading your restaurants...</Text>
      </View>
    );
  }

  return (
    <View style={styles.roleContainer}>
      <Text style={styles.sectionTitle}>Restaurant Management</Text>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.count}</Text>
          <Text style={styles.statLabel}>My Restaurants</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.reservations}</Text>
          <Text style={styles.statLabel}>Today's Reservations</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.avgRating}</Text>
          <Text style={styles.statLabel}>Avg. Rating</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.totalReviews}</Text>
          <Text style={styles.statLabel}>Total Reviews</Text>
        </View>
      </View>
      

      
      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => router.push("/reviews")}
      >
        <Ionicons name="star-outline" size={24} color="#1a1a1a" />
        <Text style={styles.menuItemText}>Restaurant Reviews</Text>
        <View style={styles.menuItemBadge}>
          <Text style={styles.menuItemBadgeText}>{stats.totalReviews}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </TouchableOpacity>
      
      <Text style={styles.sectionTitle}>Reservations</Text>
      <RestaurantReservations ownerId={user.uid} />

      <Text style={styles.sectionTitle}>Restaurants</Text>

      {restaurants.length > 0 ? (
        restaurants.map((restaurant) => (
          <TouchableOpacity
            key={restaurant.id}
            style={styles.restaurantItem}
            onPress={() => router.push(`/restaurant/${restaurant.id}`)}
          >
            <View style={styles.restaurantItemContent}>
              {restaurant.images && restaurant.images.length > 0 ? (
                <Image
                  source={{ uri: restaurant.images[0] }}
                  style={styles.restaurantItemImage}
                />
              ) : (
                <View style={styles.restaurantItemImagePlaceholder}>
                  <Ionicons name="restaurant" size={24} color="#fff" />
                </View>
              )}
              <View style={styles.restaurantItemInfo}>
                <Text style={styles.restaurantItemName}>{restaurant.name}</Text>
                <Text style={styles.restaurantItemAddress}>
                  {restaurant.address}
                </Text>
                <View style={styles.restaurantItemStats}>
                  <View style={styles.restaurantItemStatItem}>
                    <Ionicons name="star" size={14} color="#FFD700" />
                    <Text style={styles.restaurantItemStatText}>
                      {restaurant.rating ? restaurant.rating.toFixed(1) : "No ratings"}
                    </Text>
                  </View>
                  <View style={styles.restaurantItemStatItem}>
                    <Ionicons name="people-outline" size={14} color="#666" />
                    <Text style={styles.restaurantItemStatText}>
                      {restaurant.reviews || 0} reviews
                    </Text>
                  </View>
                </View>
              </View>
            </View>
            <View style={styles.restaurantItemActions}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => router.push(`/restaurant/edit/${restaurant.id}`)}
              >
                <Ionicons name="pencil-outline" size={16} color="#1a1a1a" />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </View>
          </TouchableOpacity>
        ))
      ) : (
        <View style={styles.emptyStateContainer}>
          <Ionicons name="restaurant-outline" size={48} color="#ccc" />
          <Text style={styles.emptyStateText}>
            You don't have any restaurants yet
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => router.push("/restaurant/add")}
      >
        <Ionicons name="add" size={24} color="#fff" />
        <Text style={styles.addButtonText}>Add New Restaurant</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
  <Ionicons name="log-out-outline" size={24} color="#ffffff" />
  <Text style={styles.logoutText}>Logout</Text>
</TouchableOpacity>
    </View>
  );
};

// Regular User content component
const UserContent = ({ user,handleLogout }) => {
  const router = useRouter();
  const [stats, setStats] = useState({
    reservations: 0,
    favorites: 0,
    reviews: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserStats = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        // Fetch reservations count
        const reservationsResult = await databaseService.getDocuments('reservations', [
          databaseService.queries.where('userId', '==', user.uid),
          databaseService.queries.where('status', '==', 'confirmed')
        ]);
        
        // Fetch favorites count
        const favoritesResult = await databaseService.getDocuments('favorites', [
          databaseService.queries.where('userId', '==', user.uid)
        ]);
        
        // Fetch reviews count
        const reviewsResult = await databaseService.getDocuments('reviews', [
          databaseService.queries.where('userId', '==', user.uid)
        ]);
        
        setStats({
          reservations: reservationsResult.success ? reservationsResult.data.length : 0,
          favorites: favoritesResult.success ? favoritesResult.data.length : 0,
          reviews: reviewsResult.success ? reviewsResult.data.length : 0
        });
      } catch (error) {
        console.log('Error fetching user stats:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserStats();
  }, [user]);

  return (
    <View style={styles.roleContainer}>
      <Text style={styles.sectionTitle}>Your Activities</Text>
      
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          {loading ? (
            <ActivityIndicator size="small" color="#1a1a1a" />
          ) : (
            <Text style={styles.statNumber}>{stats.reservations}</Text>
          )}
          <Text style={styles.statLabel}>Reservations</Text>
        </View>
        <View style={styles.statItem}>
          {loading ? (
            <ActivityIndicator size="small" color="#1a1a1a" />
          ) : (
            <Text style={styles.statNumber}>{stats.favorites}</Text>
          )}
          <Text style={styles.statLabel}>Favourites</Text>
        </View>
        <View style={styles.statItem}>
          {loading ? (
            <ActivityIndicator size="small" color="#1a1a1a" />
          ) : (
            <Text style={styles.statNumber}>{stats.reviews}</Text>
          )}
          <Text style={styles.statLabel}>Reviews</Text>
        </View>
      </View>
      
      <Text style={styles.sectionTitle}>Your Account</Text>
      
      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => router.push("/reservations")}
      >
        <Ionicons name="calendar-outline" size={24} color="#1a1a1a" />
        <Text style={styles.menuItemText}>My Reservations</Text>
        <View style={styles.menuItemBadge}>
          <Text style={styles.menuItemBadgeText}>{stats.reservations}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => router.push("/shared-reservations")}
      >
        <Ionicons name="people-outline" size={24} color="#1a1a1a" />
        <Text style={styles.menuItemText}>Shared Reservations</Text>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => router.push("/favourites")}
      >
        <Ionicons name="heart-outline" size={24} color="#1a1a1a" />
        <Text style={styles.menuItemText}>Favorite Restaurants</Text>
        <View style={styles.menuItemBadge}>
          <Text style={styles.menuItemBadgeText}>{stats.favorites}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => router.push("/reviews")}
      >
        <Ionicons name="star-outline" size={24} color="#1a1a1a" />
        <Text style={styles.menuItemText}>My Reviews</Text>
        <View style={styles.menuItemBadge}>
          <Text style={styles.menuItemBadgeText}>{stats.reviews}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => router.push("/settings")}
      >
        <Ionicons name="settings-outline" size={24} color="#1a1a1a" />
        <Text style={styles.menuItemText}>Account Settings</Text>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => router.push("/help")}
      >
        <Ionicons name="help-circle-outline" size={24} color="#1a1a1a" />
        <Text style={styles.menuItemText}>Help & Support</Text>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
  <Ionicons name="log-out-outline" size={24} color="#ffffff" />
  <Text style={styles.logoutText}>Logout</Text>
</TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e8f0ed",
  },
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  profileHeader: {
    alignItems: "center",
    paddingVertical: 20,
  },
  profileImageContainer: {
    backgroundColor: "#ccc",
    borderRadius: 50,
    width: 100,
    height: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  profileImagePlaceholder: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#fff",
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 10,
    color: "#1a1a1a",
  },
  roleBadge: {
    backgroundColor: "#d4edda",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  roleText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#155724",
  },
  roleContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
    color: "#1a1a1a",
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    paddingBottom: 5,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1a1a1a",
  },
  statLabel: {
    fontSize: 14,
    color: "#666",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  menuItemText: {
    fontSize: 16,
    color: "#1a1a1a",
    marginLeft: 15,
    flex: 1,
  },
  menuItemBadge: {
    backgroundColor: "#ffc107",
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginRight: 8,
  },
  menuItemBadgeText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "bold",
  },
  restaurantItem: {
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 15,
    overflow: "hidden",
  },
  restaurantItemContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
  },
  restaurantItemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 10,
  },
  restaurantItemImagePlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: "#ccc",
    borderRadius: 8,
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  restaurantItemInfo: {
    flex: 1,
  },
  restaurantItemName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1a1a1a",
  },
  restaurantItemAddress: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  restaurantItemStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  restaurantItemStatItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
    marginBottom: 6,
  },
  restaurantItemStatText: {
    fontSize: 12,
    color: "#1a1a1a",
    marginLeft: 4,
    fontWeight: "500",
  },
  restaurantItemActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#f5f5f5",
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    backgroundColor: "#e0f7fa",
    marginRight: 8,
  },
  editButtonText: {
    fontSize: 14,
    color: "#1a1a1a",
    marginLeft: 4,
  },
  addButton: {
    backgroundColor: "#1a1a1a",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "center",
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 10,
  },
  emptyStateContainer: {
    alignItems: "center",
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#888",
    marginTop: 10,
    textAlign: "center",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center", 
    backgroundColor: "#ff3b30", 
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 30, 
    marginHorizontal: 20, 
    elevation: 2, 
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600", // Make text semi-bold
    color: "#ffffff", // White text for contrast
    marginLeft: 10,
  },
});

export default Profile;
