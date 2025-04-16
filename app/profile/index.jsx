import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image
} from "react-native";
import React, { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import RestaurantService from "../../services/restaurantService";

const Profile = () => {
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
        <ActivityIndicator size="large" color="#1a1a1a" />
      </View>
    );
  }

  // Function to render content based on user role
  const renderRoleBasedContent = () => {
    switch (user?.role) {
      case "admin":
        return <AdminContent user={user} />;
      case "owner":
        return <OwnerContent user={user} />;
      case "user":
      default:
        return <UserContent user={user} />;
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
const AdminContent = ({ user }) => {
  const router = useRouter();

  return (
    <View style={styles.roleContainer}>
      <Text style={styles.sectionTitle}>Admin Dashboard</Text>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>42</Text>
          <Text style={styles.statLabel}>Restaurants</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>138</Text>
          <Text style={styles.statLabel}>Users</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>867</Text>
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
    </View>
  );
};

// Restaurant Owner content component
const OwnerContent = ({ user }) => {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState([]);
  const [stats, setStats] = useState({
    count: 0,
    reservations: 0,
    avgRating: 0,
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
          // Calculate stats
          const totalRating = result.reduce(
            (sum, restaurant) => sum + restaurant.rating,
            0
          );
          const avgRating =
            result.length > 0 ? (totalRating / result.length).toFixed(1) : 0;
          // const todaysReservations = await RestaurantService.getTodaysReservationsCount(user.uid);

          setStats({
            count: result.length,
            // reservations: todaysReservations || 0,
            reservations: 0,
            avgRating: avgRating,
          });
        }
      } catch (error) {
        console.error("Error fetching owner restaurants:", error);
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
      </View>

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
                      {restaurant.rating.toFixed(1)}
                    </Text>
                  </View>
                  <View style={styles.restaurantItemStatItem}>
                    <Ionicons name="people-outline" size={14} color="#666" />
                    <Text style={styles.restaurantItemStatText}>
                      {restaurant.reviews} reviews
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
    </View>
  );
};

// Regular User content component
const UserContent = ({ user }) => {
  const router = useRouter();

  return (
    <View style={styles.roleContainer}>
      <Text style={styles.sectionTitle}>Your Activities</Text>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>5</Text>
          <Text style={styles.statLabel}>Reservations</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>8</Text>
          <Text style={styles.statLabel}>Favorites</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>12</Text>
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
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => router.push("/favourites")}
      >
        <Ionicons name="heart-outline" size={24} color="#1a1a1a" />
        <Text style={styles.menuItemText}>Favorite Restaurants</Text>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => router.push("/reviews")}
      >
        <Ionicons name="star-outline" size={24} color="#1a1a1a" />
        <Text style={styles.menuItemText}>My Reviews</Text>
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
    </View>
  );
};

const styles = StyleSheet.create({
  centeredContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    flex: 1,
    backgroundColor: "#e8f0ed",
  },
  profileHeader: {
    alignItems: "center",
    padding: 24,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#eeeeee",
  },
  profileImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  profileImagePlaceholder: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: "#e8f0ed",
    borderRadius: 16,
  },
  roleText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  roleContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    marginTop: 16,
    marginBottom: 12,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: "#1a1a1a",
    marginLeft: 12,
  },
  restaurantItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  restaurantItemContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  restaurantItemImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
  },
  restaurantItemInfo: {
    marginLeft: 12,
    flex: 1,
  },
  restaurantItemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  restaurantItemAddress: {
    fontSize: 12,
    color: "#666",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginLeft: 8,
  },
});

export default Profile;
