import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    TouchableOpacity, 
    TextInput,
    Image,
    SafeAreaView,
    Share,
    Platform,
    KeyboardAvoidingView,
    ActivityIndicator,
    Alert
  } from 'react-native';
  import React, { useState, useEffect } from 'react';
  import { Ionicons } from '@expo/vector-icons';
  import { useRouter, useLocalSearchParams } from 'expo-router';
  import RestaurantService from '@/services/restaurantService';
  import { useAuth } from '@/contexts/AuthContext';
  import databaseService from '@/services/databaseService';
  
  const Reservation = () => {
    const router = useRouter();
    const { id } = useLocalSearchParams(); // Get restaurant ID from URL params
    const { user } = useAuth(); // Get current user from auth context
    
    // State for restaurant data
    const [restaurant, setRestaurant] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Reservation state
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [guests, setGuests] = useState('2');
    const [specialRequests, setSpecialRequests] = useState('');
    const [availableTimes, setAvailableTimes] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [loadingTimes, setLoadingTimes] = useState(false);
  
    // Fetch restaurant data
    useEffect(() => {
      const fetchRestaurantData = async () => {
        try {
          setLoading(true);
          if (!id) {
            throw new Error('Restaurant ID is required');
          }
          
          const restaurantData = await RestaurantService.getRestaurantById(id);
          if (!restaurantData) {
            throw new Error('Restaurant not found');
          }
          
          setRestaurant(restaurantData);
          
          // Generate available dates and times based on restaurant's business hours
          generateAvailableTimes(restaurantData);
        } catch (err) {
          console.log('Error fetching restaurant:', err);
          setError(err.message || 'Failed to load restaurant');
        } finally {
          setLoading(false);
        }
      };
  
      fetchRestaurantData();
    }, [id]);
  
    // Generate available dates for next 7 days
    const generateAvailableDates = () => {
      const dates = [];
      const today = new Date();
      
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(today.getDate() + i);
        
        let label;
        if (i === 0) {
          label = 'Today';
        } else if (i === 1) {
          label = 'Tomorrow';
        } else {
          label = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        }
        
        // Add date object to allow easier comparison and formatting later
        dates.push({
          label,
          date,
          value: date.toISOString().split('T')[0] // YYYY-MM-DD format
        });
      }
      
      return dates;
    };
  
    // Generate available time slots based on restaurant's business hours
    const generateAvailableTimes = (restaurantData) => { 
      const defaultTimes = [
        '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', 
        '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM'
      ];
      
      // If restaurant has business hours, use them to generate available times
      if (restaurantData?.businessHours) {
        // check the day of week
        // and generate times within the restaurant's opening hours
      }
      
      setAvailableTimes(defaultTimes);
    };
  
    // Available dates
    const availableDates = generateAvailableDates();
  
    // Handle share reservation
    const handleShare = async () => {
      if (!restaurant) return;
      
      try {
        const result = await Share.share({
          message: `I'm going to ${restaurant.name} on ${date} at ${time} for ${guests} people! Join me!`,
          title: 'My Reservation at ' + restaurant.name,
        });
        
        if (result.action === Share.sharedAction) {
          if (result.activityType) {
            console.log('Shared with activity type of: ' + result.activityType);
          } else {
            console.log('Shared');
          }
        } else if (result.action === Share.dismissedAction) {
          console.log('Share dismissed');
        }
      } catch (error) {
        console.log(error.message);
      }
    };
  
    // Handle reservation submission
    const handleReserve = async () => {
      if (!restaurant || !date || !time || !user) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }
      
      try {
        setSubmitting(true);
        
        // Format date for storage
        const selectedDateObj = availableDates.find(d => d.label === date)?.date || new Date();
        const formattedDate = selectedDateObj.toISOString().split('T')[0]; // YYYY-MM-DD
        
        // Create reservation data
        const reservationData = {
          restaurantId: restaurant.id,
          restaurantName: restaurant.name,
          userId: user.uid,
          userName: user.displayName || 'Guest',
          userEmail: user.email,
          date: formattedDate,
          time,
          guests: parseInt(guests),
          specialRequests: specialRequests.trim() || null,
          status: 'confirmed', // Options: confirmed, pending, cancelled, completed
          createdAt: new Date().toISOString()
        };
        
        // Save reservation to database
        const result = await databaseService.createDocument('reservations', reservationData);
        
        if (result.success) {
          // Navigate to confirmation page with reservation ID
          router.push({
            pathname: '/reservation/confirmation',
            params: { 
              reservationId: result.id,
              restaurantName: restaurant.name,
              date: date,
              time: time,
              guests: guests
            }
          });
        } else {
          throw new Error(result.error || 'Failed to create reservation');
        }
      } catch (err) {
        console.log('Error creating reservation:', err);
        Alert.alert('Error', err.message || 'Failed to create reservation. Please try again.');
      } finally {
        setSubmitting(false);
      }
    };
  
    // Render loading state
    if (loading) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1a1a1a" />
            <Text style={styles.loadingText}>Loading restaurant details...</Text>
          </View>
        </SafeAreaView>
      );
    }
  
    // Render error state
    if (error) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={64} color="#e53935" />
            <Text style={styles.errorTitle}>Oops!</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={() => router.back()}
            >
              <Text style={styles.retryButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }
  
    // If user is not logged in, show login prompt
    if (!user) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.errorContainer}>
            <Ionicons name="person-circle-outline" size={64} color="#1a1a1a" />
            <Text style={styles.errorTitle}>Login Required</Text>
            <Text style={styles.errorText}>
              You need to be logged in to make a reservation.
            </Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={() => router.push('/auth')}
            >
              <Text style={styles.retryButtonText}>Login / Sign Up</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }
  
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Make a Reservation</Text>
              <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
                <Ionicons name="share-social-outline" size={24} color="#1a1a1a" />
              </TouchableOpacity>
            </View>
  
            {/* Restaurant Info */}
            <View style={styles.restaurantCard}>
              <Image 
                source={{ 
                  uri: restaurant?.images?.[0] || 
                       'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80' 
                }} 
                style={styles.restaurantImage} 
              />
              <View style={styles.restaurantInfo}>
                <Text style={styles.restaurantName}>{restaurant?.name}</Text>
                <View style={styles.addressContainer}>
                  <Ionicons name="location-outline" size={16} color="#666" />
                  <Text style={styles.addressText}>{restaurant?.address}</Text>
                </View>
                {restaurant?.rating && (
                  <View style={styles.ratingContainer}>
                    <Ionicons name="star" size={16} color="#FFD700" />
                    <Text style={styles.ratingText}>{restaurant.rating.toFixed(1)}</Text>
                  </View>
                )}
              </View>
            </View>
  
            {/* Date Selection */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Select Date</Text>
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
                      date === item.label && styles.selectedDateItem
                    ]}
                    onPress={() => setDate(item.label)}
                  >
                    <Text 
                      style={[
                        styles.dateText,
                        date === item.label && styles.selectedDateText
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
  
{/* Time Selection */}
<View style={styles.sectionContainer}>
    <Text style={styles.sectionTitle}>Select Time</Text>
    <View style={styles.timeContainer}>
      {loadingTimes ? ( // Add a state variable for loading times
        <ActivityIndicator size="small" color="#0000ff" />
      ) : availableTimes.length > 0 ? (
        availableTimes.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.timeItem,
              time === item && styles.selectedTimeItem,
            ]}
            onPress={() => setTime(item)}
          >
            <Text
              style={[
                styles.timeText,
                time === item && styles.selectedTimeText,
              ]}
            >
              {item}
            </Text>
          </TouchableOpacity>
        ))
      ) : (
        <Text style={styles.noTimesText}>
          {date
            ? "No available times for selected date"
            : "Select a date to see available times"}
        </Text>
      )}
    </View>
  </View>
  
            {/* Party Size */}
            <View style={styles.sectionContainer}>
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
            </View>
  
            {/* Special Requests */}
            <View style={styles.sectionContainer}>
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
            </View>
  
            {/* Reservation Summary */}
            <View style={styles.summaryContainer}>
              <Text style={styles.summaryTitle}>Reservation Summary</Text>
              
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Ionicons name="calendar-outline" size={18} color="#666" />
                  <Text style={styles.summaryLabel}>Date</Text>
                  <Text style={styles.summaryValue}>{date || 'Not selected'}</Text>
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
            </View>
  
            {/* Reserve Button */}
            <TouchableOpacity 
              style={[
                styles.reserveButton,
                (!date || !time || submitting) && styles.disabledButton
              ]}
              onPress={handleReserve}
              disabled={!date || !time || submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.reserveButtonText}>Confirm Reservation</Text>
              )}
            </TouchableOpacity>
            
            {/* Cancel Button */}
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => router.back()}
              disabled={submitting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
  
            {/* Policy Note */}
            <Text style={styles.policyNote}>
              By confirming this reservation, you agree to our cancellation policy.
              You can cancel up to 2 hours before your reservation time without any charge.
            </Text>
  
            {/* Bottom spacing */}
            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  };
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#ffffff',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    loadingText: {
      marginTop: 12,
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
      fontSize: 22,
      fontWeight: '600',
      color: '#1a1a1a',
      marginTop: 16,
      marginBottom: 8,
    },
    errorText: {
      fontSize: 16,
      color: '#666',
      textAlign: 'center',
      marginBottom: 24,
    },
    retryButton: {
      backgroundColor: '#1a1a1a',
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 8,
    },
    retryButtonText: {
      fontSize: 16,
      fontWeight: '500',
      color: '#FFFFFF',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#eee',
    },
    backButton: {
      padding: 8,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#1a1a1a',
    },
    shareButton: {
      padding: 8,
    },
    restaurantCard: {
      flexDirection: 'row',
      margin: 16,
      backgroundColor: '#f9f9f9',
      borderRadius: 12,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    restaurantImage: {
      width: 100,
      height: 100,
    },
    restaurantInfo: {
      flex: 1,
      padding: 12,
      justifyContent: 'center',
    },
    restaurantName: {
      fontSize: 18,
      fontWeight: '700',
      color: '#1a1a1a',
      marginBottom: 8,
    },
    addressContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
    },
    addressText: {
      fontSize: 14,
      color: '#666',
      marginLeft: 4,
      flex: 1,
    },
    ratingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    ratingText: {
      fontSize: 14,
      color: '#666',
      marginLeft: 5,
      fontWeight: '500',
    },
    sectionContainer: {
      marginHorizontal: 16,
      marginTop: 24,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: '#1a1a1a',
      marginBottom: 12,
    },
    dateScrollContainer: {
      paddingBottom: 8,
    },
    dateItem: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: '#ddd',
      borderRadius: 8,
      marginRight: 10,
      backgroundColor: '#FFFFFF',
    },
    selectedDateItem: {
      backgroundColor: '#1a1a1a',
      borderColor: '#1a1a1a',
    },
    dateText: {
      fontSize: 14,
      color: '#1a1a1a',
    },
    selectedDateText: {
      color: '#FFFFFF',
    },
    timeContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: -5,
    },
    timeItem: {
      width: '23%',
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: '#ddd',
      borderRadius: 8,
      margin: '1%',
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
    },
    selectedTimeItem: {
      backgroundColor: '#1a1a1a',
      borderColor: '#1a1a1a',
    },
    timeText: {
      fontSize: 14,
      color: '#1a1a1a',
    },
    selectedTimeText: {
      color: '#FFFFFF',
    },
    guestsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    guestButton: {
      width: 40,
      height: 40,
      borderWidth: 1,
      borderColor: '#ddd',
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    guestsInput: {
      width: 60,
      height: 40,
      borderWidth: 1,
      borderColor: '#ddd',
      borderRadius: 8,
      textAlign: 'center',
      fontSize: 16,
      marginHorizontal: 12,
    },
    specialRequestsInput: {
      borderWidth: 1,
      borderColor: '#ddd',
      borderRadius: 8,
      padding: 12,
      fontSize: 14,
      height: 100,
      textAlignVertical: 'top',
    },
    characterCount: {
      fontSize: 12,
      color: '#999',
      textAlign: 'right',
      marginTop: 4,
    },
    summaryContainer: {
      margin: 16,
      padding: 16,
      backgroundColor: '#f9f9f9',
      borderRadius: 12,
    },
    summaryTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: '#1a1a1a',
      marginBottom: 16,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    summaryItem: {
      alignItems: 'center',
      flex: 1,
    },
    summaryLabel: {
      fontSize: 12,
      color: '#666',
      marginVertical: 4,
    },
    summaryValue: {
      fontSize: 14,
      fontWeight: '600',
      color: '#1a1a1a',
    },
    reserveButton: {
      backgroundColor: '#1a1a1a',
      borderRadius: 8,
      paddingVertical: 16,
      marginHorizontal: 16,
      marginTop: 24,
      alignItems: 'center',
    },
    disabledButton: {
      backgroundColor: '#cccccc',
    },
    reserveButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    cancelButton: {
      borderWidth: 1,
      borderColor: '#1a1a1a',
      borderRadius: 8,
      paddingVertical: 16,
      marginHorizontal: 16,
      marginTop: 12,
      alignItems: 'center',
    },
    cancelButtonText: {
      color: '#1a1a1a',
      fontSize: 16,
      fontWeight: '600',
    },
    policyNote: {
      fontSize: 12,
      color: '#888',
      marginHorizontal: 16,
      marginTop: 16,
      textAlign: 'center',
    },
  });
  
  export default Reservation;