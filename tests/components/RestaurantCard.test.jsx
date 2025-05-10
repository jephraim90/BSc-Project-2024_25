import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import RestaurantCard from '../../components/RestaurantCard';
import { useRouter } from 'expo-router';

// Mock the useRouter hook
jest.mock('expo-router', () => ({
  useRouter: jest.fn()
}));

describe('RestaurantCard Component', () => {
  // Define mockRestaurant at the top level so all tests can access it
  const mockRestaurant = { 
    id: 'restaurant-123',
    name: 'Test Restaurant',
    cuisine: 'Italian',
    rating: 4.5,
    reviewCount: 0,
    priceRange: '$$',
    address: '123 Test Street, City, Country',
    images: ['https://example.com/image.jpg']
  };

  const mockPushRoute = jest.fn();

  beforeEach(() => {
    mockPushRoute.mockClear();
    useRouter.mockReturnValue({ push: mockPushRoute });
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Default Variant', () => {
    test('renders default restaurant information correctly', () => {
      const openHours = {
        sunday: { isOpen: true, opens: '09:00', closes: '21:00' }
      };
      const openRestaurant = { 
        ...mockRestaurant, 
        businessHours: openHours 
      };
      
      jest.setSystemTime(new Date('2025-05-11T12:00:00.000Z')); // Sunday 12:00 PM UTC
      
      const { getByText } = render(
        <RestaurantCard restaurant={openRestaurant} />
      );

      expect(getByText('Test Restaurant')).toBeTruthy();
      expect(getByText('Italian')).toBeTruthy();
      expect(getByText('4.5')).toBeTruthy();
      expect(getByText('$$')).toBeTruthy();
      expect(getByText('City')).toBeTruthy();
      expect(getByText('OPEN')).toBeTruthy();
    });

    test('renders default card with fallback image', () => {
      const noImageRestaurant = { ...mockRestaurant, images: [] };
      // Simply test that the component renders without crashing
      const { getByText } = render(<RestaurantCard restaurant={noImageRestaurant} />);
      // We can verify the component rendered by checking for the restaurant name
      expect(getByText('Test Restaurant')).toBeTruthy();
    });

    test('navigates to restaurant detail when pressed (default)', () => {
      const { getByText } = render(<RestaurantCard restaurant={mockRestaurant} />);
      const card = getByText('Test Restaurant').parent.parent; // Find the touchable parent
      fireEvent.press(card);
      expect(mockPushRoute).toHaveBeenCalledWith(`/restaurant/${mockRestaurant.id}`);
    });

    test('displays "Closed" status in default card', () => {
      const closedRestaurant = { 
        ...mockRestaurant, 
        businessHours: { 
          sunday: { isOpen: false, opens: '00:00', closes: '00:00' } 
        } 
      };
      
      jest.setSystemTime(new Date('2025-05-11T12:00:00.000Z')); // Sunday 12:00 PM UTC
      
      // For this test, we'll need to verify that the OPEN badge is NOT present
      // since that's how the default card shows closed status
      const { queryByText } = render(<RestaurantCard restaurant={closedRestaurant} />);
      expect(queryByText('OPEN')).toBeNull();
    });
  });

  describe('Horizontal Variant', () => {
    test('renders horizontal card correctly', () => {
      const { getByText } = render(
        <RestaurantCard restaurant={mockRestaurant} variant="horizontal" />
      );

      expect(getByText('Test Restaurant')).toBeTruthy();
      expect(getByText('Italian')).toBeTruthy();
      // Need to match exactly what's rendered in the component:
      expect(getByText('4.5 (0)')).toBeTruthy();
      expect(getByText('$$')).toBeTruthy();
      expect(getByText('City')).toBeTruthy();
      expect(getByText('Closed')).toBeTruthy();
    });

    test('navigates on press (horizontal)', () => {
      const { getByText } = render(<RestaurantCard restaurant={mockRestaurant} variant="horizontal" />);
      const card = getByText('Test Restaurant').parent.parent; // Find the touchable parent
      fireEvent.press(card);
      expect(mockPushRoute).toHaveBeenCalledWith(`/restaurant/${mockRestaurant.id}`);
    });

    test('displays "Open Now" in horizontal card', () => {
      const openRestaurant = {
        ...mockRestaurant,
        businessHours: {
          monday: { isOpen: true, opens: '08:00', closes: '22:00' },
        },
      };
      jest.setSystemTime(new Date('2025-05-12T12:00:00.000Z')); // Monday 12:00 PM UTC
      const { getByText } = render(<RestaurantCard restaurant={openRestaurant} variant="horizontal" />);
      expect(getByText('Open Now')).toBeTruthy();
    });
  });

  describe('Featured Variant', () => {
    test('renders featured card correctly', () => {
      const { getByText } = render(
        <RestaurantCard restaurant={mockRestaurant} variant="featured" />
      );

      expect(getByText('Test Restaurant')).toBeTruthy();
      expect(getByText('Italian')).toBeTruthy();
      expect(getByText('4.5')).toBeTruthy();
      expect(getByText('$$')).toBeTruthy();
      expect(getByText('City')).toBeTruthy();
      expect(getByText('Closed')).toBeTruthy();
    });

    test('navigates on press (featured)', () => {
      const { getByText } = render(<RestaurantCard restaurant={mockRestaurant} variant="featured" />);
      const card = getByText('Test Restaurant').parent.parent; // Find the touchable parent
      fireEvent.press(card);
      expect(mockPushRoute).toHaveBeenCalledWith(`/restaurant/${mockRestaurant.id}`);
    });

    test('displays "Open" status in featured card', () => {
      const openRestaurant = {
        ...mockRestaurant,
        businessHours: {
          monday: { isOpen: true, opens: '08:00', closes: '22:00' },
        },
      };
      jest.setSystemTime(new Date('2025-05-12T12:00:00.000Z')); // Monday 12:00 PM UTC
      const { getByText } = render(<RestaurantCard restaurant={openRestaurant} variant="featured" />);
      expect(getByText('Open')).toBeTruthy();
    });
  });

  describe('Small Variant', () => {
    test('renders small card correctly', () => {
      const { getByText } = render(
        <RestaurantCard restaurant={mockRestaurant} variant="small" />
      );

      expect(getByText('Test Restaurant')).toBeTruthy();
      expect(getByText('Italian • $$')).toBeTruthy();
      expect(getByText('4.5')).toBeTruthy();
    });

    test('navigates on press (small)', () => {
      const { getByText } = render(<RestaurantCard restaurant={mockRestaurant} variant="small" />);
      const card = getByText('Test Restaurant').parent.parent; // Find the touchable parent
      fireEvent.press(card);
      expect(mockPushRoute).toHaveBeenCalledWith(`/restaurant/${mockRestaurant.id}`);
    });
  });

  test('handles missing address gracefully', () => {
    const noAddressRestaurant = { ...mockRestaurant, address: null };
    const { getByText } = render(<RestaurantCard restaurant={noAddressRestaurant} />);
    expect(getByText('Location not specified')).toBeTruthy();
  });

  test('handles missing cuisine gracefully', () => {
    const noCuisineRestaurant = { ...mockRestaurant, cuisine: null };
    const { getByText } = render(<RestaurantCard restaurant={noCuisineRestaurant} variant="small" />);
    expect(getByText('Various • $$')).toBeTruthy();
  });
});