import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import ReservationService from "@/services/reservationService";
import databaseService from "@/services/databaseService";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Calendar } from "react-native-calendars";

const AdminReservation = () => {
  // State management
  const [loading, setLoading] = useState(true);
  const [reservations, setReservations] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");

  // Fetch data on component mount
  useEffect(() => {
    fetchRestaurants();
    fetchReservations();
  }, []);

  // Fetch reservations when restaurant or date changes
  useEffect(() => {
    if (selectedRestaurant) {
      fetchReservations();
    }
  }, [selectedRestaurant, selectedDate]);

  // Fetch all restaurants for the filter
  const fetchRestaurants = async () => {
    try {
      const result = await databaseService.getDocuments("restaurants");
      if (result.success) {
        setRestaurants(result.data);
        // Set the first restaurant as default if available
        if (result.data.length > 0 && !selectedRestaurant) {
          setSelectedRestaurant(result.data[0].id);
        }
      } else {
        Alert.alert("Error", "Failed to load restaurants");
      }
    } catch (error) {
      console.error("Error fetching restaurants:", error);
      Alert.alert("Error", "An unexpected error occurred");
    }
  };

  // Fetch reservations based on selected filters
  const fetchReservations = async () => {
    setLoading(true);
    try {
      if (!selectedRestaurant) {
        setReservations([]);
        setLoading(false);
        return;
      }

      const result = await ReservationService.getRestaurantReservations(
        selectedRestaurant,
        selectedDate
      );

      if (result.success) {
        let filteredReservations = result.data;

        // Apply status filter if not "all"
        if (filterStatus !== "all") {
          filteredReservations = filteredReservations.filter(
            (res) => res.status === filterStatus
          );
        }

        // Sort reservations by time
        filteredReservations.sort((a, b) => {
          // First by status (confirmed first, then pending, then cancelled)
          const statusOrder = { confirmed: 0, pending: 1, cancelled: 2 };
          if (statusOrder[a.status] !== statusOrder[b.status]) {
            return statusOrder[a.status] - statusOrder[b.status];
          }

          // Then by time
          return a.time.localeCompare(b.time);
        });

        setReservations(filteredReservations);
      } else {
        Alert.alert("Error", result.error || "Failed to load reservations");
      }
    } catch (error) {
      console.error("Error fetching reservations:", error);
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Update reservation status
  const updateReservationStatus = async (reservationId, newStatus) => {
    try {
      const result = await ReservationService.updateReservation(reservationId, {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });

      if (result.success) {
        // Update local state
        setReservations((prevReservations) =>
          prevReservations.map((res) =>
            res.id === reservationId ? { ...res, status: newStatus } : res
          )
        );

        if (selectedReservation && selectedReservation.id === reservationId) {
          setSelectedReservation({ ...selectedReservation, status: newStatus });
        }

        Alert.alert("Success", `Reservation ${newStatus}`);
      } else {
        Alert.alert("Error", result.error || "Failed to update reservation");
      }
    } catch (error) {
      console.error("Error updating reservation status:", error);
      Alert.alert("Error", "An unexpected error occurred");
    }
  };

  // Get status badge style based on status
  const getStatusBadge = (status) => {
    switch (status) {
      case "confirmed":
        return styles.confirmedBadge;
      case "pending":
        return styles.pendingBadge;
      case "cancelled":
        return styles.cancelledBadge;
      default:
        return styles.defaultBadge;
    }
  };

  // Handle date selection from calendar
  const handleDateSelect = (day) => {
    setSelectedDate(day.dateString);
    setModalVisible(false);
  };

  // View reservation details
  const viewReservationDetails = (reservation) => {
    setSelectedReservation(reservation);
    setDetailsModalVisible(true);
  };

  // Render reservation item
  const renderReservationItem = ({ item }) => (
    <TouchableOpacity
      style={styles.reservationItem}
      onPress={() => viewReservationDetails(item)}
    >
      <View style={styles.reservationHeader}>
        <Text style={styles.reservationTime}>{item.time}</Text>
        <View style={[styles.statusBadge, getStatusBadge(item.status)]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      <Text style={styles.featureItem}>
        {item.customerName || "Guest"} ({item.guests} guests)
      </Text>

      <Text style={styles.subheading}>
        Booking ID: {item.id.substring(0, 8)}...
      </Text>

      <View style={styles.actionButtons}>
        {item.status === "pending" && (
          <>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={() => updateReservationStatus(item.id, "confirmed")}
            >
              <Text style={styles.callToAction}>Confirm</Text>
            </TouchableOpacity>
            <View style={{ width: 10 }} />
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => updateReservationStatus(item.id, "cancelled")}
            >
              <Text style={styles.callToAction}>Cancel</Text>
            </TouchableOpacity>
          </>
        )}

        {item.status === "confirmed" && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => updateReservationStatus(item.id, "cancelled")}
          >
            <Text style={styles.callToAction}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.headerContainer}>
          <Text style={styles.mainHeading}>Reservation Management</Text>
          <Text style={styles.subheading}>
            Manage and monitor all restaurant reservations
          </Text>
        </View>

        <View style={styles.featuresContainer}>
          {/* Restaurant selector */}
          <View style={styles.filterItem}>
            <Text style={styles.featureItem}>Restaurant:</Text>
            <View style={styles.picker}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {restaurants.map((restaurant) => (
                  <TouchableOpacity
                    key={restaurant.id}
                    style={[
                      styles.restaurantChip,
                      selectedRestaurant === restaurant.id &&
                        styles.selectedChip,
                    ]}
                    onPress={() => setSelectedRestaurant(restaurant.id)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selectedRestaurant === restaurant.id &&
                          styles.selectedChipText,
                      ]}
                    >
                      {restaurant.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          {/* Date selector */}
          <View style={styles.filterItem}>
            <Text style={styles.featureItem}>Date:</Text>
            <TouchableOpacity
              style={styles.dateSelector}
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.dateText}>{selectedDate}</Text>
              <Ionicons name="calendar" size={24} color="#555" />
            </TouchableOpacity>
          </View>

          {/* Status filter */}
          <View style={styles.filterItem}>
            <Text style={styles.featureItem}>Status:</Text>
            <View style={styles.statusFilter}>
              <TouchableOpacity
                style={[
                  styles.statusChip,
                  filterStatus === "all" && styles.activeStatusChip,
                ]}
                onPress={() => setFilterStatus("all")}
              >
                <Text style={styles.statusChipText}>All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.statusChip,
                  filterStatus === "confirmed" && styles.activeStatusChip,
                ]}
                onPress={() => setFilterStatus("confirmed")}
              >
                <Text style={styles.statusChipText}>Confirmed</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.statusChip,
                  filterStatus === "pending" && styles.activeStatusChip,
                ]}
                onPress={() => setFilterStatus("pending")}
              >
                <Text style={styles.statusChipText}>Pending</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.statusChip,
                  filterStatus === "cancelled" && styles.activeStatusChip,
                ]}
                onPress={() => setFilterStatus("cancelled")}
              >
                <Text style={styles.statusChipText}>Cancelled</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Reservation list */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1a1a1a" />
            <Text style={styles.subheading}>Loading reservations...</Text>
          </View>
        ) : reservations.length > 0 ? (
          <FlatList
            data={reservations}
            renderItem={renderReservationItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            scrollEnabled={false} // Prevent nested scrolling issues
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color="#555555" />
            <Text style={styles.featureItem}>No reservations found</Text>
            <Text style={styles.subheading}>
              Try selecting a different date or status filter
            </Text>
          </View>
        )}

        {/* Calendar modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Date</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              <Calendar
                onDayPress={handleDateSelect}
                markedDates={{
                  [selectedDate]: { selected: true, selectedColor: "#0066cc" },
                }}
                minDate={new Date().toISOString().split("T")[0]}
                theme={{
                  selectedDayBackgroundColor: "#0066cc",
                  todayTextColor: "#0066cc",
                  arrowColor: "#0066cc",
                }}
              />
            </View>
          </View>
        </Modal>

        {/* Reservation details modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={detailsModalVisible}
          onRequestClose={() => setDetailsModalVisible(false)}
        >
          {selectedReservation && (
            <View style={styles.modalOverlay}>
              <View style={styles.detailsModalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.mainHeading}>Reservation Details</Text>
                  <TouchableOpacity
                    onPress={() => setDetailsModalVisible(false)}
                  >
                    <Ionicons name="close" size={24} color="#1a1a1a" />
                  </TouchableOpacity>
                </View>

                <View style={styles.detailsContainer}>
                  <View
                    style={[
                      styles.statusBadge,
                      getStatusBadge(selectedReservation.status),
                      styles.detailsStatusBadge,
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {selectedReservation.status}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.featureItem}>Reservation ID:</Text>
                    <Text style={styles.detailValue}>
                      {selectedReservation.id}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.featureItem}>Customer:</Text>
                    <Text style={styles.detailValue}>
                      {selectedReservation.customerName || "Guest"}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.featureItem}>Email:</Text>
                    <Text style={styles.detailValue}>
                      {selectedReservation.customerEmail || "N/A"}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.featureItem}>Phone:</Text>
                    <Text style={styles.detailValue}>
                      {selectedReservation.customerPhone || "N/A"}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.featureItem}>Date:</Text>
                    <Text style={styles.detailValue}>
                      {selectedReservation.date}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.featureItem}>Time:</Text>
                    <Text style={styles.detailValue}>
                      {selectedReservation.time}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.featureItem}>Party Size:</Text>
                    <Text style={styles.detailValue}>
                      {selectedReservation.guests} guests
                    </Text>
                  </View>

                  {selectedReservation.specialRequests && (
                    <View style={styles.detailRow}>
                      <Text style={styles.featureItem}>Special Requests:</Text>
                      <Text style={styles.detailValue}>
                        {selectedReservation.specialRequests}
                      </Text>
                    </View>
                  )}

                  {selectedReservation.createdAt && (
                    <View style={styles.detailRow}>
                      <Text style={styles.featureItem}>Created:</Text>
                      <Text style={styles.detailValue}>
                        {new Date(
                          selectedReservation.createdAt
                        ).toLocaleString()}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.ctaWrapper}>
                  {selectedReservation.status === "pending" && (
                    <>
                      <TouchableOpacity
                        style={styles.confirmButton}
                        onPress={() => {
                          updateReservationStatus(
                            selectedReservation.id,
                            "confirmed"
                          );
                          setDetailsModalVisible(false);
                        }}
                      >
                        <Text style={styles.callToAction}>
                          Confirm Reservation
                        </Text>
                      </TouchableOpacity>
                      <View style={{ height: 12 }} />
                      <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => {
                          updateReservationStatus(
                            selectedReservation.id,
                            "cancelled"
                          );
                          setDetailsModalVisible(false);
                        }}
                      >
                        <Text style={styles.callToAction}>
                          Cancel Reservation
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {selectedReservation.status === "confirmed" && (
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => {
                        updateReservationStatus(
                          selectedReservation.id,
                          "cancelled"
                        );
                        setDetailsModalVisible(false);
                      }}
                    >
                      <Text style={styles.callToAction}>
                        Cancel Reservation
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          )}
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
};
const styles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: "#e8f0ed",
    },
    scrollContainer: {
      flexGrow: 1,
      padding: 20,
    },
    headerContainer: {
      marginTop: 20,
      marginBottom: 24,
    },
    mainHeading: {
      fontSize: 36,
      fontWeight: "800",
      color: "#1a1a1a",
      lineHeight: 42,
      letterSpacing: -0.5,
      marginBottom: 16,
      fontFamily: "System",
    },
    subheading: {
      fontSize: 16,
      color: "#555555",
      lineHeight: 22,
      fontFamily: "System",
    },
    featuresContainer: {
      marginTop: 20,
      marginBottom: 30,
    },
    featureItem: {
      fontSize: 15,
      color: "#333333",
      marginBottom: 14,
      lineHeight: 22,
      fontFamily: "System",
    },
    filterItem: {
      marginBottom: 16,
    },
    picker: {
      borderWidth: 1,
      borderColor: '#ddd',
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    dateSelector: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#ddd',
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 16,
      backgroundColor: '#fff',
    },
    dateText: {
      fontSize: 16,
      color: "#333333",
      fontFamily: "System",
    },
    statusFilter: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    statusChip: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 20,
      backgroundColor: '#e0e0e0',
      marginRight: 10,
      marginBottom: 8,
    },
    activeStatusChip: {
      backgroundColor: '#1a1a1a',
    },
    statusChipText: {
      fontSize: 14,
      color: '#333333',
      fontFamily: "System",
    },
    restaurantChip: {
      paddingVertical: 10,
      paddingHorizontal: 18,
      borderRadius: 20,
      backgroundColor: '#e0e0e0',
      marginRight: 10,
    },
    selectedChip: {
      backgroundColor: '#1a1a1a',
    },
    chipText: {
      fontSize: 14,
      color: '#333333',
      fontFamily: "System",
    },
    selectedChipText: {
      color: '#fff',
    },
    listContainer: {
      paddingBottom: 30,
    },
    reservationItem: {
      backgroundColor: '#ffffff',
      borderRadius: 16,
      padding: 18,
      marginBottom: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 4,
    },
    reservationHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14,
    },
    reservationTime: {
      fontSize: 18,
      fontWeight: "600",
      color: "#1a1a1a",
      fontFamily: "System",
    },
    statusBadge: {
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 8,
    },
    confirmedBadge: {
      backgroundColor: '#4CAF50',
    },
    pendingBadge: {
      backgroundColor: '#FF9800',
    },
    cancelledBadge: {
      backgroundColor: '#F44336',
    },
    defaultBadge: {
      backgroundColor: '#9E9E9E',
    },
    statusText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: 'bold',
      fontFamily: "System",
    },
    actionButtons: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: 16,
    },
    confirmButton: {
      backgroundColor: '#1a1a1a',
      borderRadius: 8,
      overflow: "hidden",
    },
    cancelButton: {
      backgroundColor: '#F44336',
      borderRadius: 8,
      overflow: "hidden",
    },
    callToAction: {
      fontSize: 16,
      fontWeight: "600",
      color: "#FFFFFF",
      paddingVertical: 12,
      paddingHorizontal: 24,
    },
    loadingContainer: {
      padding: 50,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyContainer: {
      marginTop: 50,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      width: '90%',
      backgroundColor: '#fff',
      borderRadius: 16,
      padding: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 5,
    },
    detailsModalContent: {
      width: '90%',
      maxHeight: '80%',
      backgroundColor: '#fff',
      borderRadius: 16,
      padding: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 5,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#eee',
    },
    modalTitle: {
      fontSize: 24,
      fontWeight: "800",
      color: "#1a1a1a",
      fontFamily: "System",
    },
    detailsContainer: {
      marginBottom: 24,
    },
    detailsStatusBadge: {
      alignSelf: 'flex-start',
      marginBottom: 20,
    },
    detailRow: {
      flexDirection: 'row',
      marginBottom: 14,
      alignItems: 'flex-start',
    },
    detailValue: {
      width: '60%',
      fontSize: 15,
      color: "#333333",
      fontFamily: "System",
    },
    ctaWrapper: {
      alignItems: 'center',
      width: '100%',
    },
  });
  export default AdminReservation;

