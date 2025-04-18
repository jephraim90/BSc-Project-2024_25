import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Platform
} from "react-native";
import React, { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "expo-router";
import databaseService from "@/services/databaseService";
import RestaurantService from "@/services/restaurantService";

const Reservations = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("upcoming");
  const { user, loading: authLoading } = useAuth();
  const [checkedAuth, setCheckedAuth] = useState(false);

  // State for reservations
  const [upcomingReservations, setUpcomingReservations] = useState([]);
  const [pastReservations, setPastReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check authentication
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace("/auth");
      }
      setCheckedAuth(true);
    }
  }, [user, authLoading]);

  // Fetch reservations
  useEffect(() => {
    const fetchReservations = async () => {
      if (!user) return;

      try {
        setLoading(true);

        // Get all reservations for the current user
        const queryConstraints = [
          databaseService.queries.where("userId", "==", user.uid),
          databaseService.queries.orderBy("date", "desc"),
        ];

        const result = await databaseService.getDocuments(
          "reservations",
          queryConstraints
        );

        if (!result.success) {
          throw new Error(result.error || "Failed to fetch reservations");
        }

        // Process reservations and fetch restaurant details
        const reservations = await Promise.all(
          result.data.map(async (reservation) => {
            try {
              // Get restaurant details
              const restaurant = await RestaurantService.getRestaurantById(
                reservation.restaurantId
              );

              // Combine reservation and restaurant info
              return {
                ...reservation,
                restaurantName: restaurant?.name || "Restaurant",
                image:
                  restaurant?.images?.[0] ||
                  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4",
                address: restaurant?.address || "Address not available",
              };
            } catch (err) {
              console.error(
                `Error fetching restaurant details for reservation ${reservation.id}:`,
                err
              );
              return {
                ...reservation,
                restaurantName: "Restaurant",
                image:
                  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4",
                address: "Address not available",
              };
            }
          })
        );

        // Sort and categorize reservations
        const currentDate = new Date();

        // Group by upcoming/past
        const upcoming = [];
        const past = [];

        for (const reservation of reservations) {
          // Convert reservation date to Date
          let reservationDate;

          // Handle different date formats
          if (reservation.date) {
            if (typeof reservation.date === "string") {
              if (reservation.date.includes("/")) {
                // MM/DD/YYYY format
                const [month, day, year] = reservation.date
                  .split("/")
                  .map(Number);
                reservationDate = new Date(year, month - 1, day);
              } else if (reservation.date.includes("-")) {
                // YYYY-MM-DD format
                reservationDate = new Date(reservation.date);
              } else {
                // Assume it's a timestamp
                reservationDate = new Date(reservation.date);
              }
            } else if (reservation.date.toDate) {
              // Firestore timestamp
              reservationDate = reservation.date.toDate();
            } else {
              // Fallback
              reservationDate = new Date(reservation.date);
            }
          } else {
            // No date found
            reservationDate = new Date(0);
          }

          // Format date for display
          const formattedDate = reservationDate.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          });

          // Create display reservation with formatted date
          const displayReservation = {
            ...reservation,
            formattedDate,
          };

          // Check if reservation is upcoming or past
          const reservationDateTime = new Date(reservationDate);
          if (reservation.time) {
            const [hours, minutes] = convertTimeToHoursMinutes(
              reservation.time
            );
            reservationDateTime.setHours(hours, minutes);
          }

          if (
            reservationDateTime >= currentDate ||
            reservation.status === "confirmed" ||
            reservation.status === "pending"
          ) {
            upcoming.push(displayReservation);
          } else {
            past.push(displayReservation);
          }
        }

        // Sort upcoming by date (closest first)
        upcoming.sort((a, b) => new Date(a.date) - new Date(b.date));

        // Sort past by date (most recent first)
        past.sort((a, b) => new Date(b.date) - new Date(a.date));

        setUpcomingReservations(upcoming);
        setPastReservations(past);
      } catch (err) {
        console.error("Error fetching reservations:", err);
        setError(err.message || "Failed to load reservations");
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchReservations();
    }
  }, [user]);

  // Convert time string (e.g. "7:30 PM") to hours and minutes
  const convertTimeToHoursMinutes = (timeString) => {
    if (!timeString) return [0, 0];

    const match = timeString.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (!match) return [0, 0];

    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3]?.toUpperCase();

    if (period === "PM" && hours < 12) {
      hours += 12;
    } else if (period === "AM" && hours === 12) {
      hours = 0;
    }

    return [hours, minutes];
  };
  const showPlatformAlert = (
    title,
    message,
    confirmAction,
    cancelAction = () => {}
  ) => {
    if (Platform.OS === "web") {
      // For web platform
      if (confirmAction) {
        const isConfirmed = window.confirm(`${title}\n\n${message}`);
        if (isConfirmed) {
          confirmAction();
        } else {
          cancelAction();
        }
      } else {
        // alert without confirmation
        window.alert(`${title}\n\n${message}`);
      }
    } else {
      // For native platforms (iOS/Android)
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
              text: "Delete",
              style: "destructive",
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
  // Handle reservation cancellation
  const handleCancelReservation = (reservationId) => {
    showPlatformAlert(
      "Cancel Reservation",
      "Are you sure you want to cancel this reservation?",
      async () => {
        try {
          const result = await databaseService.updateDocument(
            "reservations",
            reservationId,
            {
              status: "cancelled",
              updatedAt: new Date().toISOString(),
            }
          );
          
          if (!result.success) {
            throw new Error(result.error || "Failed to cancel reservation");
          }
          
          // Update local state to reflect cancellation
          setUpcomingReservations((prevReservations) =>
            prevReservations
              .map((reservation) =>
                reservation.id === reservationId
                  ? { ...reservation, status: "cancelled" }
                  : reservation
              )
              .filter((reservation) => reservation.status !== "cancelled")
          );
          
          showPlatformAlert("Success", "Your reservation has been cancelled");
        } catch (err) {
          console.error("Error cancelling reservation:", err);
          showPlatformAlert(
            "Error",
            err.message || "Failed to cancel reservation"
          );
        }
      }
    );
  };

  // Handle booking again
  const handleBookAgain = (reservation) => {
    router.push(`/restaurant/${reservation.restaurantId}/reserve`);
  };

  // Handle rating
  const handleRate = (reservation) => {
    router.push(`/review/create?restaurantId=${reservation.restaurantId}`);
  };

  // Render loading state
  if (authLoading || !checkedAuth) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#1a1a1a" />
      </View>
    );
  }

  // Render reservation item based on status
  const renderReservationItem = (reservation) => {
    // Generate a reservation code if one doesn't exist
    const reservationCode =
      reservation.reservationCode ||
      reservation.id?.substring(0, 6).toUpperCase() ||
      Math.random().toString(36).substring(2, 8).toUpperCase();

    return (
      <TouchableOpacity
        key={reservation.id}
        style={styles.reservationCard}
        onPress={() => router.push(`/reservation/${reservation.id}`)}
      >
        <Image
          source={{
            uri:
              reservation.image ||
              "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4",
          }}
          style={styles.restaurantImage}
        />

        <View style={styles.reservationDetails}>
          <View style={styles.reservationHeader}>
            <Text style={styles.restaurantName}>
              {reservation.restaurantName}
            </Text>
            {reservation.status === "confirmed" && (
              <View style={[styles.statusBadge, styles.confirmedBadge]}>
                <Text style={styles.statusText}>Confirmed</Text>
              </View>
            )}
            {reservation.status === "pending" && (
              <View style={[styles.statusBadge, styles.pendingBadge]}>
                <Text style={styles.statusText}>Pending</Text>
              </View>
            )}
            {reservation.status === "cancelled" && (
              <View style={[styles.statusBadge, styles.cancelledBadge]}>
                <Text style={styles.statusText}>Cancelled</Text>
              </View>
            )}
          </View>

          <View style={styles.reservationInfo}>
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={16} color="#666" />
              <Text style={styles.infoText}>
                {reservation.formattedDate || reservation.date} at{" "}
                {reservation.time}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="people-outline" size={16} color="#666" />
              <Text style={styles.infoText}>
                {reservation.guests || reservation.partySize || 2}
                {reservation.guests > 1 || reservation.partySize > 1
                  ? " people"
                  : " person"}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={16} color="#666" />
              <Text style={styles.infoText} numberOfLines={1}>
                {reservation.address}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="bookmark-outline" size={16} color="#666" />
              <Text style={styles.infoText}>
                Reservation #{reservationCode}
              </Text>
            </View>
          </View>

          {activeTab === "upcoming" && reservation.status !== "cancelled" && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() =>
                  router.push(`/reservation/edit/${reservation.id}`)
                }
              >
                <Text style={styles.actionButtonText}>Modify</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => handleCancelReservation(reservation.id)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}

          {activeTab === "past" && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleBookAgain(reservation)}
              >
                <Text style={styles.actionButtonText}>Book Again</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.rateButton}
                onPress={() => handleRate(reservation)}
              >
                <Ionicons name="star" size={14} color="#FFD700" />
                <Text style={styles.rateButtonText}>Rate</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Reservations</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "upcoming" && styles.activeTab]}
          onPress={() => setActiveTab("upcoming")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "upcoming" && styles.activeTabText,
            ]}
          >
            Upcoming{" "}
            {upcomingReservations.length > 0 &&
              `(${upcomingReservations.length})`}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "past" && styles.activeTab]}
          onPress={() => setActiveTab("past")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "past" && styles.activeTabText,
            ]}
          >
            Past {pastReservations.length > 0 && `(${pastReservations.length})`}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1a1a1a" />
          <Text style={styles.loadingText}>Loading your reservations...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color="#e53935" />
          <Text style={styles.errorTitle}>Oops!</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => router.reload()}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.reservationsList}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === "upcoming" && upcomingReservations.length > 0 ? (
            upcomingReservations.map((reservation) =>
              renderReservationItem(reservation)
            )
          ) : activeTab === "upcoming" ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={60} color="#ccc" />
              <Text style={styles.emptyStateTitle}>
                No Upcoming Reservations
              </Text>
              <Text style={styles.emptyStateText}>
                You don't have any upcoming restaurant reservations.
              </Text>
              <TouchableOpacity
                style={styles.emptyStateButton}
                onPress={() => router.push("/restaurants")}
              >
                <Text style={styles.emptyStateButtonText}>
                  Find Restaurants
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {activeTab === "past" && pastReservations.length > 0 ? (
            pastReservations.map((reservation) =>
              renderReservationItem(reservation)
            )
          ) : activeTab === "past" ? (
            <View style={styles.emptyState}>
              <Ionicons name="time-outline" size={60} color="#ccc" />
              <Text style={styles.emptyStateTitle}>No Past Reservations</Text>
              <Text style={styles.emptyStateText}>
                You don't have any past restaurant reservations.
              </Text>
            </View>
          ) : null}

          {/* Add some space at the bottom */}
          <View style={{ height: 20 }} />
        </ScrollView>
      )}
    </SafeAreaView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: "#e53935",
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: "#1a1a1a",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1a1a1a",
  },
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  tab: {
    paddingVertical: 12,
    marginRight: 24,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: "#1a1a1a",
  },
  tabText: {
    fontSize: 16,
    color: "#666",
  },
  activeTabText: {
    fontWeight: "600",
    color: "#1a1a1a",
  },
  reservationsList: {
    paddingHorizontal: 16,
  },
  reservationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  restaurantImage: {
    width: "100%",
    height: 120,
  },
  reservationDetails: {
    padding: 16,
  },
  reservationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  restaurantName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  confirmedBadge: {
    backgroundColor: "#e0f0e9",
  },
  pendingBadge: {
    backgroundColor: "#FFF8E0",
  },
  cancelledBadge: {
    backgroundColor: "#FFEBEE",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  reservationInfo: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actionButton: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: "center",
    marginRight: 8,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  cancelButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#1a1a1a",
  },
  cancelButtonText: {
    color: "#1a1a1a",
    fontSize: 14,
    fontWeight: "600",
  },
  rateButton: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#FFD700",
  },
  rateButtonText: {
    color: "#1a1a1a",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  emptyStateButton: {
    backgroundColor: "#1a1a1a",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default Reservations;
