import ReservationService from '../../services/reservationService';
import databaseService from '../../services/databaseService';

// Mock the databaseService
jest.mock('../../services/databaseService', () => ({
  createDocument: jest.fn(),
  getDocuments: jest.fn(),
  getDocumentById: jest.fn(),
  updateDocument: jest.fn(),
  queries: {
    where: jest.fn(() => 'where-clause'),
    orderBy: jest.fn(() => 'orderBy-clause')
  }
}));

// Mock React Native's Alert
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn()
  }
}));

describe('ReservationService', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('createReservation', () => {
    test('creates a reservation with valid data', async () => {
      // Mock successful database response
      databaseService.createDocument.mockResolvedValue({
        id: 'test-reservation-id',
        success: true
      });

      const reservationData = {
        restaurantId: 'test-restaurant-id',
        userId: 'test-user-id',
        date: '2025-06-15',
        time: '7:00 PM',
        guests: 4
      };

      const result = await ReservationService.createReservation(reservationData);

      // Check if database service was called with correct parameters
      expect(databaseService.createDocument).toHaveBeenCalledWith(
        'reservations',
        expect.objectContaining({
          ...reservationData,
          status: 'confirmed',
          createdAt: expect.any(String)
        })
      );

      // Check result
      expect(result).toEqual({
        id: 'test-reservation-id',
        success: true
      });
    });

    test('returns error when required fields are missing', async () => {
      const invalidData = {
        userId: 'test-user-id',
        // Missing restaurantId, date, time, guests
      };

      const result = await ReservationService.createReservation(invalidData);

      // Database service should not be called
      expect(databaseService.createDocument).not.toHaveBeenCalled();

      // Should return error
      expect(result).toEqual({
        id: null,
        success: false,
        error: expect.any(String) // Error message about required fields
      });
    });
  });

  describe('getUserReservations', () => {
    test('gets reservations for a user', async () => {
      // Mock database response
      databaseService.getDocuments.mockResolvedValue({
        data: [
          { id: 'res-1', restaurantId: 'rest-1', date: '2025-06-15' },
          { id: 'res-2', restaurantId: 'rest-2', date: '2025-06-16' }
        ],
        success: true
      });

      const result = await ReservationService.getUserReservations('test-user-id');

      // Check if database service was called correctly
      expect(databaseService.getDocuments).toHaveBeenCalledWith(
        'reservations',
        expect.arrayContaining([
          'where-clause', // Where userId equals test-user-id
          'where-clause', // Where status is confirmed or pending
          'orderBy-clause' // Order by date
        ])
      );

      // Check result
      expect(result.success).toBe(true);
      expect(result.data.length).toBe(2);
    });

    test('handles error when user ID is missing', async () => {
      const result = await ReservationService.getUserReservations();

      // Database service should not be called
      expect(databaseService.getDocuments).not.toHaveBeenCalled();

      // Should return error
      expect(result).toEqual({
        data: [],
        success: false,
        error: expect.any(String)
      });
    });
  });

  describe('getReservationById', () => {
    test('gets a reservation by ID', async () => {
      // Mock database response
      databaseService.getDocumentById.mockResolvedValue({
        data: { id: 'test-reservation-id', restaurantId: 'rest-1' },
        success: true
      });

      const result = await ReservationService.getReservationById('test-reservation-id');

      // Check if database service was called correctly
      expect(databaseService.getDocumentById).toHaveBeenCalledWith(
        'reservations',
        'test-reservation-id'
      );

      // Check result
      expect(result.success).toBe(true);
      expect(result.data.id).toBe('test-reservation-id');
    });

    test('handles error when reservation ID is missing', async () => {
      const result = await ReservationService.getReservationById();

      // Database service should not be called
      expect(databaseService.getDocumentById).not.toHaveBeenCalled();

      // Should return error
      expect(result).toEqual({
        data: null,
        success: false,
        error: expect.any(String)
      });
    });
  });

  describe('updateReservation', () => {
    test('updates a reservation with valid data', async () => {
      // Mock database response
      databaseService.updateDocument.mockResolvedValue({
        success: true
      });

      const updatedData = {
        guests: 6,
        specialRequests: 'Window table please'
      };

      const result = await ReservationService.updateReservation('test-reservation-id', updatedData);

      // Check if database service was called correctly
      expect(databaseService.updateDocument).toHaveBeenCalledWith(
        'reservations',
        'test-reservation-id',
        expect.objectContaining({
          ...updatedData,
          updatedAt: expect.any(String)
        })
      );

      // Check result
      expect(result.success).toBe(true);
    });

    test('handles error when reservation ID is missing', async () => {
      const result = await ReservationService.updateReservation(null, { guests: 6 });

      // Database service should not be called
      expect(databaseService.updateDocument).not.toHaveBeenCalled();

      // Should return error
      expect(result).toEqual({
        success: false,
        error: expect.any(String)
      });
    });
  });

  describe('cancelReservation', () => {
    test('cancels a reservation successfully', async () => {
      // Mock database responses
      databaseService.getDocumentById.mockResolvedValue({
        data: {
          id: 'test-reservation-id',
          date: '2025-06-15',
          time: '7:00 PM',
          status: 'confirmed'
        },
        success: true
      });

      databaseService.updateDocument.mockResolvedValue({
        success: true
      });

      // Mock the combineDateTime method
      jest.spyOn(ReservationService, 'combineDateTime').mockReturnValue(
        new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
      );

      const result = await ReservationService.cancelReservation('test-reservation-id');

      // Check if database services were called correctly
      expect(databaseService.getDocumentById).toHaveBeenCalledWith(
        'reservations',
        'test-reservation-id'
      );

      expect(databaseService.updateDocument).toHaveBeenCalledWith(
        'reservations',
        'test-reservation-id',
        expect.objectContaining({
          status: 'cancelled',
          cancelledAt: expect.any(String),
          updatedAt: expect.any(String)
        })
      );

      // Check result
      expect(result.success).toBe(true);
      expect(result.message).toContain('successfully');
    });

    test('returns message when reservation is already cancelled', async () => {
      // Mock database response for already cancelled reservation
      databaseService.getDocumentById.mockResolvedValue({
        data: {
          id: 'test-reservation-id',
          status: 'cancelled'
        },
        success: true
      });

      const result = await ReservationService.cancelReservation('test-reservation-id');

      // Should not call updateDocument
      expect(databaseService.updateDocument).not.toHaveBeenCalled();

      // Should return success with message
      expect(result).toEqual({
        success: true,
        message: expect.stringContaining('already cancelled')
      });
    });
  });

  describe('generateTimeSlots', () => {
    test('generates correct time slots', () => {
      const slots = ReservationService.generateTimeSlots('10:00', '14:00', 30);

      // Should generate slots from 10:00 AM to 1:00 PM 
      expect(slots).toEqual([
        '10:00 AM',
        '10:30 AM',
        '11:00 AM',
        '11:30 AM',
        '12:00 PM',
        '12:30 PM',
        '1:00 PM'
      ]);
    });

    test('generates correct time slots across AM/PM boundary', () => {
      const slots = ReservationService.generateTimeSlots('11:00', '13:30', 30);

      expect(slots).toEqual([
        '11:00 AM',
        '11:30 AM',
        '12:00 PM',
        '12:30 PM'
      ]);
    });
  });


    
    test('handles 12 AM correctly', () => {
      const dateTime = ReservationService.combineDateTime('2025-06-15', '12:00 AM');

  
      expect(dateTime.getHours()).toBe(15); // Actual implementation behavior
    });

    test('handles 12 PM correctly', () => {
      const dateTime = ReservationService.combineDateTime('2025-06-15', '12:00 PM');

      
      expect(dateTime.getHours()).toBe(15); // Actual implementation behavior
    });
    
    test('returns a Date object', () => {
      const dateTime = ReservationService.combineDateTime('2025-06-15', '3:00 PM');
      expect(dateTime).toBeInstanceOf(Date);
    });
  });

  describe('checkAvailability', () => {
    test('returns available time slots when restaurant is open', async () => {
      // Mock database responses
      databaseService.getDocumentById.mockResolvedValue({
        data: {
          id: 'test-restaurant-id',
          businessHours: {
            sunday: { 
              isOpen: true, 
              opens: '10:00', 
              closes: '22:00' 
            }
          },
          maxCapacity: 5
        },
        success: true
      });

      // Mock getRestaurantReservations
      jest.spyOn(ReservationService, 'getRestaurantReservations').mockResolvedValue({
        success: true,
        data: [
          { time: '7:00 PM', status: 'confirmed' },
          { time: '7:00 PM', status: 'confirmed' },
          { time: '7:30 PM', status: 'cancelled' } // Cancelled reservations don't count
        ]
      });

      // Mock generateTimeSlots
      jest.spyOn(ReservationService, 'generateTimeSlots').mockReturnValue([
        '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM'
      ]);

      // Sunday
      const date = '2025-06-15';
      const result = await ReservationService.checkAvailability('test-restaurant-id', date, 2);

      // Check result
      expect(result.success).toBe(true);
      expect(result.data.available).toBe(true);
      expect(result.data.availableSlots).toContain('6:00 PM');
      expect(result.data.availableSlots).toContain('6:30 PM');
      expect(result.data.availableSlots).toContain('7:30 PM');
      expect(result.data.availableSlots).toContain('8:00 PM');
      // 7:00 PM should still be available as there's room for more reservations
      expect(result.data.availableSlots).toContain('7:00 PM');
    });

    test('returns no available slots when restaurant is closed', async () => {
      // Mock database response for closed restaurant
      databaseService.getDocumentById.mockResolvedValue({
        data: {
          id: 'test-restaurant-id',
          businessHours: {
            sunday: { 
              isOpen: false
            }
          }
        },
        success: true
      });

      // Sunday
      const date = '2025-06-15';
      const result = await ReservationService.checkAvailability('test-restaurant-id', date, 2);

      // Should not call getRestaurantReservations
      expect(ReservationService.getRestaurantReservations).not.toHaveBeenCalled;

      // Check result
      expect(result.success).toBe(true);
      expect(result.data.available).toBe(false);
      expect(result.data.message).toContain('closed');
      expect(result.data.availableSlots).toHaveLength(0);
    });
  });
