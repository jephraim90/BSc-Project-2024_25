import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import { AuthProvider } from '../../contexts/AuthContext';
import { NotificationProvider } from '../../contexts/NotificationContext';
import NotificationTestButton from '../../components/NotificationTestButton';
import ReservationConfirmationNotifier from '../../components/ReservationConfirmationNotifier';
import notificationService from '../../services/notificationService';
import { Platform } from 'react-native';

// Mock dependencies
jest.mock('expo-notifications');
jest.mock('../../services/notificationService');

// Mock context for auth
jest.mock('../../contexts/AuthContext', () => ({
  ...jest.requireActual('../../contexts/AuthContext'),
  useAuth: jest.fn().mockReturnValue({
    user: {
      uid: 'test-user-id',
      displayName: 'Test User',
      email: 'test@example.com'
    },
    expoPushToken: 'ExpoPushToken[test-token]'
  })
}));

describe('Notification System Integration Test', () => {
  // Store original platform
  const originalPlatform = Platform.OS;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up platform mock
    Object.defineProperty(Platform, 'OS', {
      get: jest.fn(() => 'ios')
    });
    
    // Mock notification permissions
    Notifications.getPermissionsAsync.mockResolvedValue({ status: 'granted' });
    Notifications.requestPermissionsAsync.mockResolvedValue({ status: 'granted' });
    
    // Mock schedule notification
    Notifications.scheduleNotificationAsync.mockResolvedValue('notification-id');
    
    // Mock notification service methods
    notificationService.scheduleLocalNotification.mockImplementation(
      async (title, body, data, seconds) => ({
        success: true,
        id: 'test-notification-id'
      })
    );
    
    notificationService.sendNotificationToUser.mockImplementation(
      async (userId, notification) => ({
        success: true,
        message: 'Notification sent successfully'
      })
    );
    
    notificationService.registerForPushNotifications.mockResolvedValue({
      success: true,
      token: 'ExpoPushToken[test-token]'
    });
  });
  
  afterEach(() => {
    // Restore platform
    Object.defineProperty(Platform, 'OS', {
      get: jest.fn(() => originalPlatform)
    });
  });
  
  test('sends a test notification when button is pressed', async () => {
    // Render the test button component
    const { getByText } = render(
      <AuthProvider>
        <NotificationProvider>
          <NotificationTestButton />
        </NotificationProvider>
      </AuthProvider>
    );
    
    // Find and press the test button
    const testButton = getByText('Test Notification');
    fireEvent.press(testButton);
    
    // Verify that the notification was scheduled
    await waitFor(() => {
      expect(notificationService.scheduleLocalNotification).toHaveBeenCalledWith(
        'Test Notification',
        'This is a test notification from the app.',
        expect.objectContaining({ type: 'test' }),
        2 // 2 second delay
      );
    });
    
    // Should show success notification feedback
    await waitFor(() => {
      expect(getByText('Test notification sent!')).toBeTruthy();
    });
  });
  
  test('sends confirmation notification for reservation', async () => {
    // Mock reservation data
    const reservationData = {
      reservationId: 'reservation-123',
      restaurantName: 'Test Restaurant',
      date: '2025-05-15',
      time: '7:00 PM',
      guests: 2,
      userId: 'test-user-id',
      useServerNotifications: false
    };
    
    // Render the confirmation notifier component
    const { getByText } = render(
      <AuthProvider>
        <NotificationProvider>
          <ReservationConfirmationNotifier 
            reservationId={reservationData.reservationId}
            restaurantName={reservationData.restaurantName}
            date={reservationData.date}
            time={reservationData.time}
            guests={reservationData.guests}
            userId={reservationData.userId}
            useServerNotifications={reservationData.useServerNotifications}
          />
        </NotificationProvider>
      </AuthProvider>
    );
    
    // Verify local notification was scheduled
    await waitFor(() => {
      expect(notificationService.scheduleLocalNotification).toHaveBeenCalledWith(
        expect.stringContaining('Confirmed'),
        expect.stringContaining('Test Restaurant'),
        expect.objectContaining({
          type: 'reservation_confirmation',
          reservationId: 'reservation-123'
        }),
        expect.any(Number)
      );
    });
    
    // Should show success message
    await waitFor(() => {
      expect(getByText(/Confirmation notification sent/i)).toBeTruthy();
    });
  });
  
  test('uses server notifications when configured', async () => {
    // Mock reservation data with server notifications enabled
    const reservationData = {
      reservationId: 'reservation-123',
      restaurantName: 'Test Restaurant',
      date: '2025-05-15',
      time: '7:00 PM',
      guests: 2,
      userId: 'test-user-id',
      useServerNotifications: true
    };
    
    // Render the confirmation notifier component
    const { getByText } = render(
      <AuthProvider>
        <NotificationProvider>
          <ReservationConfirmationNotifier 
            reservationId={reservationData.reservationId}
            restaurantName={reservationData.restaurantName}
            date={reservationData.date}
            time={reservationData.time}
            guests={reservationData.guests}
            userId={reservationData.userId}
            useServerNotifications={reservationData.useServerNotifications}
          />
        </NotificationProvider>
      </AuthProvider>
    );
    
    // Verify server notification was sent instead of local notification
    await waitFor(() => {
      expect(notificationService.sendNotificationToUser).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({
          title: expect.stringContaining('Confirmed'),
          body: expect.stringContaining('Test Restaurant'),
          data: expect.objectContaining({
            type: 'reservation_confirmation',
            reservationId: 'reservation-123'
          })
        })
      );
      
      // Local notification should not be used
      expect(notificationService.scheduleLocalNotification).not.toHaveBeenCalled();
    });
    
    // Should show success message
    await waitFor(() => {
      expect(getByText(/Confirmation notification sent/i)).toBeTruthy();
      expect(getByText(/You will receive reminders from our server/i)).toBeTruthy();
    });
  });
  
  test('handles notification permission denial', async () => {
    // Mock permission denial
    Notifications.getPermissionsAsync.mockResolvedValue({ status: 'denied' });
    Notifications.requestPermissionsAsync.mockResolvedValue({ status: 'denied' });
    
    notificationService.scheduleLocalNotification.mockImplementation(
      async (title, body, data, seconds) => ({
        success: false,
        error: 'Permission not granted'
      })
    );
    
    // Render the test button component
    const { getByText, queryByText } = render(
      <AuthProvider>
        <NotificationProvider>
          <NotificationTestButton />
        </NotificationProvider>
      </AuthProvider>
    );
    
    // Find and press the test button
    const testButton = getByText('Test Notification');
    fireEvent.press(testButton);
    
    // Verify that we attempted to schedule
    await waitFor(() => {
      expect(notificationService.scheduleLocalNotification).toHaveBeenCalled();
    });
    
    // Should show error notification
    await waitFor(() => {
      expect(getByText(/Could not send test notification/i)).toBeTruthy();
      expect(getByText(/Permission not granted/i)).toBeTruthy();
    });
  });
  
  test('handles notification errors gracefully', async () => {
    // Mock service error
    notificationService.scheduleLocalNotification.mockRejectedValue(
      new Error('Network error')
    );
    
    // Render the confirmation notifier component
    const { getByText } = render(
      <AuthProvider>
        <NotificationProvider>
          <ReservationConfirmationNotifier 
            reservationId="reservation-123"
            restaurantName="Test Restaurant"
            date="2025-05-15"
            time="7:00 PM"
            guests={2}
            userId="test-user-id"
            useServerNotifications={false}
          />
        </NotificationProvider>
      </AuthProvider>
    );
    
    // Should show error message but reservation is still confirmed
    await waitFor(() => {
      expect(getByText(/We couldn't send a confirmation notification/i)).toBeTruthy();
      expect(getByText(/your reservation is still confirmed/i)).toBeTruthy();
    });
  });
  
  test('automatically initializes notifications during app start', async () => {
    // Create a wrapper component to test initialization
    const AppWrapper = () => (
      <AuthProvider>
        <NotificationProvider>
          <NotificationTestButton />
        </NotificationProvider>
      </AuthProvider>
    );
    
    render(<AppWrapper />);
    
    // Verify notification service was initialized
    await waitFor(() => {
      expect(notificationService.initializeNotifications).toHaveBeenCalled();
    });
  });
  
  test('handles web platform limitations', async () => {
    // Set platform to web
    Object.defineProperty(Platform, 'OS', {
      get: jest.fn(() => 'web')
    });
    
    notificationService.scheduleLocalNotification.mockImplementation(
      async (title, body, data, seconds) => ({
        success: false,
        error: 'Web notifications not implemented'
      })
    );
    
    // Render the test button component
    const { getByText } = render(
      <AuthProvider>
        <NotificationProvider>
          <NotificationTestButton />
        </NotificationProvider>
      </AuthProvider>
    );
    
    // Find and press the test button
    const testButton = getByText('Test Notification');
    fireEvent.press(testButton);
    
    // Should show error notification
    await waitFor(() => {
      expect(getByText(/Could not send test notification/i)).toBeTruthy();
      expect(getByText(/Web notifications not implemented/i)).toBeTruthy();
    });
  });
});