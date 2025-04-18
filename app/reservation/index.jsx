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
    KeyboardAvoidingView
  } from 'react-native';
  import React, { useState } from 'react';
  import { Ionicons } from '@expo/vector-icons';
  import { useRouter } from 'expo-router';
  
  const Reservation = () => {
    const router = useRouter();
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [guests, setGuests] = useState('2');
    const [specialRequests, setSpecialRequests] = useState('');
  
    // Sample restaurant data
    const restaurant = {
      id: '1',
      name: 'La Trattoria Italiana',
      image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80',
      address: '123 Venice Street, Venice, 30122',
    };
  
    // Sample available times
    const availableTimes = [
      '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM'
    ];
  
    // Sample available dates
    const availableDates = [
      'Today', 'Tomorrow', 'Fri, May 12', 'Sat, May 13', 'Sun, May 14'
    ];
  
    // Handle share reservation
    const handleShare = async () => {
      try {
        const result = await Share.share({
          message: `I'm going to ${restaurant.name} on ${date} at ${time} for ${guests} people! Join me!`,
          title: 'My Reservation at ' + restaurant.name,
        });
        
        if (result.action === Share.sharedAction) {
          if (result.activityType) {
            // shared with activity type of result.activityType
            console.log('Shared with activity type of: ' + result.activityType);
          } else {
            // shared
            console.log('Shared');
          }
        } else if (result.action === Share.dismissedAction) {
          // dismissed
          console.log('Share dismissed');
        }
      } catch (error) {
        console.log(error.message);
      }
    };
  
    // Handle reservation submission
    const handleReserve = () => {
      console.log('Reservation submitted', { date, time, guests, specialRequests });
      // Navigate to confirmation page
      router.push('/confirmation');
    };
  
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
              <Image source={{ uri: restaurant.image }} style={styles.restaurantImage} />
              <View style={styles.restaurantInfo}>
                <Text style={styles.restaurantName}>{restaurant.name}</Text>
                <View style={styles.addressContainer}>
                  <Ionicons name="location-outline" size={16} color="#666" />
                  <Text style={styles.addressText}>{restaurant.address}</Text>
                </View>
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
                      date === item && styles.selectedDateItem
                    ]}
                    onPress={() => setDate(item)}
                  >
                    <Text 
                      style={[
                        styles.dateText,
                        date === item && styles.selectedDateText
                      ]}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
  
            {/* Time Selection */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Select Time</Text>
              <View style={styles.timeContainer}>
                {availableTimes.map((item, index) => (
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
                ))}
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
                  onChangeText={setGuests}
                  keyboardType="number-pad"
                  maxLength={2}
                />
                
                <TouchableOpacity 
                  style={styles.guestButton}
                  onPress={() => setGuests(prev => (parseInt(prev) + 1).toString())}
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
              />
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
                (!date || !time) && styles.disabledButton
              ]}
              onPress={handleReserve}
              disabled={!date || !time}
            >
              <Text style={styles.reserveButtonText}>Confirm Reservation</Text>
            </TouchableOpacity>
            
            {/* Cancel Button */}
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => router.back()}
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
    },
    addressText: {
      fontSize: 14,
      color: '#666',
      marginLeft: 4,
      flex: 1,
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