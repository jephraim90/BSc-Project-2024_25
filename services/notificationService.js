import { Platform } from 'react-native';
import { auth, db } from './firebaseConfig';
import { doc, getDoc, updateDoc, setDoc, addDoc, collection } from 'firebase/firestore';

// Import notifications conditionally - only for native platforms
let Device = null;
let Notifications = null;
let Constants = null;
let recentlyReceivedNotificationIds = [];

// Only import these modules on native platforms
if (Platform.OS !== 'web') {
  Device = require('expo-device');
  Notifications = require('expo-notifications');
  Constants = require('expo-constants');

  // Configure notification handler for foreground
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
 
  
  // Set up notification channels for Android
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
    
    Notifications.setNotificationChannelAsync('reservations', {
      name: 'Reservations',
      description: 'Notifications about your restaurant reservations',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      sound: true,
      enableLights: true,
      lightColor: '#FF231F7C',
    });
    
    console.log('Android notification channels configured');
  }
}


// API base URL based on environment
const API_BASE_URL = (() => {
  if (__DEV__) {
    // Development environment
    if (Platform.OS === 'android') {
      return 'https://77a0-105-163-156-4.ngrok-free.app/api'; // Android emulator uses this special IP to reach host
    } else if (Platform.OS === 'ios') {
      return 'https://77a0-105-163-156-4.ngrok-free.app/api'; // iOS simulator
    } else {
      return 'http://localhost:5007/api'; // Web
    }
  } else {
    // Production environment
    return 'https://api.dineconnect.com/api';
  }
})();


// Add this variable at the top of your file (outside any functions)

function handleReceivedNotification(notification) {
  const notificationId = notification.request.identifier;
  
  // Check if we've already received this notification in the last few seconds
  if (recentlyReceivedNotificationIds.includes(notificationId)) {
    console.log(`Ignoring duplicate notification with ID: ${notificationId}`);
    return;
  }
  
  // Add to recently received list and log
  recentlyReceivedNotificationIds.push(notificationId);
  console.log('Notification received in foreground:', notification);
  
  // Clean up the list occasionally (keep the last 10 notifications)
  if (recentlyReceivedNotificationIds.length > 10) {
    recentlyReceivedNotificationIds = recentlyReceivedNotificationIds.slice(-10);
  }
}
export async function registerForPushNotifications() {
  // Check for an existing registration in progress with timeout protection
  if (global._expoPushTokenRegistrationInProgress) {
    console.log('Push token registration already in progress, checking timeout...');
    
    // Check if registration has been in progress for too long (30 seconds)
    const now = new Date().getTime();
    if (!global._expoPushTokenRegistrationStartTime || 
        (now - global._expoPushTokenRegistrationStartTime) > 30000) {
      console.log('Existing registration timed out, resetting state');
      global._expoPushTokenRegistrationInProgress = false;
      global._expoPushTokenRegistrationStartTime = null;
    } else {
      console.log('Registration in progress and not timed out, skipping duplicate call');
      return { success: false, error: 'Registration already in progress' };
    }
  }
  
  // Set registration in progress flag with timestamp
  global._expoPushTokenRegistrationInProgress = true;
  global._expoPushTokenRegistrationStartTime = new Date().getTime();
  
  // Set a global timeout to reset the flag after 30 seconds in case of an unhandled exception
  const registrationTimeout = setTimeout(() => {
    if (global._expoPushTokenRegistrationInProgress) {
      console.log('Registration process timed out, resetting state');
      global._expoPushTokenRegistrationInProgress = false;
      global._expoPushTokenRegistrationStartTime = null;
    }
  }, 30000); // 30 second timeout
  
  // Web platform - use browser notifications API
  if (Platform.OS === 'web') {
    console.log('Checking browser notification support');
    
    try {
      if (!('Notification' in window)) {
        console.log('Browser notifications not supported');
        clearTimeout(registrationTimeout);
        global._expoPushTokenRegistrationInProgress = false;
        global._expoPushTokenRegistrationStartTime = null;
        return { success: false, error: 'Browser notifications not supported' };
      }
      
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        console.log('Browser notification permission granted');
        clearTimeout(registrationTimeout);
        global._expoPushTokenRegistrationInProgress = false;
        global._expoPushTokenRegistrationStartTime = null;
        return { success: true, webNotifications: true };
      } else {
        clearTimeout(registrationTimeout);
        global._expoPushTokenRegistrationInProgress = false;
        global._expoPushTokenRegistrationStartTime = null;
        return { success: false, error: 'Browser notification permission denied' };
      }
    } catch (error) {
      console.error('Error requesting browser notification permission:', error);
      clearTimeout(registrationTimeout);
      global._expoPushTokenRegistrationInProgress = false;
      global._expoPushTokenRegistrationStartTime = null;
      return { success: false, error: error.message };
    }
  }

  // Native platforms - requirements check
  if (!Notifications || !Device) {
    console.error('Required modules not available');
    clearTimeout(registrationTimeout);
    global._expoPushTokenRegistrationInProgress = false;
    global._expoPushTokenRegistrationStartTime = null;
    return { success: false, error: 'Required modules not available' };
  }

  if (!auth.currentUser) {
    console.log('No user logged in, skipping push notification registration');
    clearTimeout(registrationTimeout);
    global._expoPushTokenRegistrationInProgress = false;
    global._expoPushTokenRegistrationStartTime = null;
    return { success: false, error: 'User not logged in' };
  }

  if (!Device.isDevice) {
    console.log('Running on emulator/simulator, push tokens may not work properly');
    // Continue anyway for testing purposes
  }

  try {
    // Check and request permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Notification permission denied by user');
      clearTimeout(registrationTimeout);
      global._expoPushTokenRegistrationInProgress = false;
      global._expoPushTokenRegistrationStartTime = null;
      return { success: false, error: 'Permission denied' };
    }

    // Get push token - try multiple approaches with fallbacks
    console.log('Getting push token...');
    let tokenData;
    
    try {
      // First try the Expo push token approach
      if (!__DEV__ && Constants.expoConfig?.extra?.eas?.projectId) {
        console.log('Using Expo push token with projectId');
        tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: Constants.expoConfig.extra.eas.projectId
        });
      } 
      else if (__DEV__) {
        // For development testing - use device push token
        try {
          console.log('Trying Expo push token for development');
          tokenData = await Notifications.getExpoPushTokenAsync();
        } catch (devTokenError) {
          console.log('Falling back to device push token for development:', devTokenError);
          tokenData = await Notifications.getDevicePushTokenAsync();
        }
      }
      else {
        // Try without projectId (for Expo Go)
        console.log('Trying Expo push token without projectId');
        tokenData = await Notifications.getExpoPushTokenAsync();
      }
    } catch (tokenError) {
      console.log('Failed to get primary token, falling back to device token:', tokenError);
      // Fall back to device token if all else fails
      try {
        tokenData = await Notifications.getDevicePushTokenAsync();
        console.log('Successfully got device push token as fallback');
      } catch (deviceTokenError) {
        console.error('Failed to get any push token:', deviceTokenError);
        throw new Error('Could not get any push token: ' + deviceTokenError.message);
      }
    }
    if (tokenData && tokenData.data) {
      const token = tokenData.data;
      console.log('Push token:', token);
      console.log('Token type:', typeof token);
      console.log('Token length:', token.length);
      console.log('Token starts with ExponentPushToken:', token.startsWith('ExponentPushToken'));
      console.log('Token contains colon:', token.includes(':'));
    }
    
    if (!tokenData || !tokenData.data) {
      throw new Error('Failed to get valid push token data');
    }
    
    const token = tokenData.data;
    console.log('Push token:', token);
    console.log('Token type:', typeof token);
    
    // Save token to Firestore
    console.log('Saving token to Firestore...');
    try {
      await saveTokenToFirestore(token);
    } catch (firestoreError) {
      console.error('Error saving token to Firestore:', firestoreError);
      // Continue even if Firestore fails - we still have the token
    }
    
    // Register token with server
    console.log('Registering token with server...');
    try {
      await registerTokenWithServer(token);
    } catch (serverError) {
      console.error('Error registering your token with server:', serverError);
      // Continue even if server registration fails
    }
    
    // Set up notification received handler
    const subscription = Notifications.addNotificationReceivedListener(handleReceivedNotification);
    
    // Set up notification response handler (when user taps)
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('User tapped notification:', response);
      handleNotificationResponse(response);
    });
    
    // Clear the timeout and reset flags
    clearTimeout(registrationTimeout);
    global._expoPushTokenRegistrationInProgress = false;
    global._expoPushTokenRegistrationStartTime = null;
    
    return { 
      success: true, 
      token, 
      subscriptions: { subscription, responseSubscription } 
    };
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    // Ensure we clean up on error
    clearTimeout(registrationTimeout);
    global._expoPushTokenRegistrationInProgress = false;
    global._expoPushTokenRegistrationStartTime = null;
    return { success: false, error: error.message };
  }
}
/**
 * Register Expo push token with server
 * @param {string} token - The Expo push token
 * @returns {Promise<boolean>} Success status
 */
async function registerTokenWithServer(token) {
  if (!token || !auth.currentUser) {
    console.log('Cannot register token: token missing or user not logged in');
    return false;
  }
  
  try {
    const userId = auth.currentUser.uid;
    
    // Get auth token for authentication with server
    const authToken = await auth.currentUser.getIdToken();
    
    // Prepare device info
    const deviceInfo = {
      model: Platform.OS === 'web' ? 'Web Browser' : (Device?.modelName || Device?.deviceName || 'Unknown device'),
      platform: Platform.OS,
      osVersion: Device?.osVersion || 'Unknown',
      appVersion: Constants?.expoConfig?.version || 'Unknown'
    };
    console.log('Token being sent to server:', token); 
    console.log("Device Info:", deviceInfo);
    
    // Call the server API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    // Call the server API
    const response = await fetch(`${API_BASE_URL}/notifications/register-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        token,
        deviceInfo
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    // Check if request was successful
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log("Token registration result:", result);
    
    console.log('Token registered with server successfully');
    return true;
  } catch (error) {
    console.error('Error registering this token with server:', error);
    
    // In development, don't fail the whole process if server registration fails
    if (__DEV__) {
      console.log('Continuing with client-side only in development');
      return true;
    }
    
    return false;
  }
}

/**
 * Save Expo push token to Firestore for the current user
 * @param {string} token - The Expo push token
 * @returns {Promise<boolean>} Success status
 */
async function saveTokenToFirestore(token) {
  if (!auth.currentUser || !token) {
    console.log('Cannot save token: User not logged in or token missing');
    return false;
  }
  
  try {
    const userId = auth.currentUser.uid;
    const userRef = doc(db, 'users', userId);
    
    // Get user document
    const userDoc = await getDoc(userRef);
    
    // Device info to store with token
    const deviceInfo = {
      deviceModel: Platform.OS === 'web' ? 'Web Browser' : (Device?.modelName || Device?.deviceName || 'Unknown device'),
      platform: Platform.OS,
      appVersion: Constants?.expoConfig?.version || 'Unknown',
      lastUpdated: new Date().toISOString()
    };
    
    if (userDoc.exists()) {
      // Get existing tokens
      const userData = userDoc.data();
      const expoPushTokens = userData.expoPushTokens || [];
      const expoPushTokenData = userData.expoPushTokenData || [];
      
      // Check if token already exists
      if (!expoPushTokens.includes(token)) {
        // Add token to arrays
        await updateDoc(userRef, {
          expoPushTokens: [...expoPushTokens, token],
          expoPushTokenData: [...expoPushTokenData, { token, ...deviceInfo }]
        });
      } else {
        // Update token data if token already exists
        const updatedTokenData = expoPushTokenData.filter(t => t.token !== token);
        updatedTokenData.push({ token, ...deviceInfo });
        
        await updateDoc(userRef, {
          expoPushTokenData: updatedTokenData
        });
      }
    } else {
      // Create new user document
      await setDoc(userRef, {
        email: auth.currentUser.email,
        displayName: auth.currentUser.displayName || '',
        expoPushTokens: [token],
        expoPushTokenData: [{ token, ...deviceInfo }],
        createdAt: new Date().toISOString()
      });
    }
    
    console.log('Token saved successfully to Firestore');
    return true;
  } catch (error) {
    console.error('Error saving token to Firestore:', error);
    return false;
  }
}

/**
 * Remove Expo push token from Firestore when user logs out
 * @param {string} token - The Expo push token to remove
 * @returns {Promise<boolean>} Success status
 */
export async function removeTokenFromFirestore(token) {
  if (!auth.currentUser || !token) {
    return false;
  }
  
  try {
    const userId = auth.currentUser.uid;
    const userRef = doc(db, 'users', userId);
    
    // Get user document
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const expoPushTokens = userData.expoPushTokens || [];
      const expoPushTokenData = userData.expoPushTokenData || [];
      
      // Remove this token from arrays
      if (expoPushTokens.includes(token)) {
        await updateDoc(userRef, {
          expoPushTokens: expoPushTokens.filter(t => t !== token),
          expoPushTokenData: expoPushTokenData.filter(t => t.token !== token)
        });
        
        console.log('Token removed from Firestore');
      }
      
      // Also remove from server
      try {
        const authToken = await auth.currentUser.getIdToken();
        await fetch(`${API_BASE_URL}/notifications/token/${token}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });
        console.log('Token removed from server');
      } catch (serverError) {
        console.error('Error removing token from server:', serverError);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error removing token from Firestore:', error);
    return false;
  }
}

/**
 * Create a notification document in Firestore
 * @param {string} userId - User ID
 * @param {object} notification - Notification object with title, body, and data
 * @returns {Promise<Object>} Result with success status and notification ID
 */
export async function createNotificationDocument(userId, notification) {
  try {
    if (!userId || !notification?.title || !notification?.body) {
      console.error('Invalid notification data:', { userId, notification });
      return { success: false, error: 'Missing required notification data' };
    }
    
    // Create notification in Firestore
    const notificationsRef = collection(db, 'notifications');
    
    const notificationData = {
      userId,
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
      read: false,
      createdAt: new Date().toISOString(),
      source: 'client-app'
    };
    
    const docRef = await addDoc(notificationsRef, notificationData);
    console.log('Notification document created with ID:', docRef.id);
    
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creating notification document:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Handle notification response (when user taps a notification)
 * @param {object} response - Notification response object
 */
function handleNotificationResponse(response) {
  if (Platform.OS === 'web') return;
  
  const { data } = response.notification.request.content;
  
  // Handle different notification types
  switch(data.type) {
    case 'reservation_confirmation':
      // Handle reservation confirmation
      console.log('User tapped reservation confirmation notification:', data.reservationId);
      // Navigation would be handled by the app's navigation system
      break;
      
    case 'reservation_reminder':
      // Handle reservation reminder
      console.log('User tapped reservation reminder notification:', data.reservationId);
      break;
      
    default:
      console.log('Unknown notification type:', data.type);
  }
}

/**
 * Schedule a local notification
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Additional data to include
 * @param {number} seconds - Seconds until notification is shown
 * @returns {Promise<Object>} Result with success status and notification ID
 */
export async function scheduleLocalNotification(title, body, data = {}, seconds = 2) {
  // Web platform - browser notifications
  if (Platform.OS === 'web') {
    try {
      if (!('Notification' in window)) {
        return { success: false, error: 'Browser notifications not supported' };
      }
      
      if (Notification.permission !== 'granted') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          return { success: false, error: 'Browser notification permission denied' };
        }
      }
      
      // Schedule using setTimeout to mimic the delay
      setTimeout(() => {
        const notification = new Notification(title, {
          body,
          data,
          icon: '/icon.png' // Optional: path to your app icon
        });
        
        notification.onclick = function() {
          console.log('Browser notification clicked', data);
          window.focus();
        };
      }, seconds * 1000);
      
      return { success: true, browser: true };
    } catch (error) {
      console.error('Error showing browser notification:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Native platforms - Expo notifications
  if (!Notifications) {
    return { success: false, error: 'Notifications module not available' };
  }
  
  try {
    // Use the appropriate channel for Android
    const androidChannel = data.type?.includes('reservation') ? 'reservations' : 'default';
    
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
        badge: 1,
        ...(Platform.OS === 'android' && { 
          channelId: androidChannel,
          color: '#1a1a1a'
        })
      },
      trigger: { seconds },
    });
    
    console.log(`Local notification scheduled with ID: ${identifier}`);
    return { success: true, identifier };
  } catch (error) {
    console.error('Error scheduling local notification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send notification to user via server
 * @param {string} userId - User ID
 * @param {object} notification - Notification object with title, body, and data
 * @returns {Promise<Object>} Result with success status
 */
export async function sendNotificationToUser(userId, notification) {
  try {
    if (!userId || !notification?.title || !notification?.body) {
      return { success: false, error: 'Missing required parameters' };
    }
    
    // Create notification document in Firestore first (as backup)
    const docResult = await createNotificationDocument(userId, notification);
    
    // Get ID token for authentication with server
    let authToken = null;
    if (auth.currentUser) {
      try {
        authToken = await auth.currentUser.getIdToken();
      } catch (tokenError) {
        console.error('Error getting auth token:', tokenError);
      }
    }
    
    // Prepare request headers
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    // Call the notification server API with timeout
    console.log(`Sending notification to server for user: ${userId}`);
    
    try {
      // Set up timeout for the fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(`${API_BASE_URL}/notifications/send`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId,
          notification
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId); // Clear the timeout
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Error sending notification');
      }
      
      console.log('Server notification sent successfully');
      return result;
    } catch (fetchError) {
      console.error('Error sending notification to server:', fetchError);
      
      // For network errors, timeout errors, and other connection issues
      if (fetchError.name === 'AbortError' || 
          fetchError.message === 'Network request failed' ||
          fetchError.message.includes('timeout') ||
          fetchError.message.includes('network')) {
        console.log('Connection issue detected - falling back to local notification');
        
        // Fall back to local notification
        if (__DEV__ || Platform.OS !== 'web') {
          const localResult = await scheduleLocalNotification(
            notification.title,
            notification.body,
            notification.data || {},
            2 // 2 seconds delay
          );
          
          return { 
            success: true, 
            fallback: true, 
            local: true,
            notificationDocId: docResult.success ? docResult.id : null
          };
        }
      }
      
      // Return the document ID so the notification isn't completely lost
      return { 
        success: false, 
        error: fetchError.message,
        notificationDocId: docResult.success ? docResult.id : null
      };
    }
  } catch (error) {
    console.error('Error in sendNotificationToUser:', error);
    
    // Fall back to local notification in development or on native platforms
    if (__DEV__ || Platform.OS !== 'web') {
      try {
        console.log('Falling back to local notification');
        const localResult = await scheduleLocalNotification(
          notification.title,
          notification.body,
          notification.data || {}
        );
        return { success: true, fallback: true, local: true };
      } catch (localError) {
        console.error('Error with fallback notification:', localError);
      }
    }
    
    return { success: false, error: error.message };
  }
}

/**
 * Send a reservation confirmation notification
 * @param {string} userId - User ID
 * @param {object} reservation - Reservation object
 * @returns {Promise<Object>} Result with success status
 */
export async function sendReservationConfirmation(userId, reservation) {
  try {
    // Format reservation date for display
    const reservationDate = new Date(reservation.date);
    const displayDate = reservationDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Create notification payload
    const notification = {
      title: 'Reservation Confirmed!',
      body: `Your reservation at ${reservation.restaurantName} on ${displayDate} at ${reservation.time} has been confirmed.`,
      data: {
        type: 'reservation_confirmation',
        reservationId: reservation.id || '',
        restaurantId: reservation.restaurantId || '',
        date: reservation.date || '',
        time: reservation.time || ''
      }
    };

    // Create notification document in Firestore
    await createNotificationDocument(userId, notification);

    // Server-side notifications handling
    if (reservation.serverNotifications === true) {
      console.log('Using server-side notifications');
      
      try {
        // Call server API for scheduling reminders
        const result = await callNotificationServer('/reservations/schedule-reminders', {
          userId,
          reservationId: reservation.id,
          restaurantName: reservation.restaurantName,
          date: reservation.date,
          time: reservation.time
        });
        console.log("The result is ", result)
        if (result.success) {
          console.log('Server-side reminders scheduled successfully');
          return { success: true, serverHandled: true };
        }
      } catch (serverError) {
        console.error('Error scheduling server reminders:', serverError);
        // Continue with client-side as fallback
      }
    }

    // Try sending via Expo through server
    try {
      const result = await sendNotificationToUser(userId, notification);
      
      if (result.success) {
        console.log('Notification sent successfully through server');
        return result;
      }
    } catch (serverError) {
      console.error('Server notification failed:', serverError);
      // Continue to fallback
    }

    // Fall back to local notification
    console.log('Falling back to local notification');
    const localResult = await scheduleLocalNotification(
      notification.title,
      notification.body,
      notification.data
    );

    return localResult;
  } catch (error) {
    console.error('Error sending reservation confirmation:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Call the notification server API
 * @param {string} endpoint - API endpoint
 * @param {object} data - Request data
 * @returns {Promise<Object>} Server response
 */
export async function callNotificationServer(endpoint, data) {
  try {
    // Get ID token for authentication
    let authToken = null;
    if (auth.currentUser) {
      try {
        authToken = await auth.currentUser.getIdToken();
      } catch (tokenError) {
        console.error('Error getting auth token:', tokenError);
      }
    }
    
    // Prepare request headers
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    // Call the server API
    console.log(`Calling server API: ${endpoint}`);
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    console.log("The server response is : ", response)
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || `Error calling ${endpoint}`);
    }
    
    return result;
  } catch (error) {
    console.error(`Error calling ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Set up notification handlers
 * @param {Function} onNotification - Callback for received notifications
 * @param {Function} onNotificationResponse - Callback for notification responses
 * @returns {Function} Cleanup function
 */
export function setupNotificationHandlers(onNotification, onNotificationResponse) {
  // Web platform doesn't support these handlers
  if (Platform.OS === 'web' || !Notifications) {
    console.log('Notification handlers not supported on this platform');
    return () => {};
  }
  
  // Set up notification received handler
  const receivedSubscription = Notifications.addNotificationReceivedListener(notification => {
    handleReceivedNotification(notification);
  });
  
  // Set up notification response handler
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
    console.log('Notification response received in handler:', response);
    
    if (onNotificationResponse) {
      onNotificationResponse(response);
    } else {
      // Default handler
      handleNotificationResponse(response);
    }
  });
  
  // Return cleanup function
  return () => {
    Notifications.removeNotificationSubscription(receivedSubscription);
    Notifications.removeNotificationSubscription(responseSubscription);
  };
}

/**
 * Schedule reminder notifications for a reservation
 * @param {string} reservationId - Reservation ID
 * @param {string} restaurantName - Restaurant name
 * @param {Date|string} reservationDate - Reservation date
 * @param {string} timeString - Time string (e.g. "7:00 PM")
 * @param {boolean} isServerHandled - Whether reminders are handled by server
 * @returns {Promise<Object>} Result with success status
 */
export async function scheduleReservationReminders(
  reservationId, 
  restaurantName, 
  reservationDate, 
  timeString,
  isServerHandled = false
) {
  // Skip for web platform if native modules aren't available
  if ((Platform.OS === 'web' || !Notifications) && !isServerHandled) {
    console.log('Native notification scheduling not available, trying server...');
    
    // Try to schedule via server even for web if that option is available
    if (isServerHandled) {
      try {
        const result = await callNotificationServer('/reservations/schedule-reminders', {
          userId: auth.currentUser?.uid,
          reservationId,
          restaurantName,
          date: reservationDate instanceof Date ? reservationDate.toISOString() : reservationDate,
          time: timeString,
          guests: 1 // Default value if not provided
        });
        
        return { success: true, serverHandled: true };
      } catch (error) {
        console.error('Error scheduling server reminders:', error);
        return { success: false, error: error.message };
      }
    }
    
    return { success: false, error: 'Not supported on this platform' };
  }

  // If server-handled, call the server API
  if (isServerHandled) {
    try {
      console.log('Using server to schedule reminders');
      
      // Update reservation document to indicate server handling
      try {
        const reservationRef = doc(db, 'reservations', reservationId);
        await updateDoc(reservationRef, {
          serverNotifications: true,
          clientRemindersScheduled: false,
          updatedAt: new Date().toISOString()
        });
      } catch (dbError) {
        console.error('Error updating reservation notification preference:', dbError);
        // Continue even if this fails
      }
      
      // Call server API
      const result = await callNotificationServer('/reservations/schedule-reminders', {
        userId: auth.currentUser?.uid,
        reservationId,
        restaurantName,
        date: reservationDate instanceof Date ? reservationDate.toISOString() : reservationDate,
        time: timeString
      });
      
      return { success: true, serverHandled: true, result };
    } catch (error) {
      console.error('Error scheduling server reminders:', error);
      // Fall back to client-side if server fails
      console.log('Falling back to client-side scheduling');
    }
  }

  // Client-side scheduling
  try {
    console.log('Scheduling client-side reminders');
    console.log('Reservation:', { id: reservationId, restaurant: restaurantName });
    console.log('Date input:', reservationDate);
    console.log('Time input:', timeString);

    // 1. Ensure we have a proper Date object
    let dateObj;
    if (reservationDate instanceof Date) {
      dateObj = new Date(reservationDate);
    } else if (typeof reservationDate === 'string') {
      dateObj = new Date(reservationDate);
    } else {
      throw new Error('Invalid date format');
    }

    // 2. Parse the time string (e.g., "7:00 PM")
    const timeParts = timeString.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (!timeParts) {
      throw new Error('Invalid time format');
    }

    let hour = parseInt(timeParts[1]);
    const minute = parseInt(timeParts[2]);
    const period = timeParts[3]?.toUpperCase();

    // Convert to 24-hour format
    if (period === 'PM' && hour < 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;

    // 3. Set the hours and minutes on the date object
    dateObj.setHours(hour, minute, 0, 0);

    // 4. Get current time
    const now = new Date();

    // 5. Only schedule if reservation is in the future
    if (dateObj <= now) {
      console.log('Reservation time is in the past, not scheduling reminders');
      return { success: false, error: 'Reservation time is in the past' };
    }

    // 6. Calculate reminder times
    const dayBefore = new Date(dateObj);
    dayBefore.setDate(dayBefore.getDate() - 1);
    dayBefore.setHours(10, 0, 0, 0); // 10:00 AM the day before
    
    const oneHourBefore = new Date(dateObj.getTime() - (60 * 60 * 1000));
    const thirtyMinBefore = new Date(dateObj.getTime() - (30 * 60 * 1000));
    const fifteenMinBefore = new Date(dateObj.getTime() - (15 * 60 * 1000));

    // 7. Define notifications to schedule
    const reminders = [
      // Only schedule day-before reminder if it's more than 3 hours in the future
      ...(dayBefore > new Date(now.getTime() + (3 * 60 * 60 * 1000)) ? [{
        type: 'day-before',
        triggerDate: dayBefore,
        title: 'Reservation Tomorrow',
        body: `Don't forget your reservation at ${restaurantName} tomorrow at ${timeString}.`,
        minutesBefore: 24 * 60
      }] : []),
      
      // Only schedule 1-hour reminder if it's in the future
      ...(oneHourBefore > now ? [{
        type: '1-hour',
        triggerDate: oneHourBefore,
        title: 'Reservation Soon',
        body: `Your reservation at ${restaurantName} is in 1 hour.`,
        minutesBefore: 60
      }] : []),
      
      // 30-minute reminder
      ...(thirtyMinBefore > now ? [{
        type: '30-minute',
        triggerDate: thirtyMinBefore,
        title: 'Reservation Reminder',
        body: `Your reservation at ${restaurantName} is in 30 minutes.`,
        minutesBefore: 30
      }] : []),
      
      // 15-minute reminder
      ...(fifteenMinBefore > now ? [{
        type: '15-minute',
        triggerDate: fifteenMinBefore,
        title: 'Reservation Reminder',
        body: `Your reservation at ${restaurantName} is in 15 minutes.`,
        minutesBefore: 15
      }] : []),
      
      // At time of reservation
      ...(dateObj > now ? [{
        type: 'start',
        triggerDate: dateObj,
        title: 'Reservation Starting',
        body: `Your reservation at ${restaurantName} is starting now.`,
        minutesBefore: 0
      }] : [])
    ];

    // 8. Schedule the notifications
    const scheduledNotifications = [];

    for (const reminder of reminders) {
      try {
        const secondsUntilTrigger = Math.floor((reminder.triggerDate.getTime() - now.getTime()) / 1000);
        
        // Only schedule if it's at least 5 seconds in the future
        if (secondsUntilTrigger < 5) {
          console.log(`Skipping ${reminder.type} reminder - too soon`);
          continue;
        }
        
        // Schedule with Expo Notifications
        const identifier = await Notifications.scheduleNotificationAsync({
          content: {
            title: reminder.title,
            body: reminder.body,
            data: {
              type: 'reservation_reminder',
              reservationId,
              restaurantId: '',
              minutesBefore: reminder.minutesBefore
            },
            sound: 'default',
            ...(Platform.OS === 'android' && { channelId: 'reservations' })
          },
          trigger: {
            date: reminder.triggerDate,
          },
        });

        scheduledNotifications.push({
          id: identifier,
          type: reminder.type,
          time: reminder.triggerDate.toISOString(),
          minutesBefore: reminder.minutesBefore
        });

        console.log(`Scheduled ${reminder.type} reminder: ${identifier} at ${reminder.triggerDate.toISOString()}`);
      } catch (scheduleError) {
        console.error(`Error scheduling ${reminder.type} reminder:`, scheduleError);
      }
    }

    // 9. Save scheduled notification IDs to AsyncStorage
    if (scheduledNotifications.length > 0) {
      await saveScheduledReminders(reservationId, scheduledNotifications);
      
      // Update reservation document
      try {
        const reservationRef = doc(db, 'reservations', reservationId);
        await updateDoc(reservationRef, {
          clientRemindersScheduled: true,
          clientReminderIds: scheduledNotifications.map(n => n.id),
          clientRemindersScheduledAt: new Date().toISOString(),
          serverNotifications: false
        });
      } catch (dbError) {
        console.error('Error updating reservation with reminder IDs:', dbError);
      }
    }

    return {
      success: scheduledNotifications.length > 0,
      scheduledNotifications,
      count: scheduledNotifications.length
    };

  } catch (error) {
    console.error('Error scheduling reminders:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Save scheduled notification IDs to AsyncStorage
 * @param {string} reservationId - Reservation ID
 * @param {Array} notifications - Array of scheduled notifications
 * @returns {Promise<boolean>} Success status
 */
async function saveScheduledReminders(reservationId, notifications) {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    
    // Get existing scheduled notifications
    const existingData = await AsyncStorage.getItem('scheduledReminders');
    const scheduledReminders = existingData ? JSON.parse(existingData) : {};
    
    // Add or update the reminders for this reservation
    scheduledReminders[reservationId] = notifications;
    
    // Save back to AsyncStorage
    await AsyncStorage.setItem('scheduledReminders', JSON.stringify(scheduledReminders));
    
    console.log(`Saved ${notifications.length} scheduled reminders for reservation ${reservationId}`);
    
    return true;
  } catch (error) {
    console.error('Error saving scheduled reminders:', error);
    return false;
  }
}

/**
 * Cancel reminders for a reservation
 * @param {string} reservationId - Reservation ID to cancel reminders for
 * @returns {Promise<Object>} Result with success status
 */
export async function cancelReservationReminders(reservationId) {
  try {
    // Skip for web platform
    if (Platform.OS === 'web' || !Notifications) {
      // Try to cancel on server if possible
      try {
        const result = await callNotificationServer('/reservations/cancel-reminders', {
          reservationId
        });
        return { success: true, serverHandled: true };
      } catch (error) {
        console.error('Error canceling server reminders:', error);
        return { success: false, error: 'Not supported on this platform' };
      }
    }
    
    // Import AsyncStorage
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    
    // Get scheduled notifications from AsyncStorage
    const existingData = await AsyncStorage.getItem('scheduledReminders');
    if (!existingData) {
      return { success: true, message: 'No reminders found' };
    }
    
    const scheduledReminders = JSON.parse(existingData);
    
    // Check if reservation has any scheduled reminders
    if (!scheduledReminders[reservationId]) {
      return { success: true, message: 'No reminders for this reservation' };
    }
    
    // Cancel each scheduled notification
    const remindersToCancel = scheduledReminders[reservationId];
    let canceledCount = 0;
    
    for (const reminder of remindersToCancel) {
      try {
        await Notifications.cancelScheduledNotificationAsync(reminder.id);
        canceledCount++;
      } catch (cancelError) {
        console.log(`Error canceling reminder ${reminder.id}:`, cancelError);
        // Continue with other reminders even if one fails
      }
    }
    
    // Remove from storage
    delete scheduledReminders[reservationId];
    await AsyncStorage.setItem('scheduledReminders', JSON.stringify(scheduledReminders));
    
    console.log(`Canceled ${canceledCount} reminders for reservation ${reservationId}`);
    
    // Update reservation document
    try {
      const reservationRef = doc(db, 'reservations', reservationId);
      await updateDoc(reservationRef, {
        clientRemindersScheduled: false,
        clientRemindersCanceled: true,
        clientRemindersCanceledAt: new Date().toISOString()
      });
    } catch (dbError) {
      console.error('Error updating reservation after canceling reminders:', dbError);
    }
    
    return { 
      success: true, 
      canceledCount 
    };
  } catch (error) {
    console.error('Error canceling reminders:', error);
    return { success: false, error: error.message };
  }
}

/**
 * List all pending notifications
 * @returns {Promise<Object>} Result with all scheduled notifications
 */
export async function getAllScheduledNotifications() {
  try {
    // Skip for web platform
    if (Platform.OS === 'web' || !Notifications) {
      return { success: false, error: 'Not supported on this platform' };
    }
    
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    
    return {
      success: true, 
      notifications: scheduledNotifications
    };
  } catch (error) {
    console.error('Error getting scheduled notifications:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get cached scheduled reminders from AsyncStorage
 * @returns {Promise<Object>} Object mapping reservation IDs to scheduled notifications
 */
export async function getCachedScheduledReminders() {
  try {
    // Skip for web platform
    if (Platform.OS === 'web') {
      return {};
    }
    
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const data = await AsyncStorage.getItem('scheduledReminders');
    
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Error getting cached reminders:', error);
    return {};
  }
}

/**
 * Update notification preferences for a reservation
 * @param {string} reservationId - Reservation ID
 * @param {boolean} useServerNotifications - Whether to use server notifications
 * @returns {Promise<Object>} Result with success status
 */
export async function updateReservationNotificationPreferences(reservationId, useServerNotifications) {
  try {
    // Update the reservation document
    const reservationRef = doc(db, 'reservations', reservationId);
    
    await updateDoc(reservationRef, {
      serverNotifications: useServerNotifications,
      notificationPreferencesUpdatedAt: new Date().toISOString()
    });
    
    // If switching to server notifications, cancel any client reminders
    if (useServerNotifications) {
      await cancelReservationReminders(reservationId);
      
      // Schedule on server
      try {
        const reservationDoc = await getDoc(reservationRef);
        if (reservationDoc.exists()) {
          const reservation = reservationDoc.data();
          
          await callNotificationServer('/reservations/schedule-reminders', {
            reservationId,
            userId: reservation.userId,
            restaurantName: reservation.restaurantName,
            date: reservation.date,
            time: reservation.time
          });
        }
      } catch (serverError) {
        console.error('Error scheduling server reminders:', serverError);
      }
    } else {
      // Switching to client notifications
      // Get reservation data
      const reservationDoc = await getDoc(reservationRef);
      
      if (reservationDoc.exists()) {
        const reservation = reservationDoc.data();
        
        // Schedule client reminders
        await scheduleReservationReminders(
          reservationId,
          reservation.restaurantName,
          reservation.date,
          reservation.time,
          false // explicitly set useServerNotifications to false
        );
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Utility function to format a date for display
 * @param {Date|string} date - Date to format
 * @param {string} format - Format style ('short', 'medium', 'long')
 * @returns {string} Formatted date string
 */
export function formatDate(date, format = 'medium') {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const options = {
    short: { month: 'numeric', day: 'numeric' },
    medium: { weekday: 'short', month: 'short', day: 'numeric' },
    long: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
  };
  
  return dateObj.toLocaleDateString('en-US', options[format] || options.medium);
}

/**
 * Utility function to format a time for display
 * @param {string} timeString - Time string (e.g., "7:00 PM")
 * @returns {string} Formatted time string
 */
export function formatTime(timeString) {
  if (!timeString) return '';
  return timeString;
}
export function resetPushTokenRegistrationState() {
  try {
    const wasInProgress = global._expoPushTokenRegistrationInProgress === true;
    
    // Clear the registration in progress flag
    global._expoPushTokenRegistrationInProgress = false;
    global._expoPushTokenRegistrationStartTime = null;
    
    console.log(`Push token registration state reset. Was in progress: ${wasInProgress}`);
    return true;
  } catch (error) {
    console.error('Error resetting push token registration state:', error);
    return false;
  }
}
// Default export
const notificationService = {
  registerForPushNotifications,
  removeTokenFromFirestore,
  scheduleLocalNotification,
  sendNotificationToUser,
  sendReservationConfirmation,
  callNotificationServer,
  setupNotificationHandlers,
  cancelReservationReminders,
  scheduleReservationReminders,
  getAllScheduledNotifications,
  createNotificationDocument,
  getCachedScheduledReminders,
  updateReservationNotificationPreferences,
  formatDate,
  resetPushTokenRegistrationState,
  formatTime
};

export default notificationService;