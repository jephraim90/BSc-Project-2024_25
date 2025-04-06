import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, SafeAreaView, ActivityIndicator } from 'react-native';
import React, { useState,useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from 'expo-router';

const Reservations = () => {
  const router =useRouter();
  const [activeTab, setActiveTab] = useState('upcoming');
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
  if(authLoading || !checkedAuth){
      return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
    
    
  }

  
  // Sample reservation data
  const upcomingReservations = [
    {
      id: '1',
      restaurantName: 'La Trattoria Italiana',
      date: 'May 15, 2025',
      time: '7:30 PM',
      guests: 2,
      image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80',
      status: 'confirmed',
      address: '123 Venice Street, Venice',
      reservationCode: 'LD39P5',
    },
    {
      id: '2',
      restaurantName: 'Sakura Sushi',
      date: 'May 22, 2025',
      time: '8:00 PM',
      guests: 4,
      image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80',
      status: 'pending',
      address: '456 Tokyo Avenue, Venice',
      reservationCode: 'SK42F7',
    },
  ];
  
  const pastReservations = [
    {
      id: '3',
      restaurantName: 'Le Petit Bistro',
      date: 'April 28, 2025',
      time: '6:45 PM',
      guests: 2,
      image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80',
      status: 'completed',
      address: '789 Paris Boulevard, Venice',
      reservationCode: 'PB75K3',
    },
    {
      id: '4',
      restaurantName: 'The Spice Garden',
      date: 'April 15, 2025',
      time: '7:00 PM',
      guests: 3,
      image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80',
      status: 'completed',
      address: '321 Mumbai Street, Venice',
      reservationCode: 'SG19H8',
    },
    {
      id: '5',
      restaurantName: 'Texas Smokehouse',
      date: 'March 30, 2025',
      time: '7:30 PM',
      guests: 4,
      image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80',
      status: 'completed',
      address: '987 Austin Road, Venice',
      reservationCode: 'TX62L9',
    },
  ];
  

  const renderReservationItem = (reservation) => {
    return (
      <TouchableOpacity key={reservation.id} style={styles.reservationCard}>
        <Image source={{ uri: reservation.image }} style={styles.restaurantImage} />
        
        <View style={styles.reservationDetails}>
          <View style={styles.reservationHeader}>
            <Text style={styles.restaurantName}>{reservation.restaurantName}</Text>
            {reservation.status === 'confirmed' && (
              <View style={[styles.statusBadge, styles.confirmedBadge]}>
                <Text style={styles.statusText}>Confirmed</Text>
              </View>
            )}
            {reservation.status === 'pending' && (
              <View style={[styles.statusBadge, styles.pendingBadge]}>
                <Text style={styles.statusText}>Pending</Text>
              </View>
            )}
          </View>
          
          <View style={styles.reservationInfo}>
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={16} color="#666" />
              <Text style={styles.infoText}>{reservation.date} at {reservation.time}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Ionicons name="people-outline" size={16} color="#666" />
              <Text style={styles.infoText}>{reservation.guests} {reservation.guests > 1 ? 'people' : 'person'}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={16} color="#666" />
              <Text style={styles.infoText} numberOfLines={1}>{reservation.address}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Ionicons name="bookmark-outline" size={16} color="#666" />
              <Text style={styles.infoText}>Reservation #{reservation.reservationCode}</Text>
            </View>
          </View>
          
          {activeTab === 'upcoming' && (
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.actionButton}>
                <Text style={styles.actionButtonText}>Modify</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.actionButton, styles.cancelButton]}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {activeTab === 'past' && (
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.actionButton}>
                <Text style={styles.actionButtonText}>Book Again</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.rateButton}>
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
          style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]} 
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>Upcoming</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'past' && styles.activeTab]} 
          onPress={() => setActiveTab('past')}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.activeTabText]}>Past</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.reservationsList} showsVerticalScrollIndicator={false}>
        {activeTab === 'upcoming' && upcomingReservations.length > 0 ? (
          upcomingReservations.map(reservation => renderReservationItem(reservation))
        ) : activeTab === 'upcoming' ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={60} color="#ccc" />
            <Text style={styles.emptyStateTitle}>No Upcoming Reservations</Text>
            <Text style={styles.emptyStateText}>You don't have any upcoming restaurant reservations.</Text>
            <TouchableOpacity style={styles.emptyStateButton}>
              <Text style={styles.emptyStateButtonText}>Find Restaurants</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        
        {activeTab === 'past' && pastReservations.length > 0 ? (
          pastReservations.map(reservation => renderReservationItem(reservation))
        ) : activeTab === 'past' ? (
          <View style={styles.emptyState}>
            <Ionicons name="time-outline" size={60} color="#ccc" />
            <Text style={styles.emptyStateTitle}>No Past Reservations</Text>
            <Text style={styles.emptyStateText}>You don't have any past restaurant reservations.</Text>
          </View>
        ) : null}
        
     
        <View style={{ height: 20 }} />
      </ScrollView>
      
      
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e8f0ed',
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1a1a1a',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  tab: {
    paddingVertical: 12,
    marginRight: 24,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#1a1a1a',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    fontWeight: '600',
    color: '#1a1a1a',
  },
  reservationsList: {
    paddingHorizontal: 16,
  },
  reservationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  restaurantImage: {
    width: '100%',
    height: 120,
  },
  reservationDetails: {
    padding: 16,
  },
  reservationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  restaurantName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  confirmedBadge: {
    backgroundColor: '#e0f0e9',
  },
  pendingBadge: {
    backgroundColor: '#FFF8E0',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  reservationInfo: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginRight: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  cancelButtonText: {
    color: '#1a1a1a',
    fontSize: 14,
    fontWeight: '600',
  },
  rateButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  rateButtonText: {
    color: '#1a1a1a',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyStateButton: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default Reservations;