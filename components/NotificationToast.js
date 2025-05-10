import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

const NotificationToast = ({ notification, onDismiss, autoHideDuration = 5000 }) => {
  const router = useRouter();
  const [animation] = useState(new Animated.Value(-100));
  
  useEffect(() => {
    // Show the notification
    Animated.timing(animation, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
    
    // Auto hide after specified duration
    const timer = setTimeout(() => {
      hideNotification();
    }, autoHideDuration);
    
    return () => clearTimeout(timer);
  }, []);
  
  const hideNotification = () => {
    Animated.timing(animation, {
      toValue: -100,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      if (onDismiss) onDismiss();
    });
  };
  
  const handlePress = () => {
    // Navigate based on notification type
    if (notification.data && notification.data.type === 'reservation_confirmation') {
      router.push({
        pathname: "/reservation/confirmation",
        params: {
          reservationId: notification.data.reservationId,
          restaurantId: notification.data.restaurantId,
          date: notification.data.date,
          time: notification.data.time,
        },
      });
    }
    
    // Hide notification after navigation
    hideNotification();
  };
  
  return (
    <Animated.View 
      style={[
        styles.container,
        { transform: [{ translateY: animation }] }
      ]}
    >
      <TouchableOpacity 
        style={styles.content}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <View style={styles.icon}>
          <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{notification.title}</Text>
          <Text style={styles.body} numberOfLines={2}>{notification.body}</Text>
        </View>
        <TouchableOpacity 
          onPress={hideNotification}
          style={styles.closeButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={20} color="#999" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  icon: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  body: {
    fontSize: 14,
    color: '#666',
  },
  closeButton: {
    padding: 2,
  },
});

export default NotificationToast;