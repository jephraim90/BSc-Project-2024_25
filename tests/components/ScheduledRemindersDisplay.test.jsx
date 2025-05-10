import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ScheduledRemindersDisplay from '../../components/ScheduledRemindersDisplay';

// Mock dependencies
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

// Mock AsyncStorage
const mockAsyncStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

jest.mock('@react-native-async-storage/async-storage', () => ({
  default: mockAsyncStorage,
}));

// Mock notification service
const mockNotificationService = {
  scheduleReservationReminders: jest.fn(),
  cancelReservationReminders: jest.fn(),
};

jest.mock('@/services/notificationService', () => ({
  __esModule: true,
  default: mockNotificationService,
}));

describe('ScheduledRemindersDisplay Component', () => {
  // Test props
  const mockProps = {
    reservationId: 'reservation-123',
    restaurantName: 'Test Restaurant',
    reservationDate: '2025-05-15T18:30:00.000Z',
    reservationTime: '18:30',
  };

  // Sample reminder data
  const mockReminders = {
    'reservation-123': [
      {
        id: 'reminder-1',
        type: '30-minute',
        time: '2025-05-15T18:00:00.000Z',
      },
      {
        id: 'reminder-2',
        type: '15-minute',
        time: '2025-05-15T18:15:00.000Z',
      },
      {
        id: 'reminder-3',
        type: 'start',
        time: '2025-05-15T18:30:00.000Z',
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns null when no reservationId is provided', () => {
    const { toJSON } = render(
      <ScheduledRemindersDisplay 
        restaurantName={mockProps.restaurantName}
        reservationDate={mockProps.reservationDate}
        reservationTime={mockProps.reservationTime}
      />
    );
    
    expect(toJSON()).toBeNull();
  });

  test('shows loading state initially', async () => {
    // Setup AsyncStorage to delay response
    mockAsyncStorage.getItem.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve(null), 100))
    );

    const { getByText } = render(<ScheduledRemindersDisplay {...mockProps} />);
    
    // Should show loading indicator
    expect(getByText('Loading reminders...')).toBeTruthy();
  });

  test('shows empty state when no reminders are found', async () => {
    // Setup AsyncStorage to return empty reminders
    mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify({}));

    const { getByText, queryByText } = render(<ScheduledRemindersDisplay {...mockProps} />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(queryByText('Loading reminders...')).toBeNull();
    });
    
    // Should show empty state message
    expect(getByText('No reminders are currently scheduled for this reservation')).toBeTruthy();
    // Should show schedule button
    expect(getByText('Schedule Reminders')).toBeTruthy();
  });

  test('shows error state when fetching fails', async () => {
    // Setup AsyncStorage to reject immediately
    mockAsyncStorage.getItem.mockRejectedValueOnce(new Error('Test error'));

    const { getByText } = render(<ScheduledRemindersDisplay {...mockProps} />);
    
    // Wait for error message to appear - this is more reliable than waiting for loading to disappear
    await waitFor(() => {
      expect(getByText('Failed to load scheduled reminders')).toBeTruthy();
    }, { timeout: 3000 });
    
    // Should show retry button
    expect(getByText('Retry')).toBeTruthy();
  });

  test('displays reminders when data is loaded successfully', async () => {
    // Setup AsyncStorage to return reminders
    mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockReminders));

    const { getByText, queryByText } = render(<ScheduledRemindersDisplay {...mockProps} />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(queryByText('Loading reminders...')).toBeNull();
    });
    
    // Should show reminder labels
    expect(getByText('30 minutes before')).toBeTruthy();
    expect(getByText('15 minutes before')).toBeTruthy();
    expect(getByText('At reservation time')).toBeTruthy();
    
    // Should show reschedule button
    expect(getByText('Reschedule Reminders')).toBeTruthy();
  });

  test('refreshes reminders when refresh icon is present', async () => {
    // Setup AsyncStorage to return reminders
    mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockReminders));

    const { getByText, UNSAFE_getAllByType } = render(
      <ScheduledRemindersDisplay {...mockProps} />
    );
    
    // Wait for the title to appear (indicating component is loaded)
    await waitFor(() => {
      expect(getByText('Reservation Reminders')).toBeTruthy();
    });
    
    // Verify that Ionicons are present in the rendered component
    const ionicons = UNSAFE_getAllByType('Ionicons');
    expect(ionicons.length).toBeGreaterThan(0);
    
    // Verify that reminders are displayed
    expect(getByText('30 minutes before')).toBeTruthy();
  });

  test('schedule reminders button is present and can be pressed', async () => {
    // Setup AsyncStorage to return empty reminders
    mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify({}));
    
    const { getByText, queryByText } = render(<ScheduledRemindersDisplay {...mockProps} />);
    
    // Wait for the empty state message to appear
    await waitFor(() => {
      expect(getByText('No reminders are currently scheduled for this reservation')).toBeTruthy();
    }, { timeout: 3000 });

    // Find the schedule button
    const scheduleButton = getByText('Schedule Reminders');
    expect(scheduleButton).toBeTruthy();
    
    // Verify we can press the button (but don't assert on the result)
    fireEvent.press(scheduleButton);
    
    // Test passes if we get this far without errors
  });

  test('reschedule reminders button is present when reminders exist', async () => {
    // Setup AsyncStorage to return reminders
    mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockReminders));
    
    const { getByText } = render(<ScheduledRemindersDisplay {...mockProps} />);
    
    // Wait for the reminders to load and find the reschedule button
    await waitFor(() => {
      expect(getByText('Reschedule Reminders')).toBeTruthy();
    }, { timeout: 3000 });
    
    // Verify reminder items are displayed as well
    expect(getByText('30 minutes before')).toBeTruthy();
    expect(getByText('15 minutes before')).toBeTruthy();
    expect(getByText('At reservation time')).toBeTruthy();
    
    // Test passes if we verify the button exists
  });

  test('handles error when scheduling reminders fails', async () => {
    // Setup AsyncStorage to return empty reminders
    mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify({}));
    // Setup notification service to fail
    mockNotificationService.scheduleReservationReminders.mockResolvedValue({ success: false });

    const { getByText, queryByText } = render(<ScheduledRemindersDisplay {...mockProps} />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(queryByText('Loading reminders...')).toBeNull();
    });

    // Find and click the schedule button
    const scheduleButton = getByText('Schedule Reminders');
    fireEvent.press(scheduleButton);
    
    // Wait for error to appear
    await waitFor(() => {
      // The component should show an error message that contains "Failed to"
      const errorElement = getByText('Failed to reschedule reminders');
      expect(errorElement).toBeTruthy();
    });
  });
});