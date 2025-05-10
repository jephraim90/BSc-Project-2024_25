
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert,Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const NotificationTestButton = () => {
  const testNotification = async () => {
    try {
      // Test if notification permissions are granted
      const { status } = await Notifications.getPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Notification permission is required to show notifications',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Request Permission', 
              onPress: async () => {
                const { status } = await Notifications.requestPermissionsAsync();
                if (status === 'granted') {
                  // Try again after permission granted
                  testNotification();
                }
              } 
            }
          ]
        );
        return;
      }
      
      // Schedule a test notification
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: "Test Notification",
          body: "This is a test notification. If you're seeing this, notifications are working!",
          data: { type: 'test' },
          sound: true,
          priority: 'max',
          ...(Platform.OS === 'android' && { channelId: 'default' })
        },
        trigger: { seconds: 2 },
      });
      
      console.log('Test notification scheduled:', identifier);
      Alert.alert('Notification Scheduled', 'You should see a notification in 2 seconds');
      
    } catch (error) {
      console.error('Error testing notification:', error);
      Alert.alert('Error', `Failed to schedule test notification: ${error.message}`);
    }
  };
  
  return (
    <TouchableOpacity 
      style={styles.button}
      onPress={testNotification}
    >
      <Text style={styles.buttonText}>Test Notification</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#ff6b6b',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    margin: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default NotificationTestButton;