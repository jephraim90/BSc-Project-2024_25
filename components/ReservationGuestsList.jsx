import { 
    View, 
    Text, 
    StyleSheet, 
    ActivityIndicator,
    FlatList 
  } from 'react-native';
  import React, { useState, useEffect } from 'react';
  import { Ionicons } from '@expo/vector-icons';
  import databaseService from '@/services/databaseService';
  
  const ReservationGuestsList = ({ reservationId }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [guests, setGuests] = useState([]);
    
    useEffect(() => {
      const fetchReservationGuests = async () => {
        if (!reservationId) return;
        
        try {
          setLoading(true);
          
          // Fetch the reservation to get the guest list
          const reservationResult = await databaseService.getDocumentById('reservations', reservationId);
          
          if (!reservationResult.success || !reservationResult.data) {
            throw new Error('Could not find reservation data');
          }
          
          const reservation = reservationResult.data;
          const guestsList = reservation.guestsList || [];
          
          if (guestsList.length === 0) {
            setGuests([]);
            return;
          }
          
          // Fetch user details for each guest
          const guestPromises = guestsList.map(async (userId) => {
            try {
              const userResult = await databaseService.getDocumentById('users', userId);
              if (userResult.success && userResult.data) {
                return {
                  id: userId,
                  name: userResult.data.displayName || 'Unknown User',
                  email: userResult.data.email || '',
                  photoURL: userResult.data.photoURL || null
                };
              }
              return null;
            } catch (err) {
              console.log(`Error fetching user ${userId}:`, err);
              return null;
            }
          });
          
          const guestResults = await Promise.all(guestPromises);
          setGuests(guestResults.filter(guest => guest !== null));
        } catch (err) {
          console.log('Error fetching reservation guests:', err);
          setError(err.message || 'Failed to load guests');
        } finally {
          setLoading(false);
        }
      };
      
      fetchReservationGuests();
    }, [reservationId]);
    
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#666" />
          <Text style={styles.loadingText}>Loading guests...</Text>
        </View>
      );
    }
    
    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      );
    }
    
    if (guests.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No additional guests have joined yet.</Text>
        </View>
      );
    }
    
    return (
      <View style={styles.container}>
        <FlatList
          data={guests}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.guestItem}>
              <View style={styles.guestAvatar}>
                {item.photoURL ? (
                  <Image 
                    source={{ uri: item.photoURL }} 
                    style={styles.avatarImage} 
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitial}>
                      {item.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.guestInfo}>
                <Text style={styles.guestName}>{item.name}</Text>
                <Text style={styles.guestEmail}>{item.email}</Text>
              </View>
              <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
            </View>
          )}
        />
      </View>
    );
  };
  
  const styles = StyleSheet.create({
    container: {
      marginTop: 8,
    },
    loadingContainer: {
      padding: 16,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    },
    loadingText: {
      marginLeft: 8,
      fontSize: 14,
      color: '#666',
    },
    errorContainer: {
      padding: 16,
      alignItems: 'center',
    },
    errorText: {
      fontSize: 14,
      color: '#e53935',
    },
    emptyContainer: {
      padding: 16,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 14,
      color: '#666',
      fontStyle: 'italic',
    },
    guestItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 4,
      borderBottomWidth: 1,
      borderBottomColor: '#f0f0f0',
    },
    guestAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      overflow: 'hidden',
      marginRight: 12,
    },
    avatarImage: {
      width: '100%',
      height: '100%',
    },
    avatarPlaceholder: {
      width: '100%',
      height: '100%',
      backgroundColor: '#ccc',
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarInitial: {
      fontSize: 18,
      fontWeight: '600',
      color: '#fff',
    },
    guestInfo: {
      flex: 1,
    },
    guestName: {
      fontSize: 14,
      fontWeight: '600',
      color: '#1a1a1a',
    },
    guestEmail: {
      fontSize: 12,
      color: '#666',
    },
  });
  
  export default ReservationGuestsList;