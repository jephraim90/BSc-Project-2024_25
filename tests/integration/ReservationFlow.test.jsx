

import { handleReservationCreation } from '../../services/reservationHandler';
import RestaurantAPI from '../../services/RestaurantAPI';
import notificationService from '../../services/notificationService';
import databaseService from '../../services/databaseService';

// Mock dependencies
jest.mock('../../services/RestaurantAPI');
jest.mock('../../services/notificationService');
jest.mock('../../services/databaseService');

// Mock Firebase auth
jest.mock('../../services/firebaseConfig', () => ({
  auth: {
    currentUser: {
      uid: 'test-user-id',
      getIdToken: jest.fn().mockResolvedValue('mock-token')
    }
  },
  db: {}
}));

describe('Reservation Creation Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default successful mocks
    RestaurantAPI.createDetailedReservation.mockResolvedValue({
      success: true,
      id: 'test-reservation-id'
    });
    
    notificationService.sendNotificationToUser.mockResolvedValue({
      success: true
    });
    
    notificationService.scheduleReservationReminders.mockResolvedValue({
      success: true,
      count: 3
    });
  });
  
  test('successfully creates a reservation with client-side notifications', async () => {
    // Arrange
    const reservationData = {
      userId: 'user123',
      restaurantId: 'restaurant456',
      restaurantName: 'Test Restaurant',
      date: '2025-05-15',
      time: '7:00 PM',
      guests: 2,
      specialRequests: 'Window seat preferred'
    };
    
    // Act
    const result = await handleReservationCreation(reservationData, false);
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.id).toBe('test-reservation-id');
    expect(RestaurantAPI.createDetailedReservation).toHaveBeenCalled();
    expect(notificationService.sendNotificationToUser).toHaveBeenCalled();
    expect(notificationService.scheduleReservationReminders).toHaveBeenCalled();
  });
  
  test('handles reservation creation failure gracefully', async () => {
    // Arrange
    RestaurantAPI.createDetailedReservation.mockResolvedValue({
      success: false,
      error: 'Restaurant is fully booked'
    });
    
    const reservationData = {
      userId: 'user123',
      restaurantId: 'restaurant456',
      restaurantName: 'Test Restaurant',
      date: '2025-05-15',
      time: '7:00 PM',
      guests: 2
    };
    
    // Act
    const result = await handleReservationCreation(reservationData, false);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Restaurant is fully booked');
    expect(notificationService.scheduleReservationReminders).not.toHaveBeenCalled();
  });
});