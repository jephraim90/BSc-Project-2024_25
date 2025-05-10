import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';

const StyledReservationCard = ({ 
  restaurant, 
  reservation, 
  reservationId,
}) => {
 
  const qrCodeData = 
    `RESERVATION: ${restaurant.name}\n` +
    `ID: ${reservationId.substring(0, 8).toUpperCase()}\n` +
    `DATE: ${formatDate(reservation.date)}\n` +
    `TIME: ${reservation.time}\n` +
    `GUESTS: ${reservation.guests}\n` +
    `LOCATION: ${restaurant.address}\n` +
    `STATUS: ${reservation.status.toUpperCase()}\n\n` +
    `This invite is authenticated.`;
  
  // Format date
  function formatDate(dateString) {
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  }
  
  // Get status color
  const getStatusColor = () => {
    switch(reservation.status) {
      case 'confirmed':
        return '#4CAF50';
      case 'cancelled':
        return '#F44336';
      case 'completed':
        return '#2196F3';
      default:
        return '#FF9800';
    }
  };
  
  // Get status icon
  const getStatusIcon = () => {
    switch(reservation.status) {
      case 'confirmed':
        return 'checkmark-circle';
      case 'cancelled':
        return 'close-circle';
      case 'completed':
        return 'checkmark-done-circle';
      default:
        return 'time';
    }
  };
  
  return (
    <View style={styles.cardContainer}>
      {/* Restaurant Logo/Banner Section */}
      <View style={styles.bannerContainer}>
        <Image 
          source={{ 
            uri: restaurant?.images?.[0] || 
                'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80' 
          }} 
          style={styles.bannerImage} 
        />
        <View style={styles.bannerOverlay}>
          <Text style={styles.restaurantName}>{restaurant.name}</Text>
        </View>
      </View>
      
      {/* Status Badge */}
      <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
        <Ionicons name={getStatusIcon()} size={14} color="#FFF" />
        <Text style={styles.statusText}>
          {reservation.status.toUpperCase()}
        </Text>
      </View>
      
      {/* Reservation Details */}
      <View style={styles.detailsContainer}>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Ionicons name="calendar-outline" size={22} color="#1a1a1a" />
            <Text style={styles.detailLabel}>DATE</Text>
            <Text style={styles.detailValue}>{formatDate(reservation.date)}</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.detailItem}>
            <Ionicons name="time-outline" size={22} color="#1a1a1a" />
            <Text style={styles.detailLabel}>TIME</Text>
            <Text style={styles.detailValue}>{reservation.time}</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.detailItem}>
            <Ionicons name="people-outline" size={22} color="#1a1a1a" />
            <Text style={styles.detailLabel}>GUESTS</Text>
            <Text style={styles.detailValue}>{reservation.guests}</Text>
          </View>
        </View>
        
        {/* Location */}
        <View style={styles.locationContainer}>
          <Ionicons name="location-outline" size={18} color="#666" />
          <Text style={styles.locationText} numberOfLines={2}>
            {restaurant.address}
          </Text>
        </View>
      </View>
      
      {/* QR Code Section */}
      <View style={styles.qrContainer}>
        <QRCode
          value={qrCodeData}
          size={150}
          color="#000"
          backgroundColor="#fff"
          logo={{ uri: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60' }}
          logoSize={30}
          logoBackgroundColor="white"
          logoBorderRadius={15}
        />
      </View>
      
      {/* Reservation ID */}
      <View style={styles.idContainer}>
        <Text style={styles.idLabel}>RESERVATION ID</Text>
        <Text style={styles.idValue}>{reservationId.substring(0, 8).toUpperCase()}</Text>
      </View>
      
      {/* Footer with usage instructions */}
      <View style={styles.footerContainer}>
        <Text style={styles.footerText}>
          Scan this code to verify reservation
        </Text>
        <Text style={styles.authenticatedText}>
          This invite is authenticated
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
  },
  bannerContainer: {
    position: 'relative',
    height: 100,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 10,
  },
  restaurantName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 4,
  },
  detailsContainer: {
    padding: 16,
    backgroundColor: '#f9f9f9',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
  },
  divider: {
    height: 40,
    width: 1,
    backgroundColor: '#ddd',
  },
  detailLabel: {
    fontSize: 10,
    color: '#888',
    marginTop: 4,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 2,
    textAlign: 'center',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  locationText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  qrContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#fff',
  },
  idContainer: {
    alignItems: 'center',
    paddingBottom: 10,
  },
  idLabel: {
    fontSize: 10,
    color: '#888',
    fontWeight: '500',
  },
  idValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    letterSpacing: 1,
  },
  footerContainer: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#666',
  },
  authenticatedText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
    marginTop: 4,
  },
});

export default StyledReservationCard;