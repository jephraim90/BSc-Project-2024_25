import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    TouchableOpacity, 
    ActivityIndicator,
    TextInput,
    Alert,
    Image,
    Platform,
    KeyboardAvoidingView,
    SafeAreaView
  } from 'react-native';
  import React, { useState, useEffect, useCallback } from 'react';
  import { useRouter, useLocalSearchParams } from 'expo-router';
  import { Ionicons } from '@expo/vector-icons';
  import databaseService from '@/services/databaseService';
  import RestaurantService from '@/services/restaurantService';
  import RestaurantAPI from '@/services/RestaurantAPI';
  import { useAuth } from '@/contexts/AuthContext';
  import { debounce } from 'lodash';
  
  const EditReservation = () => {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    
    const [reservation, setReservation] = useState(null);
    const [restaurant, setRestaurant] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    
    // Form state
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [guests, setGuests] = useState('');
    const [specialRequests, setSpecialRequests] = useState('');
    const [availableTimes, setAvailableTimes] = useState([]);
    const [selectedMenuItems, setSelectedMenuItems] = useState([]);
    const [selectedTableIds, setSelectedTableIds] = useState([]);
    
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
            setError("Restaurant data not available");
            setLoading(false);
            return; // Exit if restaurant data fails
          }
    
          const restaurantData = restaurantResult.data;
          console.log("Restaurant data for booking : ", restaurantData);
          setRestaurant(restaurantData);
    
          // Initialize form state with reservation data
          setDate(reservationData.date || "");
          setTime(reservationData.time || "");
          setGuests(String(reservationData.guests) || "2"); // Ensure guests is a string
          setSpecialRequests(reservationData.specialRequests || "");
          setSelectedMenuItems(reservationData.selectedMenuItems || []);
    
          setLoading(false);
        } catch (err) {
          console.log("Error fetching reservation details:", err);
          setError(err.message || "Failed to load reservation details");
          setLoading(false);
        }
      };
    
      if (id) {
        fetchReservationDetails();
      }
    }, [id]);
    // Check availability when date or party size changes
    const checkAvailability = useCallback(
      debounce(async (restaurantData, selectedDate, partySize) => {
        if (!restaurantData || !selectedDate) return;
        
        try {
          const result = await RestaurantAPI.checkAvailability(
            restaurantData.id,
            selectedDate,
            parseInt(partySize)
          );
          
          if (result.success) {
            // Include the currently selected time even if it's no longer generally available
            // This is because we're editing an existing reservation
            if (time && !result.data.includes(time)) {
              setAvailableTimes([...result.data, time].sort());
            } else {
              setAvailableTimes(result.data);
            }
          } else {
            console.log('Error checking availability:', result.error);
          }
        } catch (err) {
          console.log('Error in availability check:', err);
        }
      }, 500),
      [time]
    );
    
    // Update availability when date or party size changes
    useEffect(() => {
      if (restaurant && date && guests) {
        checkAvailability(restaurant, date, guests);
      }
    }, [date, guests, restaurant, checkAvailability]);
    
    // Generate available dates for the next 7 days
    const generateAvailableDates = () => {
      const dates = [];
      const today = new Date();
      
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(today.getDate() + i);
        
        const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD format
        
        let label;
        if (i === 0) {
          label = 'Today';
        } else if (i === 1) {
          label = 'Tomorrow';
        } else {
          label = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        }
        
        dates.push({
          label,
          date,
          value: formattedDate
        });
      }
      
      return dates;
    };
    
    // Available dates
    const availableDates = generateAvailableDates();
    
    // Get label for a date
    const getDateLabel = (dateString) => {
      const dateObj = availableDates.find(d => d.value === dateString);
      return dateObj ? dateObj.label : dateString;
    };
    
    // Check if the user has permission to edit this reservation
    const hasPermission = () => {
      if (!user || !reservation) return false;
      
      // User owns this reservation
      if (user.uid === reservation.userId) return true;
      
      // User owns the restaurant
      if (restaurant && user.uid === restaurant.ownerId) return true;
      
      // User is an admin
      if (user.role === 'admin') return true;
      
      return false;
    };
    
    // Update a single menu item quantity
    const updateItemQuantity = (itemId, quantity) => {
      setSelectedMenuItems(prevItems => 
        prevItems.map(item => 
          item.id === itemId 
            ? { ...item, quantity: Math.max(1, quantity) } 
            : item
        )
      );
    };
    
    // Remove a menu item
    const removeMenuItem = (itemId) => {
      setSelectedMenuItems(prevItems => prevItems.filter(item => item.id !== itemId));
    };
    
    // Handle form submission
    const handleSubmit = async () => {
      try {
        if (!date || !time || !guests) {
          showPlatformAlert('Error', 'Please fill in all required fields', null);
          return;
        }
        
        setSubmitting(true);
        
        // Prepare updated data
        const updatedData = {
          date,
          time,
          guests: parseInt(guests),
          specialRequests: specialRequests.trim() || null,
          menuSelections: selectedMenuItems.length > 0 ? selectedMenuItems : null,
          tableIds: selectedTableIds.length > 0 ? selectedTableIds : null,
          status: 'confirmed',
          updatedAt: new Date().toISOString()
        };
        
        // Submit update
        const result = await RestaurantAPI.modifyReservation(id, updatedData);
        
        if (result.success) {
          showPlatformAlert(
            'Success',
            'Reservation updated successfully!',
            () => router.push(`/reservation/${id}`),  // Confirm action
            () => router.back()  // Cancel action
          );
        } else {
          throw new Error(result.error || 'Failed to update reservation');
        }
      } catch (err) {
        console.log('Error updating reservation:', err);
        showPlatformAlert('Error', err.message || 'Failed to update reservation', null);
      } finally {
        setSubmitting(false);
      }
    };
    
    if (loading) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1a1a1a" />
            <Text style={styles.loadingText}>Loading reservation details...</Text>
          </View>
        </SafeAreaView>
      );
    }
    
    if (error) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={64} color="#e53935" />
            <Text style={styles.errorTitle}>Error</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.button}
              onPress={() => router.back()}
            >
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
            <Text style={styles.errorText}>You don't have permission to edit this reservation.</Text>
            <TouchableOpacity 
              style={styles.button}
              onPress={() => router.back()}
            >
              <Text style={styles.buttonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }
    
    // Can't edit cancelled reservations
    if (reservation.status === 'cancelled') {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.errorContainer}>
            <Ionicons name="close-circle-outline" size={64} color="#e53935" />
            <Text style={styles.errorTitle}>Cannot Edit</Text>
            <Text style={styles.errorText}>This reservation has been cancelled and cannot be modified.</Text>
            <TouchableOpacity 
              style={styles.button}
              onPress={() => router.push(`/reservation/${id}`)}
            >
              <Text style={styles.buttonText}>View Reservation</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }
    
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{flex: 1}}
        >
          <ScrollView>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => router.back()}
              >
                <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Edit Reservation</Text>
              <View style={{ width: 24 }} />
            </View>
            
            {/* Restaurant Info */}
            {restaurant && (
              <View style={styles.restaurantCard}>
                <Image 
                  source={{ 
                    uri: restaurant.images?.[0] || 
                        'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80' 
                  }} 
                  style={styles.restaurantImage} 
                />
                <View style={styles.restaurantInfo}>
                  <Text style={styles.restaurantName}>{restaurant.name}</Text>
                  <Text style={styles.restaurantAddress}>{restaurant.address}</Text>
                </View>
              </View>
            )}
            
            {/* Form */}
            <View style={styles.formContainer}>
              {/* Date Selection */}
              <Text style={styles.sectionTitle}>Date</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.dateScrollContainer}
              >
                {availableDates.map((item, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={[
                      styles.dateItem,
                      date === item.value && styles.selectedDateItem
                    ]}
                    onPress={() => setDate(item.value)}
                  >
                    <Text 
                      style={[
                        styles.dateText,
                        date === item.value && styles.selectedDateText
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              {/* Time Selection */}
              <Text style={styles.sectionTitle}>Time</Text>
              <View style={styles.timeContainer}>
                {availableTimes.length > 0 ? (
                  availableTimes.map((item, index) => (
                    <TouchableOpacity 
                      key={index} 
                      style={[
                        styles.timeItem,
                        time === item && styles.selectedTimeItem
                      ]}
                      onPress={() => setTime(item)}
                    >
                      <Text 
                        style={[
                          styles.timeText,
                          time === item && styles.selectedTimeText
                        ]}
                      >
                        {item}
                      </Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={styles.noTimesText}>
                    {date ? 'No available times for selected date' : 'Select a date to see available times'}
                  </Text>
                )}
              </View>
              
              {/* Party Size */}
              <Text style={styles.sectionTitle}>Number of Guests</Text>
              <View style={styles.guestsContainer}>
                <TouchableOpacity 
                  style={styles.guestButton}
                  onPress={() => setGuests(prev => Math.max(1, parseInt(prev) - 1).toString())}
                >
                  <Ionicons name="remove" size={20} color="#1a1a1a" />
                </TouchableOpacity>
                
                <TextInput
                  style={styles.guestsInput}
                  value={guests}
                  onChangeText={text => {
                    // Only allow numbers
                    const numericValue = text.replace(/[^0-9]/g, '');
                    // Limit to reasonable party size
                    if (numericValue === '' || parseInt(numericValue) === 0) {
                      setGuests('1');
                    } else if (parseInt(numericValue) > 20) {
                      setGuests('20');
                    } else {
                      setGuests(numericValue);
                    }
                  }}
                  keyboardType="number-pad"
                  maxLength={2}
                />
                
                <TouchableOpacity 
                  style={styles.guestButton}
                  onPress={() => setGuests(prev => {
                    const newValue = parseInt(prev) + 1;
                    return newValue > 20 ? '20' : newValue.toString();
                  })}
                >
                  <Ionicons name="add" size={20} color="#1a1a1a" />
                </TouchableOpacity>
              </View>
              
              {/* Special Requests */}
              <Text style={styles.sectionTitle}>Special Requests (Optional)</Text>
              <TextInput
                style={styles.specialRequestsInput}
                placeholder="Enter any special requests or dietary requirements"
                placeholderTextColor="#999"
                multiline
                value={specialRequests}
                onChangeText={setSpecialRequests}
                maxLength={200}
              />
              <Text style={styles.characterCount}>
                {specialRequests.length}/200 characters
              </Text>
              
              {/* Menu Items */}
              {selectedMenuItems.length > 0 && (
                <View style={styles.menuItemsContainer}>
                  <Text style={styles.sectionTitle}>Pre-selected Menu Items</Text>
                  
                  {selectedMenuItems.map((item, index) => (
                    <View key={index} style={styles.menuItem}>
                      <View style={styles.menuItemInfo}>
                        <Text style={styles.menuItemName}>{item.name}</Text>
                        {item.specialInstructions && (
                          <Text style={styles.menuItemInstructions}>
                            {item.specialInstructions}
                          </Text>
                        )}
                      </View>
                      
                      <View style={styles.menuItemActions}>
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() => {
                            if (item.quantity <= 1) {
                              removeMenuItem(item.id);
                            } else {
                              updateItemQuantity(item.id, item.quantity - 1);
                            }
                          }}
                        >
                          <Ionicons name={item.quantity <= 1 ? "trash" : "remove"} size={18} color="#1a1a1a" />
                        </TouchableOpacity>
                        
                        <Text style={styles.quantityText}>{item.quantity}</Text>
                        
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() => updateItemQuantity(item.id, item.quantity + 1)}
                        >
                          <Ionicons name="add" size={18} color="#1a1a1a" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}
              
              {/* Reservation Summary */}
              <View style={styles.summaryContainer}>
                <Text style={styles.summaryTitle}>Reservation Summary</Text>
                
                <View style={styles.summaryRow}>
                  <View style={styles.summaryItem}>
                    <Ionicons name="calendar-outline" size={18} color="#666" />
                    <Text style={styles.summaryLabel}>Date</Text>
                    <Text style={styles.summaryValue}>{getDateLabel(date)}</Text>
                  </View>
                  
                  <View style={styles.summaryItem}>
                    <Ionicons name="time-outline" size={18} color="#666" />
                    <Text style={styles.summaryLabel}>Time</Text>
                    <Text style={styles.summaryValue}>{time || 'Not selected'}</Text>
                  </View>
                  
                  <View style={styles.summaryItem}>
                    <Ionicons name="people-outline" size={18} color="#666" />
                    <Text style={styles.summaryLabel}>Guests</Text>
                    <Text style={styles.summaryValue}>{guests}</Text>
                  </View>
                </View>
                
                {selectedMenuItems.length > 0 && (
                  <View style={styles.summaryDetail}>
                    <Ionicons name="restaurant-outline" size={18} color="#666" />
                    <Text style={styles.summaryDetailText}>
                      {selectedMenuItems.length} menu item(s) pre-selected
                    </Text>
                  </View>
                )}
              </View>
              
              {/* Submit Button */}
              <TouchableOpacity 
                style={[
                  styles.submitButton,
                  (!date || !time || !guests || submitting) && styles.disabledButton
                ]}
                onPress={handleSubmit}
                disabled={!date || !time || !guests || submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Update Reservation</Text>
                )}
              </TouchableOpacity>
              
              {/* Cancel Button */}
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => router.back()}
                disabled={submitting}
              >
                <Text style={styles.cancelButtonText}>Cancel Changes</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  };
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#fff',
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
    restaurantCard: {
      margin: 16,
      backgroundColor: '#fff',
      borderRadius: 12,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    restaurantImage: {
      width: '100%',
      height: 120,
    },
    restaurantInfo: {
      padding: 16,
    },
    restaurantName: {
      fontSize: 18,
      fontWeight: '700',
      marginBottom: 4,
      color: '#1a1a1a',
    },
    restaurantAddress: {
      fontSize: 14,
      color: '#666',
    },
    formContainer: {
      padding: 16,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginTop: 20,
      marginBottom: 12,
      color: '#1a1a1a',
    },
    dateScrollContainer: {
      paddingVertical: 5,
    },
    dateItem: {
      paddingHorizontal: 18,
      paddingVertical: 10,
      marginRight: 8,
      backgroundColor: '#f0f0f0',
      borderRadius: 25,
    },
    selectedDateItem: {
      backgroundColor: '#1a1a1a',
    },
    dateText: {
      fontSize: 14,
      color: '#444',
    },
    selectedDateText: {
      color: '#fff',
    },
    timeContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-start',
    },
    timeItem: {
      width: '23%',
      paddingVertical: 10,
      marginRight: '2%',
      marginBottom: 8,
      backgroundColor: '#f0f0f0',
      borderRadius: 8,
      alignItems: 'center',
    },
    selectedTimeItem: {
      backgroundColor: '#1a1a1a',
    },
    timeText: {
      fontSize: 14,
      color: '#444',
    },
    selectedTimeText: {
      color: '#fff',
    },
    noTimesText: {
      fontSize: 14,
      color: '#999',
      fontStyle: 'italic',
      padding: 10,
    },
    guestsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
    },
    guestButton: {
      width: 40,
      height: 40,
      backgroundColor: '#f0f0f0',
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    guestsInput: {
      minWidth: 50,
      marginHorizontal: 15,
      textAlign: 'center',
      fontSize: 20,
      fontWeight: '600',
    },
    specialRequestsInput: {
      borderWidth: 1,
      borderColor: '#ddd',
      borderRadius: 8,
      padding: 12,
      minHeight: 100,
      textAlignVertical: 'top',
      fontSize: 14,
    },
    characterCount: {
      fontSize: 12,
      color: '#999',
      textAlign: 'right',
      marginTop: 4,
    },
    menuItemsContainer: {
      marginTop: 20,
    },
    menuItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: '#f9f9f9',
      borderRadius: 8,
      marginBottom: 8,
    },
    menuItemInfo: {
      flex: 1,
    },
    menuItemName: {
      fontSize: 15,
      fontWeight: '600',
      color: '#1a1a1a',
    },
    menuItemInstructions: {
      fontSize: 13,
      color: '#666',
      marginTop: 4,
      fontStyle: 'italic',
    },
    menuItemActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    quantityButton: {
      backgroundColor: '#f0f0f0',
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quantityText: {
      fontSize: 16,
      fontWeight: '600',
      marginHorizontal: 12,
    },
    summaryContainer: {
      marginTop: 24,
      padding: 16,
      backgroundColor: '#f8f8f8',
      borderRadius: 8,
    },
    summaryTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: '#1a1a1a',
      marginBottom: 12,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    summaryItem: {
      alignItems: 'center',
      width: '30%',
    },
    summaryLabel: {
      fontSize: 12,
      color: '#666',
      marginTop: 4,
    },
    summaryValue: {
      fontSize: 14,
      fontWeight: '600',
      color: '#1a1a1a',
      marginTop: 2,
    },
    summaryDetail: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: '#eee',
    },
    summaryDetailText: {
      fontSize: 14,
      color: '#444',
      marginLeft: 8,
    },
    submitButton: {
      backgroundColor: '#1a1a1a',
      borderRadius: 8,
      paddingVertical: 15,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 24,
    },
    disabledButton: {
      backgroundColor: '#999',
    },
    submitButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    cancelButton: {
      paddingVertical: 15,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 12,
    },
    cancelButtonText: {
      color: '#e53935',
      fontSize: 16,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: '#666',
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    errorTitle: {
      fontSize: 20,
      fontWeight: '700',
      marginTop: 16,
      marginBottom: 8,
      color: '#1a1a1a',
    },
    errorText: {
      fontSize: 16,
      color: '#666',
      textAlign: 'center',
      marginBottom: 24,
    },
    button: {
      backgroundColor: '#1a1a1a',
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
    },
    buttonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
  });
  
  export default EditReservation;