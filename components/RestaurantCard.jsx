import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

/**
 * A reusable restaurant card component
 * 
 * @param {Object} props
 * @param {Object} props.restaurant - Restaurant data
 * @param {string} props.variant - Card variant ('default', 'horizontal', 'small', etc.)
 * @param {Object} props.style - Additional styles for the card container
 */
const RestaurantCard = ({ restaurant, variant = 'default', style }) => {
  const router = useRouter();

  // Default image if no images are available
  const defaultImage = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80';
  
  // Handle navigation to restaurant details
  const handlePress = () => {
    router.push(`/restaurant/${restaurant.id}`);
  };
  
  // Get image source
  const imageSource = restaurant.images && restaurant.images.length > 0
    ? { uri: restaurant.images[0] }
    : { uri: defaultImage };

  // Format restaurant location (usually city from address)
  const getLocation = () => {
    if (!restaurant.address) return 'Location not specified';
    
    const addressParts = restaurant.address.split(',');
    return addressParts[addressParts.length - 2]?.trim() || addressParts[addressParts.length - 1]?.trim();
  };

  // Check if restaurant is open now
  const isOpenNow = () => {
  
    if (!restaurant.businessHours) return false;
    
    const now = new Date();
    const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
    
    const dayHours = restaurant.businessHours[dayOfWeek];
    if (!dayHours || !dayHours.isOpen) return false;
    
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    const [openHours, openMinutes] = dayHours.opens.split(':').map(Number);
    const [closeHours, closeMinutes] = dayHours.closes.split(':').map(Number);
    
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    const openTimeInMinutes = openHours * 60 + openMinutes;
    const closeTimeInMinutes = closeHours * 60 + closeMinutes;
    
    return currentTimeInMinutes >= openTimeInMinutes && currentTimeInMinutes < closeTimeInMinutes;
  };

  // Render different variants
  switch (variant) {
    case 'horizontal':
      // Horizontal card layout (good for lists)
      return (
        <TouchableOpacity 
          style={[styles.horizontalCard, style]} 
          onPress={handlePress}
          activeOpacity={0.8}
        >
          <Image source={imageSource} style={styles.horizontalImage} />
          <View style={styles.horizontalContent}>
            <Text style={styles.name} numberOfLines={1}>{restaurant.name}</Text>
            
            <View style={styles.infoRow}>
              <Text style={styles.cuisineText}>
                {restaurant.cuisine || 'Various Cuisine'}
              </Text>
              <Text style={styles.priceText}>{restaurant.priceRange || '$$'}</Text>
            </View>
            
            {restaurant.rating && (
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={14} color="#FFD700" />
                <Text style={styles.ratingText}>
                  {restaurant.rating.toFixed(1)} ({restaurant.reviewCount || 0})
                </Text>
              </View>
            )}
            
            <View style={styles.infoRow}>
              <View style={styles.locationContainer}>
                <Ionicons name="location-outline" size={14} color="#666" />
                <Text style={styles.locationText} numberOfLines={1}>
                  {getLocation()}
                </Text>
              </View>
              
              {isOpenNow() ? (
                <Text style={styles.openNowText}>Open Now</Text>
              ) : (
                <Text style={styles.closedText}>Closed</Text>
              )}
            </View>
          </View>
        </TouchableOpacity>
      );
      
    case 'featured':
      // Featured card (larger with more info)
      return (
        <TouchableOpacity 
          style={[styles.featuredCard, style]} 
          onPress={handlePress}
          activeOpacity={0.8}
        >
          <Image source={imageSource} style={styles.featuredImage} />
          
          {restaurant.rating && (
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingBadgeText}>{restaurant.rating.toFixed(1)}</Text>
              <Ionicons name="star" size={12} color="#FFD700" />
            </View>
          )}
          
          <View style={styles.featuredContent}>
            <Text style={styles.featuredName} numberOfLines={1}>{restaurant.name}</Text>
            
            <View style={styles.infoRow}>
              <Text style={styles.cuisineText}>
                {restaurant.cuisine || 'Various Cuisine'}
              </Text>
              <Text style={styles.priceText}>{restaurant.priceRange || '$$'}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <View style={styles.locationContainer}>
                <Ionicons name="location-outline" size={14} color="#666" />
                <Text style={styles.locationText} numberOfLines={1}>
                  {getLocation()}
                </Text>
              </View>
              
              {isOpenNow() ? (
                <View style={styles.statusBadge}>
                  <View style={styles.statusDot} />
                  <Text style={styles.openNowText}>Open</Text>
                </View>
              ) : (
                <View style={[styles.statusBadge, styles.closedBadge]}>
                  <View style={[styles.statusDot, styles.closedDot]} />
                  <Text style={styles.closedText}>Closed</Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      );
      
    case 'small':
      // Small card (good for horizontal scrolling sections)
      return (
        <TouchableOpacity 
          style={[styles.smallCard, style]} 
          onPress={handlePress}
          activeOpacity={0.8}
        >
          <Image source={imageSource} style={styles.smallImage} />
          <View style={styles.smallContent}>
            <Text style={styles.smallName} numberOfLines={1}>{restaurant.name}</Text>
            <Text style={styles.smallInfo} numberOfLines={1}>
              {restaurant.cuisine || 'Various'} • {restaurant.priceRange || '$$'}
            </Text>
            {restaurant.rating && (
              <View style={styles.smallRating}>
                <Ionicons name="star" size={12} color="#FFD700" />
                <Text style={styles.smallRatingText}>{restaurant.rating.toFixed(1)}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      );
      
    default:
      // Default card (grid style)
      return (
        <TouchableOpacity 
          style={[styles.card, style]} 
          onPress={handlePress}
          activeOpacity={0.8}
        >
          <Image source={imageSource} style={styles.image} />
          
          {isOpenNow() && (
            <View style={styles.openBadge}>
              <Text style={styles.openBadgeText}>OPEN</Text>
            </View>
          )}
          
          <View style={styles.content}>
            <Text style={styles.name} numberOfLines={1}>{restaurant.name}</Text>
            
            <View style={styles.detailsRow}>
              <View style={styles.infoItem}>
                <Ionicons name="restaurant-outline" size={14} color="#666" />
                <Text style={styles.infoText} numberOfLines={1}>
                  {restaurant.cuisine || 'Various'}
                </Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={styles.priceText}>{restaurant.priceRange || '$$'}</Text>
              </View>
            </View>
            
            <View style={styles.detailsRow}>
              <View style={styles.infoItem}>
                <Ionicons name="location-outline" size={14} color="#666" />
                <Text style={styles.infoText} numberOfLines={1}>
                  {getLocation()}
                </Text>
              </View>
              
              {restaurant.rating && (
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={14} color="#FFD700" />
                  <Text style={styles.ratingText}>{restaurant.rating.toFixed(1)}</Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      );
  }
};

const styles = StyleSheet.create({
  // Default card styles
  card: {
    borderRadius: 12,
    backgroundColor: 'white',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: 160,
  },
  content: {
    padding: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 6,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  priceText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    marginLeft: 3,
  },
  openBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#4CAF50',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  openBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  
  // Horizontal card styles
  horizontalCard: {
    flexDirection: 'row',
    borderRadius: 12,
    backgroundColor: 'white',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 15,
  },
  horizontalImage: {
    width: 120,
    height: '100%',
  },
  horizontalContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cuisineText: {
    fontSize: 14,
    color: '#666',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
    flex: 1,
  },
  openNowText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  closedText: {
    fontSize: 12,
    color: '#e53935',
    fontWeight: '500',
  },
  
  // Featured card styles
  featuredCard: {
    borderRadius: 12,
    backgroundColor: 'white',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featuredImage: {
    width: '100%',
    height: 200,
  },
  featuredContent: {
    padding: 15,
  },
  featuredName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  ratingBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'white',
    borderRadius: 15,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  ratingBadgeText: {
    color: '#1a1a1a',
    fontWeight: '600',
    fontSize: 12,
    marginRight: 3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  closedBadge: {
    backgroundColor: '#FFEBEE',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF50',
    marginRight: 4,
  },
  closedDot: {
    backgroundColor: '#e53935',
  },
  
  // Small card styles
  smallCard: {
    width: 160,
    borderRadius: 12,
    backgroundColor: 'white',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    marginRight: 12,
  },
  smallImage: {
    width: '100%',
    height: 120,
  },
  smallContent: {
    padding: 10,
  },
  smallName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  smallInfo: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  smallRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  smallRatingText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    marginLeft: 3,
  },
});

export default RestaurantCard;