import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Image,
  Share,
  Linking,
  Alert,
  Platform,
  ActivityIndicator,
  Switch,
} from "react-native";
import React, { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import databaseService from "@/services/databaseService";
import { useAuth } from "@/contexts/AuthContext";
import ScheduledRemindersDisplay from "@/components/ScheduledRemindersDisplay";
import notificationService from "@/services/notificationService";

const ReservationConfirmation = () => {
  const router = useRouter();
  const { reservationId, restaurantName, date, time, guests, useServerNotifications: initialServerNotifications } =
    useLocalSearchParams();
  const { user } = useAuth();

  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [useServerNotifications, setUseServerNotifications] = useState(
    initialServerNotifications === "true"
  );
  const [updatingNotifications, setUpdatingNotifications] = useState(false);
  const showPlatformAlert = (title, message, buttons = [], options = {}) => {
    if (Platform.OS === "web") {
      if (buttons.length === 0) {
        // Default to simple alert with OK button
        window.alert(`${title}\n\n${message}`);
        return;
      }
      
      // Handle confirm dialog with custom buttons
      const confirmation = window.confirm(
        `${title}\n\n${message}\n\n` + 
        buttons.map(b => b.text).join(' / ')
      );
      
      // Execute corresponding button handler
      confirmation ? buttons[1]?.onPress?.() : buttons[0]?.onPress?.();
    } else {
      // Mobile: Use native alert with default OK button if no buttons provided
      Alert.alert(
        title, 
        message,
        buttons.length > 0 ? buttons : undefined,
        options
      );
    }
  };

// Updated usage with OK button
showPlatformAlert(
  "Success", 
  "Switched to server notifications. You'll receive push notifications for this reservation.",
  Platform.OS === "web" ? [] : [{
    text: "OK",
    onPress: () => {} // Optional handler
  }]
);

  // Fetch reservation details if we have an ID
  useEffect(() => {
    const fetchReservation = async () => {
      if (!reservationId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const result = await databaseService.getDocumentById(
          "reservations",
          reservationId
        );

        if (!result.success) {
          throw new Error(
            result.error || "Failed to fetch reservation details"
          );
        }

        setReservation(result.data);
        
        // Update state based on actual reservation data
        if (result.data.serverNotifications !== undefined) {
          setUseServerNotifications(result.data.serverNotifications);
        }
      } catch (err) {
        console.log("Error fetching reservation:", err);
        setError(err.message || "Failed to load reservation details");
      } finally {
        setLoading(false);
      }
    };

    fetchReservation();
  }, [reservationId]);

  // Handle sharing the reservation
  const handleShare = async () => {
    const reservationInfo = reservation || {
      restaurantName: restaurantName || "the restaurant",
      date: date || "the selected date",
      time: time || "the selected time",
      guests: guests || "2",
    };

    try {
      await Share.share({
        message: `I just made a reservation at ${reservationInfo.restaurantName} on ${reservationInfo.date} at ${reservationInfo.time} for ${reservationInfo.guests} people!`,
        title: "My Restaurant Reservation",
      });
    } catch (error) {
      console.log("Error sharing reservation:", error);
    }
  };

  // Handle toggling notification type
  const handleToggleNotificationType = async (value) => {
    if (updatingNotifications || !reservationId) return;
    
    try {
      setUpdatingNotifications(true);
      
      if (value) {
        // Switching to server notifications
        
        // 1. Cancel any existing client-side reminders
        try {
          const cancelResult = await notificationService.cancelReservationReminders(reservationId);
          console.log("Canceled client reminders:", cancelResult);
        } catch (cancelError) {
          console.error("Error canceling reminders:", cancelError);
          // Continue even if this fails
        }
        
        // 2. Update reservation in database
        await databaseService.updateDocument("reservations", reservationId, {
          serverNotifications: true,
          clientRemindersScheduled: false,
          notificationConfigUpdatedAt: new Date().toISOString()
        });
        
        setUseServerNotifications(true);
        showPlatformAlert(
          "Success", 
          "Switched to server notifications. You'll receive push notifications for this reservation.",
          Platform.OS === "web" ? [] : [{
            text: "OK",
            onPress: () => {} // Optional handler
          }]
        );
        
      } else {
        // Switching to client-side notifications
        
        // 1. Update reservation in database
        await databaseService.updateDocument("reservations", reservationId, {
          serverNotifications: false,
          notificationConfigUpdatedAt: new Date().toISOString()
        });
        
        // 2. Schedule client-side reminders
        if (reservation) {
          // Parse the reservation date
          const reservationDate = new Date(reservation.date);
          
          const result = await notificationService.scheduleReservationReminders(
            reservationId,
            reservation.restaurantName,
            reservationDate,
            reservation.time,
            false // Not server-handled
          );
          
          if (result.success) {
            // Update reservation to indicate client reminders are scheduled
            await databaseService.updateDocument("reservations", reservationId, {
              clientRemindersScheduled: true,
              clientRemindersScheduledAt: new Date().toISOString()
            });
            
            setUseServerNotifications(false);
            showPlatformAlert(
              "Success", 
              "Switched to device notifications. Your device will show reminders at appropriate times.",
              Platform.OS === "web" ? [] : [{
                text: "OK",
                onPress: () => {} // Optional handler
              }]
            );
          } else {
            throw new Error(result.error || "Failed to schedule reminders");
          }
        } else {
          throw new Error("Reservation data not available");
        }
      }
      
    } catch (error) {
      console.error("Error updating notification preferences:", error);
      showPlatformAlert(
        "Error", 
        "Failed to update notification preferences. Please try again.",
        Platform.OS === "web" ? [] : [{
          text: "OK",
          onPress: () => {} // Optional handler
        }]
      );
      
      // Revert the switch to match actual state
      setUseServerNotifications(!value);
    } finally {
      setUpdatingNotifications(false);
    }
  };

  // Handle cancellation
  const handleCancelReservation = () => {
    showPlatformAlert(
      "Cancel Reservation",
      "Are you sure you want to cancel this reservation?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Confirm",
          onPress: async () => {
            if (!reservationId) return;

            try {
              // First cancel any scheduled reminders
              try {
                await notificationService.cancelReservationReminders(
                  reservationId
                );
                console.log(
                  "Reminders canceled for reservation:",
                  reservationId
                );
              } catch (reminderError) {
                console.log("Error canceling reminders:", reminderError);
                // Continue with reservation cancellation even if reminder cancellation fails
              }

              // Update reservation status in the database
              const result = await databaseService.updateDocument(
                "reservations",
                reservationId,
                {
                  status: "cancelled",
                  cancelledAt: new Date().toISOString(),
                }
              );

              if (result.success) {
                // Show cancellation notification
                try {
                  await notificationService.scheduleLocalNotification(
                    "Reservation Cancelled",
                    `Your reservation at ${reservation ? reservation.restaurantName : restaurantName} has been cancelled.`,
                    {
                      type: "reservation_update",
                      reservationId: reservationId,
                      status: "cancelled",
                    },
                    1 // Show after 1 second
                  );
                } catch (notificationError) {
                  console.log(
                    "Error showing cancellation notification:",
                    notificationError
                  );
                  // Continue even if notification fails
                }

                showPlatformAlert(
                  "Success", 
                  "Your reservation has been cancelled.",
                  Platform.OS === "web" ? [] : [{
                    text: "OK",
                    onPress: () => {} // Optional handler
                  }]
                );
                router.replace("/profile");
              } else {
                throw new Error(result.error || "Failed to cancel reservation");
              }
            } catch (err) {
              console.log("Error cancelling reservation:", err);
              showPlatformAlert(
                "Error",
                err.message || "Failed to cancel reservation"
              );
            }
          },
        },
      ]
    );
  };

  // If the page is loaded without reservation params, show an error
  if (!loading && !reservation && !reservationId && !restaurantName) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#e53935" />
          <Text style={styles.errorTitle}>No Reservation Found</Text>
          <Text style={styles.errorText}>
            We couldn't find any reservation details. Please try making a new
            reservation.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push("/restaurants")}
          >
            <Text style={styles.buttonText}>Find Restaurants</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Use either fetched reservation data or URL params as fallback
  const reservationData = reservation || {
    restaurantName: restaurantName || "Restaurant",
    date: date || "Unknown date",
    time: time || "Unknown time",
    guests: guests || "2",
    id: reservationId,
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push("/restaurants")}
          >
            <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reservation Confirmed</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Success Animation */}
        <View style={styles.successContainer}>
          <View style={styles.successCircle}>
            <Ionicons name="checkmark" size={64} color="#FFFFFF" />
          </View>
          <Text style={styles.successTitle}>Booking Confirmed!</Text>
          <Text style={styles.successMessage}>
            Your reservation has been successfully confirmed. We've sent the
            details to your email.
          </Text>
        </View>

        {/* Reservation Details Card */}
        <View style={styles.detailsCard}>
          <Text style={styles.detailsTitle}>Reservation Details</Text>

          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <Ionicons name="restaurant-outline" size={24} color="#1a1a1a" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Restaurant</Text>
              <Text style={styles.detailValue}>
                {reservationData.restaurantName}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <Ionicons name="calendar-outline" size={24} color="#1a1a1a" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>{reservationData.date}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <Ionicons name="time-outline" size={24} color="#1a1a1a" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Time</Text>
              <Text style={styles.detailValue}>{reservationData.time}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <Ionicons name="people-outline" size={24} color="#1a1a1a" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Party Size</Text>
              <Text style={styles.detailValue}>
                {reservationData.guests}{" "}
                {parseInt(reservationData.guests) === 1 ? "Person" : "People"}
              </Text>
            </View>
          </View>

          {reservationData.specialRequests && (
            <>
              <View style={styles.divider} />

              <View style={styles.detailRow}>
                <View style={styles.detailIconContainer}>
                  <Ionicons
                    name="document-text-outline"
                    size={24}
                    color="#1a1a1a"
                  />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Special Requests</Text>
                  <Text style={styles.detailValue}>
                    {reservationData.specialRequests}
                  </Text>
                </View>
              </View>
            </>
          )}

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <Ionicons name="code-outline" size={24} color="#1a1a1a" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Confirmation Code</Text>
              <Text style={styles.confirmationCode}>
                {
                  // Generate a code based on the reservation ID or use a random one if not available
                  reservationData.id
                    ? reservationData.id.substring(0, 6).toUpperCase()
                    : "ABC" + Math.floor(1000 + Math.random() * 9000)
                }
              </Text>
            </View>
          </View>
        </View>


        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={24} color="#1a1a1a" />
            <Text style={styles.actionButtonText}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push("/restaurants")}
          >
            <Ionicons name="restaurant-outline" size={24} color="#1a1a1a" />
            <Text style={styles.actionButtonText}>Browse Restaurants</Text>
          </TouchableOpacity>
        </View>

        {/* Cancellation Information */}
        <View style={styles.cancellationContainer}>
          <Text style={styles.cancellationTitle}>Cancellation Policy</Text>
          <Text style={styles.cancellationText}>
            You can cancel this reservation up to 2 hours before your scheduled
            time without any charges.
          </Text>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancelReservation}
          >
            <Text style={styles.cancelButtonText}>Cancel Reservation</Text>
          </TouchableOpacity>
        </View>

        {/* Contact Info */}
        <View style={styles.contactContainer}>
          <Text style={styles.contactTitle}>Need Help?</Text>
          <Text style={styles.contactText}>
            If you need to make changes to your reservation or have any
            questions, please contact the restaurant directly.
          </Text>
          <TouchableOpacity
            style={styles.contactButton}
            onPress={() => {
              Linking.openURL(`tel:+1234567890`);
            }}
          >
            <Ionicons name="call-outline" size={18} color="#1a1a1a" />
            <Text style={styles.contactButtonText}>Call Restaurant</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a1a1a",
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
    color: "#1a1a1a",
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#1a1a1a",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  successContainer: {
    alignItems: "center",
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  successCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 10,
  },
  successMessage: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  detailsCard: {
    marginHorizontal: 16,
    marginVertical: 20,
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    paddingVertical: 12,
  },
  detailIconContainer: {
    width: 40,
    alignItems: "center",
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1a1a1a",
  },
  confirmationCode: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    letterSpacing: 1,
  },
  divider: {
    height: 1,
    backgroundColor: "#EEEEEE",
  },
  actionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginVertical: 10,
  },
  actionButton: {
    flex: 1,
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    borderRadius: 8,
    marginHorizontal: 5,
  },
  actionButtonText: {
    fontSize: 12,
    color: "#1a1a1a",
    marginTop: 6,
  },
  cancellationContainer: {
    marginHorizontal: 16,
    marginTop: 24,
    padding: 16,
    backgroundColor: "#FFF8E1",
    borderRadius: 12,
  },
  cancellationTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  cancellationText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "#E53935",
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  cancelButtonText: {
    fontSize: 14,
    color: "#E53935",
    fontWeight: "500",
  },
  contactContainer: {
    marginHorizontal: 16,
    marginTop: 24,
    padding: 16,
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  contactText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  contactButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  contactButtonText: {
    fontSize: 14,
    color: "#1a1a1a",
    fontWeight: "500",
    marginLeft: 8,
  },
  // Notification preference styles
  notificationPreferenceCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  notificationOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1a1a1a",
    marginBottom: 2,
  },
  notificationDescription: {
    fontSize: 14,
    color: "#666",
  },
  updatingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 10,
  },
  updatingText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
  },
});

export default ReservationConfirmation;