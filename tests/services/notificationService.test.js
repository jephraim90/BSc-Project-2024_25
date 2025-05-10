import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import notificationService from '../../services/notificationService';
import { doc, updateDoc, collection, query, where, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import axios from 'axios';

// Mock dependencies
jest.mock('expo-notifications');
jest.mock('firebase/firestore');
jest.mock('axios');

describe('NotificationService', () => {
  // Store original platform
  const originalPlatform = Platform.OS;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up platform mock
    Object.defineProperty(Platform, 'OS', {
      get: jest.fn(() => 'ios')
    });
    
    // Mock auth
    auth.currentUser = {
      uid: 'test-user-id',
      getIdToken: jest.fn().mockResolvedValue('mock-token')
    };
    
    // Mock Notifications methods
    Notifications.getPermissionsAsync.mockResolvedValue({ status: 'granted' });
    Notifications.requestPermissionsAsync.mockResolvedValue({ status: 'granted' });
    Notifications.getExpoPushTokenAsync.mockResolvedValue({ data: 'ExpoPushToken[test-token]' });
    Notifications.scheduleNotificationAsync.mockResolvedValue('notification-id');
  });
  
  afterEach(() => {
    // Restore platform
    Object.defineProperty(Platform, 'OS', {
      get: jest.fn(() => originalPlatform)
    });
  });
  
  describe('registerForPushNotifications', () => {
    test('registers for push notifications successfully', async () => {
      // Act
      const result = await notificationService.registerForPushNotifications();
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.token).toBe('ExpoPushToken[test-token]');
      expect(Notifications.getPermissionsAsync).toHaveBeenCalled();
      expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalled();
      
      // Should save token to user document
      expect(doc).toHaveBeenCalledWith(db, 'users', 'test-user-id');
      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          expoPushToken: 'ExpoPushToken[test-token]',
          tokenUpdatedAt: expect.any(String)
        })
      );
    });
    
    test('requests permissions if not already granted', async () => {
      // Arrange
      Notifications.getPermissionsAsync.mockResolvedValue({ status: 'undetermined' });
      
      // Act
      await notificationService.registerForPushNotifications();
      
      // Assert
      expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
    });
    
    test('handles permission denial', async () => {
      // Arrange
      Notifications.getPermissionsAsync.mockResolvedValue({ status: 'denied' });
      Notifications.requestPermissionsAsync.mockResolvedValue({ status: 'denied' });
      
      // Act
      const result = await notificationService.registerForPushNotifications();
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Permission not granted');
      expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
    });
    
    test('handles web platform', async () => {
      // Arrange
      Object.defineProperty(Platform, 'OS', {
        get: jest.fn(() => 'web')
      });
      
      // Act
      const result = await notificationService.registerForPushNotifications();
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Push notifications not supported on web');
    });
    
    test('handles errors getting push token', async () => {
      // Arrange
      Notifications.getExpoPushTokenAsync.mockRejectedValue(new Error('Failed to get token'));
      
      // Act
      const result = await notificationService.registerForPushNotifications();
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to get push token');
    });
  });
  
  describe('scheduleLocalNotification', () => {
    test('schedules a notification successfully', async () => {
      // Arrange
      const title = 'Test Notification';
      const body = 'This is a test notification';
      const data = { type: 'test', id: '123' };
      
      // Act
      const result = await notificationService.scheduleLocalNotification(title, body, data);
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.id).toBe('notification-id');
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title,
          body,
          data,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH
        },
        trigger: null // Immediate notification
      });
    });
    
    test('schedules a delayed notification', async () => {
      // Act
      await notificationService.scheduleLocalNotification('Title', 'Body', {}, 60);
      
      // Assert
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          trigger: { seconds: 60 }
        })
      );
    });
    
    test('handles web platform', async () => {
      // Arrange
      Object.defineProperty(Platform, 'OS', {
        get: jest.fn(() => 'web')
      });
      
      // Act
      const result = await notificationService.scheduleLocalNotification('Title', 'Body');
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Web notifications not implemented');
    });
    
    test('handles permission denial', async () => {
      // Arrange
      Notifications.getPermissionsAsync.mockResolvedValue({ status: 'denied' });
      Notifications.requestPermissionsAsync.mockResolvedValue({ status: 'denied' });
      
      // Act
      const result = await notificationService.scheduleLocalNotification('Title', 'Body');
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Permission not granted');
    });
  });
  
  describe('isValidExpoPushToken', () => {
    test('validates correct Expo token formats', () => {
      expect(notificationService.isValidExpoPushToken('ExpoPushToken[xxxxxxxxxxxxxxxxxxxxxx]')).toBe(true);
      expect(notificationService.isValidExpoPushToken('ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]')).toBe(true);
    });
    
    test('invalidates incorrect token formats', () => {
      expect(notificationService.isValidExpoPushToken('InvalidToken')).toBe(false);
      expect(notificationService.isValidExpoPushToken('ExpoPushToken[]')).toBe(false);
      expect(notificationService.isValidExpoPushToken(null)).toBe(false);
      expect(notificationService.isValidExpoPushToken(undefined)).toBe(false);
      expect(notificationService.isValidExpoPushToken(123)).toBe(false);
    });
  });
  
  describe('scheduleReservationReminders', () => {
    test('schedules multiple reminders for a reservation', async () => {
      // Arrange
      const reservationId = 'reservation-123';
      const restaurantName = 'Test Restaurant';
      const date = new Date('2025-05-15T19:00:00.000Z'); // 7:00 PM
      const time = '7:00 PM';
      
      // Mock current date to be before the reservation
      const mockNow = new Date('2025-05-14T12:00:00.000Z');
      jest.spyOn(global.Date, 'now').mockImplementation(() => mockNow.getTime());
      
      // Act
      const result = await notificationService.scheduleReservationReminders(
        reservationId, restaurantName, date, time, false
      );
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.count).toBe(4); // day before, 1 hour, 30 min, at time
      
      // Should schedule 4 notifications
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(4);
      
      // Should store reminders in database
      expect(setDoc).toHaveBeenCalledTimes(4);
      
      // Should update reservation
      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          clientRemindersScheduled: true,
          scheduledReminders: expect.any(Array)
        })
      );
    });
    
    test('handles server notifications', async () => {
      // Arrange
      axios.post.mockResolvedValue({ data: { success: true } });
      
      // Act
      const result = await notificationService.scheduleReservationReminders(
        'reservation-123', 'Test Restaurant', new Date(), '7:00 PM', true
      );
      
      // Assert
      expect(result.success).toBe(true);
      expect(axios.post).toHaveBeenCalled();
      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });
    
    test('filters out past reminders', async () => {
      // Arrange
      const reservationDate = new Date('2025-05-15T19:00:00.000Z'); // 7:00 PM
      
      // Mock current date to be after day-before reminder but before 1-hour reminder
      const mockNow = new Date('2025-05-15T17:30:00.000Z'); // 5:30 PM same day
      jest.spyOn(global.Date, 'now').mockImplementation(() => mockNow.getTime());
      
      // Act
      const result = await notificationService.scheduleReservationReminders(
        'reservation-123', 'Test Restaurant', reservationDate, '7:00 PM', false
      );
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.count).toBe(2); // Only 1-hour and at-time reminders should be scheduled
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
    });
    
    test('handles invalid time format', async () => {
      // Act
      const result = await notificationService.scheduleReservationReminders(
        'reservation-123', 'Test Restaurant', new Date(), 'Invalid Time', false
      );
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid time format');
    });
    
    test('handles past reservations', async () => {
      // Arrange
      const pastDate = new Date('2023-01-01T12:00:00.000Z');
      
      // Act
      const result = await notificationService.scheduleReservationReminders(
        'reservation-123', 'Test Restaurant', pastDate, '12:00 PM', false
      );
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Reservation time is in the past');
    });
  });
  
  describe('cancelReservationReminders', () => {
    test('cancels all reminders for a reservation', async () => {
      // Arrange
      const reservationId = 'reservation-123';
      
      // Mock finding some reminders
      getDocs.mockResolvedValue({
        docs: [
          {
            id: 'reminder-1',
            ref: 'doc-ref-1',
            data: () => ({
              notificationId: 'notification-1',
              type: 'day-before'
            })
          },
          {
            id: 'reminder-2',
            ref: 'doc-ref-2',
            data: () => ({
              notificationId: 'notification-2',
              type: '1-hour'
            })
          }
        ]
      });
      
      // Act
      const result = await notificationService.cancelReservationReminders(reservationId);
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.count).toBe(2);
      
      // Should query for reminders
      expect(collection).toHaveBeenCalledWith(db, 'scheduledReminders');
      expect(where).toHaveBeenCalledWith('reservationId', '==', reservationId);
      
      // Should cancel each notification
      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(2);
      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('notification-1');
      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('notification-2');
      
      // Should delete each document
      expect(deleteDoc).toHaveBeenCalledTimes(2);
      
      // Should update reservation
      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          clientRemindersScheduled: false,
          remindersStatus: 'canceled'
        })
      );
    });
    
    test('handles case with no reminders', async () => {
      // Arrange
      getDocs.mockResolvedValue({ docs: [] });
      
      // Act
      const result = await notificationService.cancelReservationReminders('reservation-123');
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.count).toBe(0);
      expect(Notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
    });
    
    test('handles authentication failure', async () => {
      // Arrange
      auth.currentUser = null;
      
      // Act
      const result = await notificationService.cancelReservationReminders('reservation-123');
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('User not authenticated');
    });
    
    test('continues if one reminder fails to cancel', async () => {
      // Arrange
      getDocs.mockResolvedValue({
        docs: [
          {
            id: 'reminder-1',
            ref: 'doc-ref-1',
            data: () => ({
              notificationId: 'notification-1',
              type: 'day-before'
            })
          },
          {
            id: 'reminder-2',
            ref: 'doc-ref-2',
            data: () => ({
              notificationId: 'notification-2',
              type: '1-hour'
            })
          }
        ]
      });
      
      // Make the first cancellation fail
      Notifications.cancelScheduledNotificationAsync
        .mockResolvedValueOnce()
        .mockRejectedValueOnce(new Error('Failed to cancel'));
      
      // Act
      const result = await notificationService.cancelReservationReminders('reservation-123');
      
      // Assert
      expect(result.success).toBe(true);
      expect(deleteDoc).toHaveBeenCalledTimes(2); // Should still attempt to delete both docs
    });
  });
  
  describe('formatDate', () => {
    test('formats dates correctly with different styles', () => {
      // Arrange
      const testDate = new Date('2025-05-15T19:00:00.000Z');
      
      // Act & Assert
      expect(notificationService.formatDate(testDate, 'full'))
        .toContain('Thursday, May 15, 2025');
      
      expect(notificationService.formatDate(testDate, 'short'))
        .toContain('Thu, May 15, 2025');
      
      // String date
      expect(notificationService.formatDate('2025-05-15T19:00:00.000Z', 'full'))
        .toContain('Thursday, May 15, 2025');
    });
    
    test('handles invalid dates', () => {
      // Invalid date should return original value
      expect(notificationService.formatDate('not-a-date', 'full')).toBe('not-a-date');
    });
  });
});