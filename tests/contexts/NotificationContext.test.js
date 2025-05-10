import React from 'react';
import { render } from '@testing-library/react-native';
import { NotificationProvider } from '../../contexts/NotificationContext';

// Mock dependencies
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'ios',
  select: jest.fn(() => null)
}));

// Mock Firebase
jest.mock('../../services/firebaseConfig', () => ({
  auth: { currentUser: { uid: 'test-user-123' } },
  db: {}
}));

// Mock Firestore functions
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => 'collection-ref'),
  query: jest.fn(() => 'query-ref'),
  where: jest.fn(() => 'where-clause'),
  orderBy: jest.fn(() => 'orderBy-clause'),
  limit: jest.fn(() => 'limit-clause'),
  onSnapshot: jest.fn(() => jest.fn()), // Return cleanup function
  doc: jest.fn(() => 'doc-ref'),
  updateDoc: jest.fn(() => Promise.resolve())
}));

// Mock notification service
jest.mock('@/services/notificationService', () => ({
  __esModule: true,
  default: {
    setupNotificationHandlers: jest.fn(() => jest.fn()), // Returns cleanup function
    scheduleLocalNotification: jest.fn(() => Promise.resolve({ success: true })),
    getAllScheduledNotifications: jest.fn(() => Promise.resolve({ 
      success: true, 
      notifications: [{ identifier: 'test-id' }] 
    }))
  }
}));

// Mock NotificationToast component
jest.mock('@/components/NotificationToast', () => 'NotificationToast');

// Mock AuthContext
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    user: { uid: 'test-user-123' }
  }))
}));

// Simple test component
const TestComponent = () => {
  return <div>Test Component</div>;
};

describe('NotificationContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders without crashing', () => {
    const { UNSAFE_root } = render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );
    
    // If rendering succeeds without errors, the test passes
    expect(UNSAFE_root).toBeTruthy();
  });

  test('calls notification service on non-web platform', () => {
    const { Platform } = require('react-native');
    Platform.OS = 'ios';
    
    const notificationService = require('@/services/notificationService').default;
    
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );
    
    // Verify notification service was called
    expect(notificationService.setupNotificationHandlers).toHaveBeenCalled();
  });

  test('sets up Firestore listeners', () => {
    const firestoreMock = require('firebase/firestore');
    
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );
    
    // Verify Firestore methods were called
    expect(firestoreMock.collection).toHaveBeenCalled();
    expect(firestoreMock.onSnapshot).toHaveBeenCalled();
  });
});