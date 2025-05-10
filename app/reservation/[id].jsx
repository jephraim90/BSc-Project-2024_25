import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Modal,
  SafeAreaView,
} from "react-native";
import React, { useState, useEffect } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import databaseService from "@/services/databaseService";
import RestaurantService from "@/services/restaurantService";
import RestaurantAPI from "@/services/RestaurantAPI";
import { useAuth } from "@/contexts/AuthContext";
import QRCode from "react-native-qrcode-svg";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import ViewShot from "react-native-view-shot";
import StyledReservationCard from "@/components/StyledReservationCard";
import ShareReservationModal from '@/components/ShareReservationModal';
import ReservationGuestsList from '@/components/ReservationGuestsList';
import reservationSharingService from '@/services/reservationSharingService';

const ReservationDetails = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const viewShotRef = React.useRef();

  const [reservation, setReservation] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrSharingInProgress, setQrSharingInProgress] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isInvitedGuest, setIsInvitedGuest] = useState(false);
  const [permissionCheckComplete, setPermissionCheckComplete] = useState(false);
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

  const handleShareWithUsers = () => {
    setShowShareModal(true);
  };

  useEffect(() => {
  const fetchReservationDetails = async () => {
    try {
      setLoading(true);

      // Fetch reservation data
      const reservationResult = await databaseService.getDocumentById(
        "reservations",
        id
      );
      console.log("Your reservation Details", reservationResult);

      if (!reservationResult.success || !reservationResult.data) {
        throw new Error("Reservation not found");
      }

      const reservationData = reservationResult.data;
      console.log("Your reservation Data", reservationData);
      setReservation(reservationData);

      // Fetch associated restaurant data
      const restaurantResult = await RestaurantService.getRestaurantById(
        reservationData.restaurantId
      );

      if (!restaurantResult || !restaurantResult.data) {
        console.log("Restaurant data not found");
        // Handle the error appropriately - don't proceed to setRestaurant
        setError("Restaurant data not available");
        setLoading(false);
        return; 
      }

      const restaurantData = restaurantResult.data;
      console.log("Restaurant data for booking : ", restaurantData);
      setRestaurant(restaurantData);

      // Default invited status to false
      let invitedStatus = false;

      // Check if the current user is an invited guest
      if (user && user.uid !== reservationData.userId) {
        try {
          console.log("Checking for shared reservation:", id, user.uid);

          const sharedReservationResult =
            await reservationSharingService.checkIfSharedWithUser(id, user.uid);

          console.log(
            "Shared reservation check result:",
            sharedReservationResult
          );

          if (
            sharedReservationResult.success &&
            sharedReservationResult.isShared
          ) {
            invitedStatus = true;
          }
        } catch (err) {
          console.log("Error checking invitation:", err);
        }
      }

      // Set both states after all async operations are complete
      setIsInvitedGuest(invitedStatus);
      setPermissionCheckComplete(true);
      setLoading(false);
    } catch (err) {
      console.log("Error fetching reservation details:", err);
      setError(err.message || "Failed to load reservation details");
      setPermissionCheckComplete(true);
      setLoading(false);
    }
  };

  if (id) {
    fetchReservationDetails();
  }
}, [id, user]);


  // Check if the user has permission to view this reservation
  const hasPermission = () => {
    console.log("User:", user);
    console.log("Reservation:", reservation);
    console.log("Is invited guest:", isInvitedGuest);
  
    if (!user || !reservation) {
      console.log("No user or reservation");
      return false;
    }
  
    // User owns this reservation
    if (user.uid === reservation.userId) {
      console.log("User owns reservation");
      return true;
    }
  
    // User owns the restaurant
    if (restaurant && user.uid === restaurant.ownerId) {
      console.log("User owns restaurant");
      return true;
    }
  
    // User is an admin
    if (user.role === "admin") {
      console.log("User is admin");
      return true;
    }
  
    // An Invited Guest
    if (isInvitedGuest) {
      console.log("User is invited guest");
      return true;
    }
  
    console.log("No permission match");
    return false;
  };
// Only render the content when both loading and permission check are complete
if (loading || !permissionCheckComplete) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a1a1a" />
        <Text style={styles.loadingText}>Loading reservation details...</Text>
      </View>
    </SafeAreaView>
  );
}
  // Format date
  const formatDate = (dateString) => {
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "N/A";

    // Handle Firestore timestamp objects
    if (timestamp.seconds) {
      return new Date(timestamp.seconds * 1000).toLocaleString();
    }

    // Handle ISO strings
    return new Date(timestamp).toLocaleString();
  };

  

  // Handle sharing QR code
  const handleShareQRCode = async () => {
    setShowQRModal(true);
  };

  // Save and share QR code image
  const saveAndShareQRCode = async () => {
    if (!viewShotRef.current) return;
  
    try {
      setQrSharingInProgress(true);
  
      // Capture the view as an image
      const uri = await viewShotRef.current.capture();
      
      // Check if we're on web platform
      if (Platform.OS === "web") {
        // For web, use Web Share API if available
        if (navigator.share && uri) {
          try {
            // For web, we need to convert the image to a blob to share it
            const response = await fetch(uri);
            const blob = await response.blob();
            const file = new File([blob], `reservation-${id}.png`, { type: 'image/png' });
            
            await navigator.share({
              title: 'Reservation QR Code',
              text: 'Here is my reservation QR Code',
              files: [file]
            });
          } catch (webShareError) {
            // Web Share API might not support sharing files in all browsers
            // Fallback to sharing just the URI if possible
            try {
              await navigator.share({
                title: 'Reservation QR Code',
                text: 'Here is my reservation QR Code',
                url: uri
              });
            } catch (fallbackError) {
              console.log("Web sharing not fully supported:", fallbackError);
              
              // Fallback option: open in new tab so user can save/share manually
              const newTab = window.open();
              if (newTab) {
                newTab.document.write(`<img src="${uri}" alt="Reservation QR Code" style="max-width:100%"/>`);
                newTab.document.title = "Reservation QR Code";
              } else {
                alert("Unable to share. Please try saving the image manually.");
              }
            }
          }
        } else {
          // If Web Share API is not available, open in new tab
          const newTab = window.open();
          if (newTab) {
            newTab.document.write(`<img src="${uri}" alt="Reservation QR Code" style="max-width:100%"/>`);
            newTab.document.title = "Reservation QR Code";
          } else {
            alert("Unable to share. Please try saving the image manually.");
          }
        }
      } else if (uri) {
        // Handle native platforms (iOS and Android)
        
        if (Platform.OS === "android") {
          const fileUri = `${FileSystem.cacheDirectory}reservation_qr_${id}.png`;
          await FileSystem.copyAsync({
            from: uri,
            to: fileUri,
          });
  
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri, {
              mimeType: "image/png",
              dialogTitle: "Share Reservation QR Code",
            });
          } else {
            Alert.alert(
              "Sharing not available",
              "Sharing is not available on this device"
            );
          }
        } else {
          // iOS handling
          
          if (uri.startsWith('file://')) {
            if (await Sharing.isAvailableAsync()) {
              await Sharing.shareAsync(uri, {
                mimeType: "image/png",
                UTI: "public.png", // Specific to iOS
                dialogTitle: "Share Reservation QR Code",
              });
            } else {
              Alert.alert(
                "Sharing not available",
                "Sharing is not available on this device"
              );
            }
          } else {
            // If the URI is not a file URI, save it to a file first
            const fileUri = `${FileSystem.cacheDirectory}reservation_qr_${id}.png`;
            await FileSystem.copyAsync({
              from: uri,
              to: fileUri,
            });
            
            if (await Sharing.isAvailableAsync()) {
              await Sharing.shareAsync(fileUri, {
                mimeType: "image/png",
                UTI: "public.png",
                dialogTitle: "Share Reservation QR Code",
              });
            }
          }
        }
      } else {
        throw new Error("Failed to capture QR code image");
      }
    } catch (error) {
      console.log("Error sharing QR code:", error);
      
      // Use Alert on native platforms and window.alert on web
      if (Platform.OS === "web") {
        alert("Failed to share QR code");
      } else {
        Alert.alert("Error", "Failed to share QR code");
      }
    } finally {
      setQrSharingInProgress(false);
    }
  };

  // Handle reservation cancellation
  const handleCancelReservation = async () => {
    showPlatformAlert(
      "Cancel Reservation",
      Platform.OS === "web" 
        ? "Are you sure you want to cancel this reservation?\n\nThis action cannot be undone."
        : "Are you sure you want to cancel this reservation?",
      async () => {
        try {
          setCancelling(true);
          const result = await RestaurantAPI.cancelReservation(id);
  
          if (result.success) {
            showPlatformAlert(
              "Reservation Cancelled",
              "Your reservation has been successfully cancelled.",
              () => router.back()
            );
          } else {
            throw new Error(result.error || "Failed to cancel reservation");
          }
        } catch (err) {
          console.log("Error cancelling reservation:", err);
          showPlatformAlert(
            "Error",
            err.message || "Failed to cancel reservation"
          );
        } finally {
          setCancelling(false);
        }
      },
      () => {} // Cancel handler
    );
  };
  
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#e53935" />
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.button} onPress={() => router.back()}>
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!hasPermission()) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="lock-closed" size={64} color="#e53935" />
          <Text style={styles.errorTitle}>Access Denied</Text>
          <Text style={styles.errorText}>
            You don't have permission to view this reservation.
          </Text>
          <TouchableOpacity style={styles.button} onPress={() => router.back()}>
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
  <TouchableOpacity 
    style={styles.backButton}
    onPress={() => router.back()}
  >
    <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
  </TouchableOpacity>
  <Text style={styles.headerTitle}>Reservation Details</Text>
  <View style={styles.headerButtons}>
    <TouchableOpacity 
      style={styles.shareButton}
      onPress={handleShareWithUsers}
    >
      <Ionicons name="people-outline" size={24} color="#1a1a1a" />
    </TouchableOpacity>
    <TouchableOpacity 
      style={styles.shareButton}
      onPress={handleShareQRCode}
    >
      <Ionicons name="qr-code-outline" size={24} color="#1a1a1a" />
    </TouchableOpacity>
  </View>
</View>

        {/* Reservation Status */}
        <View
          style={[
            styles.statusContainer,
            reservation.status === "confirmed" && styles.statusConfirmed,
            reservation.status === "cancelled" && styles.statusCancelled,
            reservation.status === "completed" && styles.statusCompleted,
            reservation.status === "pending" && styles.statusPending,
          ]}
        >
          <Text style={styles.statusText}>
            {reservation.status.charAt(0).toUpperCase() +
              reservation.status.slice(1)}
          </Text>
        </View>

        {/* Restaurant Info */}
       
        {restaurant && (
          <TouchableOpacity
            style={styles.restaurantCard}
            onPress={() => router.push(`/restaurant/${restaurant.id}`)}
          >
            <Image
              source={{
                uri:
                  restaurant.images?.[0] ||
                  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80",
              }}
              style={styles.restaurantImage}
            />
            <View style={styles.restaurantInfo}>
              <Text style={styles.restaurantName}>{restaurant.name}</Text>
              <View style={styles.restaurantDetail}>
                <Ionicons name="location-outline" size={16} color="#666" />
                <Text style={styles.restaurantDetailText}>
                  {restaurant.address}
                </Text>
              </View>
              <View style={styles.restaurantDetail}>
                <Ionicons name="call-outline" size={16} color="#666" />
                <Text style={styles.restaurantDetailText}>
                  {restaurant.phone}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* Reservation Details */}
        <View style={styles.detailsContainer}>
          <Text style={styles.sectionTitle}>Reservation Details</Text>

          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Ionicons name="calendar-outline" size={24} color="#666" />
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>
                {formatDate(reservation.date)}
              </Text>
            </View>

            <View style={styles.detailItem}>
              <Ionicons name="time-outline" size={24} color="#666" />
              <Text style={styles.detailLabel}>Time</Text>
              <Text style={styles.detailValue}>{reservation.time}</Text>
            </View>

            <View style={styles.detailItem}>
              <Ionicons name="people-outline" size={24} color="#666" />
              <Text style={styles.detailLabel}>Guests</Text>
              <Text style={styles.detailValue}>{reservation.guests}</Text>
            </View>
          </View>

          {/* Selected Tables */}
          {reservation.tableIds && reservation.tableIds.length > 0 && (
            <View style={styles.infoSection}>
              <View style={styles.infoHeader}>
                <Ionicons name="grid-outline" size={20} color="#666" />
                <Text style={styles.infoHeaderText}>Selected Tables</Text>
              </View>
              <Text style={styles.infoContent}>
                {reservation.tableIds.join(", ")}
              </Text>
            </View>
          )}

          {/* Special Requests */}
          {reservation.specialRequests && (
            <View style={styles.infoSection}>
              <View style={styles.infoHeader}>
                <Ionicons name="chatbubble-outline" size={20} color="#666" />
                <Text style={styles.infoHeaderText}>Special Requests</Text>
              </View>
              <Text style={styles.infoContent}>
                {reservation.specialRequests}
              </Text>
            </View>
          )}

          {/* Menu Selections */}
          {reservation.menuSelections &&
            reservation.menuSelections.length > 0 && (
              <View style={styles.menuSelections}>
                <View style={styles.infoHeader}>
                  <Ionicons name="restaurant-outline" size={20} color="#666" />
                  <Text style={styles.infoHeaderText}>
                    Pre-selected Menu Items
                  </Text>
                </View>

                {reservation.menuSelections.map((item, index) => (
                  <View key={index} style={styles.menuItem}>
                    <View style={styles.menuItemDetails}>
                      <Text style={styles.menuItemName}>{item.name}</Text>
                      {item.specialInstructions && (
                        <Text style={styles.menuItemInstructions}>
                          Special instructions: {item.specialInstructions}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.menuItemQuantity}>
                      x{item.quantity}
                    </Text>
                  </View>
                ))}
              </View>
            )}
        </View>
        {/* Guests List */}
<View style={styles.guestsListContainer}>
  <View style={styles.infoHeader}>
    <Ionicons name="people-outline" size={20} color="#666" />
    <Text style={styles.infoHeaderText}>Guests Joining You</Text>
  </View>
  
  <ReservationGuestsList reservationId={id} />
</View>

        {/* Reservation Metadata */}
        <View style={styles.metadataContainer}>
          <Text style={styles.metadataLabel}>Reservation ID:</Text>
          <Text style={styles.metadataValue}>{id}</Text>

          <Text style={styles.metadataLabel}>Created:</Text>
          <Text style={styles.metadataValue}>
            {formatTimestamp(reservation.createdAt)}
          </Text>

          {reservation.status === "cancelled" && reservation.cancelledAt && (
            <>
              <Text style={styles.metadataLabel}>Cancelled:</Text>
              <Text style={styles.metadataValue}>
                {formatTimestamp(reservation.cancelledAt)}
              </Text>
            </>
          )}
        </View>

        {/* Actions */}
        {reservation.status === "confirmed" && (
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => router.push(`/reservation/edit/${id}`)}
            >
              <Ionicons name="create-outline" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Modify</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cancelButton, cancelling && styles.disabledButton]}
              onPress={handleCancelReservation}
              disabled={cancelling}
            >
              {cancelling ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons
                    name="close-circle-outline"
                    size={20}
                    color="#fff"
                  />
                  <Text style={styles.actionButtonText}>
                    Cancel Reservation
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* QR Code Modal */}
      <Modal
        visible={showQRModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowQRModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reservation QR Code</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowQRModal(false)}
              >
                <Ionicons name="close" size={24} color="#1a1a1a" />
              </TouchableOpacity>
            </View>

            <ViewShot
              ref={viewShotRef}
              options={{ format: "png", quality: 0.9 }}
              style={styles.qrCardContainer}
            >
              <StyledReservationCard
                restaurant={restaurant}
                reservation={reservation}
                reservationId={id}
              />
            </ViewShot>

            <Text style={styles.qrInstructions}>
              Present this QR code to the restaurant staff when you arrive. It
              contains all your reservation details for verification.
            </Text>

            <TouchableOpacity
              style={styles.shareQrButton}
              onPress={saveAndShareQRCode}
              disabled={qrSharingInProgress}
            >
              {qrSharingInProgress ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="share-outline" size={20} color="#fff" />
                  <Text style={styles.shareQrButtonText}>Share QR Code</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <ShareReservationModal
  visible={showShareModal}
  onClose={() => setShowShareModal(false)}
  reservationId={id}
  userId={user?.uid}
  restaurantName={restaurant?.name || ''}
  reservationDate={reservation ? formatDate(reservation.date) : ''}
  reservationTime={reservation?.time || ''}
/>
    </SafeAreaView>
  
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
header: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingHorizontal: 16,
  paddingVertical: 12,
  borderBottomWidth: 1,
  borderBottomColor: '#f0f0f0',
},
headerTitle: {
  fontSize: 18,
  fontWeight: '600',
  color: '#1a1a1a',
},
  backButton: {
    padding: 8,
  },
shareButton: {
  padding: 8,
  marginLeft: 4,
},
headerButtons: {
  flexDirection: 'row',
  alignItems: 'center',
},
  statusContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  statusConfirmed: {
    backgroundColor: "#e1f5fe",
  },
  statusCancelled: {
    backgroundColor: "#ffebee",
  },
  statusCompleted: {
    backgroundColor: "#e8f5e9",
  },
  statusPending: {
    backgroundColor: "#fff8e1",
  },
  statusText: {
    fontWeight: "600",
    fontSize: 14,
  },
  restaurantCard: {
    margin: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  restaurantImage: {
    width: "100%",
    height: 150,
  },
  restaurantInfo: {
    padding: 16,
  },
  restaurantName: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
    color: "#1a1a1a",
  },
  restaurantDetail: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  restaurantDetailText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#666",
  },
  detailsContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
    color: "#1a1a1a",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  detailItem: {
    alignItems: "center",
    width: "30%",
  },
  detailLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a1a",
    marginTop: 4,
    textAlign: "center",
  },
  infoSection: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#eee",
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  infoHeaderText: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
    color: "#1a1a1a",
  },
  infoContent: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  menuSelections: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#eee",
  },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  menuItemDetails: {
    flex: 1,
  },
  menuItemName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  menuItemInstructions: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
    fontStyle: "italic",
  },
  menuItemQuantity: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a1a",
    marginLeft: 16,
  },
  metadataContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
  },
  metadataLabel: {
    fontSize: 12,
    color: "#666",
  },
  metadataValue: {
    fontSize: 14,
    color: "#1a1a1a",
    marginBottom: 8,
  },
  actionsContainer: {
    margin: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  editButton: {
    backgroundColor: "#1976d2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
  },
  cancelButton: {
    backgroundColor: "#e53935",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: "#999",
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
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
    fontSize: 20,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 8,
    color: "#1a1a1a",
  },
  errorText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#1a1a1a",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  // QR Code Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "90%",
    maxWidth: 400,
    padding: 20,
    alignItems: "center",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  closeButton: {
    padding: 4,
  },
  qrContainer: {
    width: "100%",
    alignItems: "center",
    marginBottom: 20,
  },
  qrCodeCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    alignItems: "center",
    width: "100%",
  },
  qrHeader: {
    alignItems: "center",
    marginBottom: 16,
    width: "100%",
  },
  qrRestaurantName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  qrReservationInfo: {
    fontSize: 14,
    color: "#444",
    marginBottom: 2,
  },
  qrGuestInfo: {
    fontSize: 14,
    color: "#444",
  },
  qrCodeWrapper: {
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 8,
    marginVertical: 16,
  },
  qrFooter: {
    alignItems: "center",
    width: "100%",
  },
  qrReservationId: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  qrStatus: {
    fontSize: 14,
    fontWeight: "600",
    color: (reservation) =>
      reservation?.status === "confirmed"
        ? "#4CAF50"
        : reservation?.status === "cancelled"
        ? "#F44336"
        : reservation?.status === "completed"
        ? "#2196F3"
        : "#FF9800",
  },
  qrInstructions: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  shareQrButton: {
    backgroundColor: "#1a1a1a",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: "100%",
  },
  shareQrButtonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "90%",
    maxWidth: 400,
    padding: 20,
    alignItems: "center",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  closeButton: {
    padding: 4,
  },
  qrCardContainer: {
    width: "100%",
    alignItems: "center",
    marginBottom: 20,
  },
  qrInstructions: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  shareQrButton: {
    backgroundColor: "#1a1a1a",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: "100%",
  },
  shareQrButtonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 8,
  },
  guestsListContainer: {
  margin: 16,
  padding: 16,
  backgroundColor: '#fff',
  borderRadius: 12,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 2,
  elevation: 1,
},
});

export default ReservationDetails;