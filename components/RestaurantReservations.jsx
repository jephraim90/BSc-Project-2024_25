import {
    View,
    Text,
    ActivityIndicator,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    FlatList,
  } from "react-native";
  import React, { useEffect, useState } from "react";
  import { useRouter } from "expo-router";
  import { useAuth } from "@/contexts/AuthContext";
  import { Ionicons } from "@expo/vector-icons";
  import RestaurantService from "@/services/restaurantService";
  import databaseService from '@/services/databaseService';
  import { where } from "firebase/firestore";
  
  
  const RestaurantReservations = ({ ownerId }) => {
    const [reservations, setReservations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [restaurants, setRestaurants] = useState([]);
    const [selectedRestaurant, setSelectedRestaurant] = useState('all');
    const [filter, setFilter] = useState('upcoming'); // 'upcoming', 'past', 'all'
    const router = useRouter();
  
    useEffect(() => {
      const fetchOwnerRestaurants = async () => {
        try {
          // Fetch restaurants owned by current user
          const result = await RestaurantService.getRestaurantsByOwnerId(ownerId);
          if (result && result.length > 0) {
            setRestaurants(result);
          }
        } catch (error) {
          console.log("Error fetching owner restaurants:", error);
        }
      };
  
      fetchOwnerRestaurants();
    }, [ownerId]);
  
    useEffect(() => {
      const fetchReservations = async () => {
        if (!ownerId) return;
        
        setLoading(true);
        try {
          let reservationsQuery = [];
          
          // Get restaurant IDs owned by this owner
          const restaurantIds = restaurants.map(r => r.id);
          if (restaurantIds.length === 0) {
            setReservations([]);
            setLoading(false);
            return;
          }
          
          // Filter by specific restaurant if selected
          if (selectedRestaurant !== 'all') {
            reservationsQuery.push(where('restaurantId', '==', selectedRestaurant));
          } else {
            // Using "in" operator to query multiple restaurant IDs
            reservationsQuery.push(where('restaurantId', 'in', restaurantIds));
          }
          
          // Filter by date if needed
          const now = new Date().toISOString().split('T')[0]; // Current date in YYYY-MM-DD
          
          if (filter === 'upcoming') {
            reservationsQuery.push(where('date', '>=', now));
          } else if (filter === 'past') {
            reservationsQuery.push(where('date', '<', now));
          }
          
          // Fetch reservations
          const result = await databaseService.getDocuments('reservations', reservationsQuery);
          
          if (result.success) {
            // Sort reservations by date and time
            const sortedReservations = result.data.sort((a, b) => {
              // First compare dates
              const dateComparison = a.date.localeCompare(b.date);
              if (dateComparison !== 0) return dateComparison;
              
              // If dates are equal, compare times
              return a.time.localeCompare(b.time);
            });
            
            setReservations(sortedReservations);
          } else {
            console.log("Error fetching reservations:", result.error);
            setReservations([]);
          }
        } catch (error) {
          console.log("Error fetching reservations:", error);
          setReservations([]);
        } finally {
          setLoading(false);
        }
      };
  
      if (restaurants.length > 0) {
        fetchReservations();
      }
    }, [ownerId, restaurants, selectedRestaurant, filter]);
  
    const getRestaurantName = (restaurantId) => {
      const restaurant = restaurants.find(r => r.id === restaurantId);
      return restaurant ? restaurant.name : 'Unknown Restaurant';
    };
  
    const getStatusColor = (status) => {
      switch(status) {
        case 'confirmed': return '#4CAF50'; // Green
        case 'pending': return '#FF9800';   // Orange
        case 'cancelled': return '#F44336'; // Red
        case 'completed': return '#2196F3'; // Blue
        default: return '#757575';          // Grey
      }
    };
  
    const formatDate = (dateString) => {
      const options = { weekday: 'short', month: 'short', day: 'numeric' };
      return new Date(dateString).toLocaleDateString(undefined, options);
    };
  
    const renderReservationItem = ({ item }) => (
      <TouchableOpacity
        style={styles.reservationItem}
        onPress={() => router.push(`/reservations/${item.id}`)}
      >
        <View style={styles.reservationHeader}>
          <Text style={styles.reservationRestaurant}>{getRestaurantName(item.restaurantId)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
          </View>
        </View>
        
        <View style={styles.reservationDetails}>
          <View style={styles.reservationDetailItem}>
            <Ionicons name="calendar-outline" size={16} color="#666" />
            <Text style={styles.reservationDetailText}>{formatDate(item.date)}</Text>
          </View>
          
          <View style={styles.reservationDetailItem}>
            <Ionicons name="time-outline" size={16} color="#666" />
            <Text style={styles.reservationDetailText}>{item.time}</Text>
          </View>
          
          <View style={styles.reservationDetailItem}>
            <Ionicons name="people-outline" size={16} color="#666" />
            <Text style={styles.reservationDetailText}>{item.guests} {item.guests === 1 ? 'guest' : 'guests'}</Text>
          </View>
        </View>
        
        <View style={styles.reservationCustomer}>
          <Ionicons name="person-outline" size={16} color="#666" />
          <Text style={styles.reservationCustomerText}>
            {item.userName || 'Guest'} · {item.userEmail || 'No email provided'}
          </Text>
        </View>
        
        {item.specialRequests && (
          <View style={styles.reservationNotes}>
            <Text style={styles.reservationNotesLabel}>Special Requests:</Text>
            <Text style={styles.reservationNotesText}>{item.specialRequests}</Text>
          </View>
        )}
        
        <Ionicons name="chevron-forward" size={18} color="#ccc" style={styles.reservationArrow} />
      </TouchableOpacity>
    );
  
    return (
      <View style={styles.reservationsContainer}>
        <View style={styles.filterContainer}>
          {/* Restaurant filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                selectedRestaurant === 'all' && styles.activeFilterButton
              ]}
              onPress={() => setSelectedRestaurant('all')}
            >
              <Text style={[
                styles.filterButtonText,
                selectedRestaurant === 'all' && styles.activeFilterText
              ]}>
                All Restaurants
              </Text>
            </TouchableOpacity>
            
            {restaurants.map(restaurant => (
              <TouchableOpacity
                key={restaurant.id}
                style={[
                  styles.filterButton,
                  selectedRestaurant === restaurant.id && styles.activeFilterButton
                ]}
                onPress={() => setSelectedRestaurant(restaurant.id)}
              >
                <Text style={[
                  styles.filterButtonText,
                  selectedRestaurant === restaurant.id && styles.activeFilterText
                ]}>
                  {restaurant.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          {/* Time filter */}
          <View style={styles.timeFilterContainer}>
            <TouchableOpacity
              style={[
                styles.timeFilterButton,
                filter === 'upcoming' && styles.activeTimeFilterButton
              ]}
              onPress={() => setFilter('upcoming')}
            >
              <Text style={[
                styles.timeFilterText,
                filter === 'upcoming' && styles.activeTimeFilterText
              ]}>
                Upcoming
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.timeFilterButton,
                filter === 'past' && styles.activeTimeFilterButton
              ]}
              onPress={() => setFilter('past')}
            >
              <Text style={[
                styles.timeFilterText,
                filter === 'past' && styles.activeTimeFilterText
              ]}>
                Past
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.timeFilterButton,
                filter === 'all' && styles.activeTimeFilterButton
              ]}
              onPress={() => setFilter('all')}
            >
              <Text style={[
                styles.timeFilterText,
                filter === 'all' && styles.activeTimeFilterText
              ]}>
                All
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#1a1a1a" />
            <Text style={styles.loadingText}>Loading reservations...</Text>
          </View>
        ) : reservations.length > 0 ? (
          <FlatList
            data={reservations}
            renderItem={renderReservationItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.reservationsList}
          />
        ) : (
          <View style={styles.emptyStateContainer}>
            <Ionicons name="calendar-outline" size={48} color="#ccc" />
            <Text style={styles.emptyStateText}>
              No {filter !== 'all' ? filter : ''} reservations found
            </Text>
            <Text style={styles.emptyStateSubText}>
              {filter === 'upcoming' 
                ? 'New reservations will appear here'
                : filter === 'past'
                  ? 'Past reservations will be shown here'
                  : 'Reservations will appear here when customers book your restaurants'}
            </Text>
          </View>
        )}
      </View>
    );
  };
const styles = StyleSheet.create({
    reservationsContainer: {
        marginTop: 10,
      },
      
      filterContainer: {
        marginBottom: 15,
      },
      
      filterScrollView: {
        marginBottom: 10,
      },
      
      filterButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginRight: 8,
        backgroundColor: '#f0f0f0',
        borderRadius: 20,
      },
      
      activeFilterButton: {
        backgroundColor: '#1a1a1a',
      },
      
      filterButtonText: {
        fontSize: 14,
        color: '#666',
      },
      
      activeFilterText: {
        color: '#fff',
      },
      
      timeFilterContainer: {
        flexDirection: 'row',
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
        marginHorizontal: 2,
        padding: 2,
      },
      
      timeFilterButton: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 6,
      },
      
      activeTimeFilterButton: {
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
        elevation: 1,
      },
      
      timeFilterText: {
        fontSize: 13,
        color: '#666',
      },
      
      activeTimeFilterText: {
        color: '#1a1a1a',
        fontWeight: '500',
      },
      
      reservationsList: {
        paddingBottom: 20,
      },
      
      reservationItem: {
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 12,
        padding: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
      },
      
      reservationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
      },
      
      reservationRestaurant: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a1a',
        flex: 1,
      },
      
      statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
      },
      
      statusText: {
        fontSize: 10,
        color: '#fff',
        fontWeight: '600',
      },
      
      reservationDetails: {
        flexDirection: 'row',
        marginBottom: 12,
        flexWrap: 'wrap',
      },
      
      reservationDetailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 16,
        marginBottom: 6,
      },
      
      reservationDetailText: {
        fontSize: 14,
        color: '#666',
        marginLeft: 4,
      },
      
      reservationCustomer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingTop: 12,
      },
      
      reservationCustomerText: {
        fontSize: 14,
        color: '#666',
        marginLeft: 6,
      },
      
      reservationNotes: {
        backgroundColor: '#f9f9f9',
        padding: 10,
        borderRadius: 6,
        marginTop: 4,
      },
      
      reservationNotesLabel: {
        fontSize: 12,
        fontWeight: '500',
        color: '#666',
        marginBottom: 2,
      },
      
      reservationNotesText: {
        fontSize: 13,
        color: '#666',
        fontStyle: 'italic',
      },
      
      reservationArrow: {
        position: 'absolute',
        right: 15,
        top: 15,
      },
      
      emptyStateContainer: {
        padding: 30,
        alignItems: 'center',
        justifyContent: 'center',
      },
      
      emptyStateText: {
        fontSize: 16,
        color: '#999',
        textAlign: 'center',
        marginTop: 10,
      },
      
      emptyStateSubText: {
        fontSize: 14,
        color: '#bbb',
        textAlign: 'center',
        marginTop: 5,
      },
      
      loadingContainer: {
        padding: 30,
        alignItems: 'center',
        justifyContent: 'center',
      },
      
      loadingText: {
        fontSize: 14,
        color: '#666',
        marginTop: 10,
      },


})
export default RestaurantReservations;