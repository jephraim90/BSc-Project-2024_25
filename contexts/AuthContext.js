import { createContext, useContext, useState, useEffect } from "react";
import { getCurrentUser, signIn, signUp, signOut } from '../services/authService';
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { db } from '../services/firebaseConfig';
import { onAuthStateChanged } from "firebase/auth";
import { auth } from '../services/firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { registerForPushNotifications, removeTokenFromFirestore } from '../services/notificationService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expoPushToken, setExpoPushToken] = useState(null);
  
  // Fetch Firestore user data and merge with auth user
  const fetchUserWithRole = async (authUser) => {
    if (!authUser) return null;
    
    try {
      const userDoc = await getDoc(doc(db, 'users', authUser.uid));
      return {
        uid: authUser.uid,
        email: authUser.email,
        ...userDoc.data()
      };
    } catch (error) {
      console.log("Error fetching user data:", error);
      return {
        uid: authUser.uid,
        email: authUser.email,
        role: 'user' // Fallback role
      };
    }
  };
  
  // Set up notifications when user logs in
  useEffect(() => {
    // This function will register the device for push notifications when a user logs in
    const setupNotifications = async () => {
      if (user) {
        try {
          console.log("Setting up notifications for user:", user.uid);
          const result = await registerForPushNotifications();
          console.log("The token object is : ", result)
          console.log("The token you will be assigned is : ", result.token)
          if (result.success) {
            console.log("Successfully registered for notifications");
            setExpoPushToken(result.token);
          } else {
            console.log("Failed to register for notifications:", result.error);
          }
        } catch (error) {
          console.error("Error setting up notifications:", error);
        }
      }
    };
  
    setupNotifications();
  }, [user]);

  // Update notification settings with Expo
  useEffect(() => {
    // Only set this up for native platforms (not web)
    if (Platform.OS !== 'web') {
      // Configure how notifications appear when app is in foreground
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true, // Show alerts even when app is in foreground
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
      }
      
      // Listen for notifications
      const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
        console.log('Notification received in foreground:', notification);
      });
      
      const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('Notification response received:', response);
        // Handle notification interaction here
      });
      
      return () => {
        Notifications.removeNotificationSubscription(foregroundSubscription);
        Notifications.removeNotificationSubscription(responseSubscription);
      };
    }
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setLoading(true);
      if (authUser) {
        const mergedUser = await fetchUserWithRole(authUser);
        setUser(mergedUser);
        
        // Register for push notifications when user is logged in
        // if (Platform.OS !== 'web') {
        //   const result = await registerForPushNotifications();
        //   if (result.success) {
        //     setExpoPushToken(result.token);
        //   }
        // }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    
    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    try {
      const response = await signIn(email, password);
      if (response?.error) return response;
      
      // Refresh user data after login
      const authUser = auth.currentUser;
      const mergedUser = await fetchUserWithRole(authUser);
      setUser(mergedUser);
      
      // Register for push notifications after successful login
      // try {
      //   const notificationResult = await registerForPushNotifications();
      //   if (notificationResult.success) {
      //     setExpoPushToken(notificationResult.token);
      //     console.log("Registered for notifications after login");
      //   }
      // } catch (notificationError) {
      //   console.error("Error registering for notifications during login:", notificationError);
      //   // Don't prevent login if notification registration fails
      // }
      
      return { success: true };
    } catch (error) {
      return { error: error.message };
    }
  };

  const register = async (email, password) => {
    try {
      const response = await signUp(email, password);
      if (response?.error) return response;
      
      // Get the newly created user and merge data
      const authUser = auth.currentUser;
      const mergedUser = await fetchUserWithRole(authUser);
      setUser(mergedUser);
      
      // Register for push notifications after successful registration
      if (Platform.OS !== 'web' && authUser) {
        const result = await registerForPushNotifications();
        if (result.success) {
          setExpoPushToken(result.token);
        }
      }
      
      return { success: true };
    } catch (error) {
      return { error: error.message };
    }
  };
 
  const logout = async () => {
    
    console.log("AuthCotext - Starting logout");
    console.log("Wuuuueeeeeh")
         
           // Log the entire imported object
         console.log("signOut from authService (destructured):", signOut);
  
    try {
      // Remove Expo Push Token before signing out
      if (expoPushToken) {
        try {
          await removeTokenFromFirestore(expoPushToken);
          console.log("Removed Expo Push Token on logout");
        } catch (tokenError) {
          console.error("Error removing Expo Push Token:", tokenError);
        }
        setExpoPushToken(null);
      }
      
      console.log("About to call signOut...");
      console.log("Value of signOut:", signOut); // VERY IMPORTANT
      console.log("Type of signOut:", typeof signOut); // VERY IMPORTANT
      // Firebase signOut
      await signOut();
      console.log("AuthContext - Logout logic completed");
      
      // Clear user state
      setUser(null);
      console.log("AuthContext - User state set to null");
      
      // Clear AsyncStorage
      await AsyncStorage.removeItem('user');
      console.log("AuthContext - AsyncStorage cleared");
    } catch (error) {
      console.error("AuthContext - Error during logout:", error);
      throw error;
    } finally {
      return Promise.resolve();
    }
  };

  // Refresh Expo Push Token
  async function refreshExpoPushToken() {
    try {
      // For Expo projects
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId
      });
      const token = tokenData.data;
      console.log('Got new Expo Push Token:', token);
      
      // Update state
      setExpoPushToken(token);
      
      // Update token in Firestore
      if (auth.currentUser) {
        try {
          // Save to Firestore using notificationService
          await removeTokenFromFirestore(expoPushToken); // Remove old token
          const result = await registerForPushNotifications(); // Register with new token
          return { success: true, token };
        } catch (error) {
          console.error('Error updating token in Firestore:', error);
          return { success: false, error: error.message };
        }
      }
      
      return { success: true, token };
    } catch (error) {
      console.error('Error refreshing Expo Push Token:', error);
      return { success: false, error: error.message };
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      login,
      register,
      loading,
      logout,
      expoPushToken,
      setExpoPushToken,
      removeTokenFromFirestore,
      registerForPushNotifications,
      refreshExpoPushToken,
      auth, 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};