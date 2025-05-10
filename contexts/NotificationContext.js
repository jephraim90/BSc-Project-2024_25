import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { auth, db } from '../services/firebaseConfig';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, limit } from 'firebase/firestore';
import notificationService from '@/services/notificationService';
import NotificationToast from '@/components/NotificationToast';
import { useAuth } from './AuthContext';

// Create context
const NotificationContext = createContext();

// Custom hook to use the notification context
export const useNotification = () => {
  return useContext(NotificationContext);
};

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeNotification, setActiveNotification] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [subscribedToFirestore, setSubscribedToFirestore] = useState(false);

  // Setup notification handlers for foreground notifications (native platforms only)
  useEffect(() => {
    if (Platform.OS === 'web') return;
    
    let cleanupFunction = () => {};
    
    try {
      // Custom handlers for received notifications
      const onNotification = (notification) => {
        console.log('Notification received in foreground:', notification);
        
        // Extract relevant data
        const { title, body, data } = notification.request.content;
        
        // Add to notifications queue
        addNotification({
          id: notification.request.identifier,
          title,
          body,
          data: data || {},
          timestamp: new Date(),
          isLocal: true
        });
      };
      
      // Setup the handlers
      cleanupFunction = notificationService.setupNotificationHandlers(
        onNotification,
        null // Use default response handler
      );
      
      console.log('Notification handlers set up successfully');
    } catch (error) {
      console.error('Error setting up notification handlers:', error);
    }
    
    return cleanupFunction;
  }, []);

  // Subscribe to Firestore notifications collection
  useEffect(() => {
    if (!user || subscribedToFirestore) return;
    
    let unsubscribe = () => {};
    
    try {
      console.log('Setting up Firestore notifications listener for user:', user.uid);
      
      const notificationsRef = collection(db, 'notifications');
      const q = query(
        notificationsRef,
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(20)
      );
      
      unsubscribe = onSnapshot(q, (snapshot) => {
        const newNotifications = [];
        let newUnreadCount = 0;
        
        snapshot.forEach((doc) => {
          const notificationData = doc.data();
          
          // Add the notification to the array
          newNotifications.push({
            id: doc.id,
            ...notificationData,
            timestamp: notificationData.createdAt ? new Date(notificationData.createdAt) : new Date(),
            fromFirestore: true
          });
          
          // Count unread notifications
          if (!notificationData.read) {
            newUnreadCount++;
          }
        });
        
        setNotifications(newNotifications);
        setUnreadCount(newUnreadCount);
        setSubscribedToFirestore(true);
        setIsInitialized(true);
        
        console.log(`Loaded ${newNotifications.length} notifications, ${newUnreadCount} unread`);
      }, (error) => {
        console.error('Error listening to Firestore notifications:', error);
        setIsInitialized(true); // Mark as initialized even with error
      });
    } catch (error) {
      console.error('Error setting up Firestore notifications listener:', error);
      setIsInitialized(true); // Mark as initialized even with error
    }
    
    return () => {
      unsubscribe();
      setSubscribedToFirestore(false);
    };
  }, [user]);

  // Handle notification queue for displaying toast notifications
  useEffect(() => {
    if (!isInitialized) return;
    
    if (notifications.length > 0 && !activeNotification) {
      // Get the first unread notification or the most recent one
      const unreadNotifications = notifications.filter(n => !n.read);
      
      if (unreadNotifications.length > 0) {
        setActiveNotification(unreadNotifications[0]);
      } else if (notifications.length > 0) {
        // If all are read, show the most recent one
        setActiveNotification(notifications[0]);
      }
    }
  }, [notifications, activeNotification, isInitialized]);

  // Add notification to the queue
  const addNotification = (notification) => {
    if (!notification) return;
    
    setNotifications(prev => {
      // Check if notification already exists by ID
      const exists = prev.some(n => n.id === notification.id);
      
      if (exists) {
        return prev;
      }
      
      // Add new notification at the beginning
      return [notification, ...prev];
    });
    
    // Increment unread count
    setUnreadCount(prev => prev + 1);
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      if (!notificationId) return;
      
      // Update Firestore if it's a Firestore notification
      const notification = notifications.find(n => n.id === notificationId);
      
      if (notification?.fromFirestore) {
        const notificationRef = doc(db, 'notifications', notificationId);
        await updateDoc(notificationRef, {
          read: true,
          readAt: new Date().toISOString()
        });
      }
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      // Get unread notifications
      const unreadNotifications = notifications.filter(n => !n.read && n.fromFirestore);
      
      // Update each in Firestore
      const updatePromises = unreadNotifications.map(notification => {
        const notificationRef = doc(db, 'notifications', notification.id);
        return updateDoc(notificationRef, {
          read: true,
          readAt: new Date().toISOString()
        });
      });
      
      await Promise.all(updatePromises);
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      );
      
      // Reset unread count
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Dismiss active notification toast
  const dismissNotification = () => {
    if (activeNotification) {
      // Mark as read when dismissed
      markAsRead(activeNotification.id);
    }
    
    setActiveNotification(null);
  };

  // Send test notification (for development)
  const sendTestNotification = async () => {
    try {
      // Generate a unique ID
      const testId = `test-${Date.now()}`;
      
      // Create notification object
      const notification = {
        id: testId,
        title: 'Test Notification',
        body: 'This is a test notification from the app.',
        data: { type: 'test', timestamp: Date.now() },
        timestamp: new Date(),
        isTest: true
      };
      
      // Add to local queue
      addNotification(notification);
      
      // Also try to schedule a local notification
      if (Platform.OS !== 'web') {
        await notificationService.scheduleLocalNotification(
          notification.title,
          notification.body,
          notification.data,
          2 // 2 seconds delay
        );
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error sending test notification:', error);
      return { success: false, error: error.message };
    }
  };

  // Check for any scheduled reminders
  const checkScheduledReminders = async () => {
    if (Platform.OS === 'web') {
      return { success: false, error: 'Not supported on web' };
    }
    
    try {
      const result = await notificationService.getAllScheduledNotifications();
      return result;
    } catch (error) {
      console.error('Error checking scheduled reminders:', error);
      return { success: false, error: error.message };
    }
  };

  // Context value
  const value = {
    notifications,
    unreadCount,
    isInitialized,
    addNotification,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    sendTestNotification,
    checkScheduledReminders
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {activeNotification && (
        <NotificationToast
          notification={activeNotification}
          onDismiss={dismissNotification}
          onPress={() => markAsRead(activeNotification.id)}
        />
      )}
    </NotificationContext.Provider>
  );
};