// File: /tests/reservations/create.test.js

import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ReservationProvider } from '../../contexts/ReservationContext';
import { AuthProvider } from '../../contexts/AuthContext';
import ReservationScreen from '../../screens/ReservationScreen';
import { handleReservationCreation } from '../../services/reservationHandler';
import restaurantService from '../../services/restaurantService';

// Mock services
jest.mock('../../services/reservationHandler');
jest.mock('../../services/restaurantService');
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn()
  }),
  useLocalSearchParams: () => ({
    id: 'restaurant-123'
  })
}));

describe('Reservation Creation Flow', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock restaurant data
    restaurantService.getRestaurantById.mockResolvedValue({
      success: true,
      data: {
        id: 'restaurant-123',
        name: 'Test Restaurant',
        address: '123 Test St',
        images: ['https://example.com/image.jpg'],
        rating: 4.5
      }
    });
    
    // Mock successful reservation creation
    handleReservationCreation.mockResolvedValue({
      success: true,
      id: 'reservation-123',
      serverNotifications: true
    });
  });

  test('completes full reservation flow successfully', async () => {
    // Arrange
    const { getByText, getByTestId, queryByText } = render(
      <AuthProvider>
        <ReservationProvider>
          <ReservationScreen />
        </ReservationProvider>
      </AuthProvider>
    );
    
    // Wait for restaurant data to load
    await waitFor(() => expect(getByText('Test Restaurant')).toBeTruthy());
    
    // Act - Select date
    fireEvent.press(getByText('Today'));
    
    // Select time
    await waitFor(() => expect(getByText('7:00 PM')).toBeTruthy());
    fireEvent.press(getByText('7:00 PM'));
    
    // Select party size
    fireEvent.press(getByTestId('increase-guests'));
    fireEvent.press(getByTestId('increase-guests'));
    
    // Enter special requests
    fireEvent.changeText(
      getByTestId('special-requests-input'),
      'Please prepare a birthday surprise'
    );
    
    // Submit reservation
    fireEvent.press(getByText('Confirm Reservation'));
    
    // Assert
    await waitFor(() => {
      expect(handleReservationCreation).toHaveBeenCalledWith(
        expect.objectContaining({
          restaurantId: 'restaurant-123',
          restaurantName: 'Test Restaurant',
          time: '7:00 PM',
          guests: 4,
          specialRequests: 'Please prepare a birthday surprise'
        }),
        true // server notifications
      );
    });
  });

  test('shows error when reservation creation fails', async () => {
    // Arrange
    handleReservationCreation.mockRejectedValue(new Error('Network error'));
    
    const { getByText, getByTestId } = render(
      <AuthProvider>
        <ReservationProvider>
          <ReservationScreen />
        </ReservationProvider>
      </AuthProvider>
    );
    
    // Wait for restaurant data to load
    await waitFor(() => expect(getByText('Test Restaurant')).toBeTruthy());
    
    // Act - Fill out form and submit
    fireEvent.press(getByText('Today'));
    await waitFor(() => fireEvent.press(getByText('7:00 PM')));
    fireEvent.press(getByText('Confirm Reservation'));
    
    // Assert
    await waitFor(() => {
      expect(getByText('Failed to create reservation. Please try again.')).toBeTruthy();
    });
  });
});