// Mock Expo modules
jest.mock('expo-notifications', () => ({
    getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
    requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
    getExpoPushTokenAsync: jest.fn(() => Promise.resolve({ data: 'ExpoPushToken[mock-token]' })),
    setNotificationHandler: jest.fn(),
    scheduleNotificationAsync: jest.fn(() => Promise.resolve('notification-id')),
    cancelScheduledNotificationAsync: jest.fn(),
    addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
    addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
    removeNotificationSubscription: jest.fn(),
    AndroidNotificationPriority: {
      MAX: 'max',
      HIGH: 'high',
      DEFAULT: 'default',
      LOW: 'low',
      MIN: 'min'
    }
  }));
  // Mock vector icons
jest.mock('@expo/vector-icons', () => {
    const { View } = require('react-native');
    
    return {
      Ionicons: View,
      MaterialIcons: View,
      FontAwesome: View,
    
    };
  });
  
  // Mock for vector icon fonts
  jest.mock('react-native-vector-icons/Fonts/AntDesign.ttf', () => '', { virtual: true });
  jest.mock('react-native-vector-icons/Fonts/Feather.ttf', () => '', { virtual: true });
  jest.mock('react-native-vector-icons/Fonts/FontAwesome.ttf', () => '', { virtual: true });
  jest.mock('react-native-vector-icons/Fonts/Ionicons.ttf', () => '', { virtual: true });
  jest.mock('react-native-vector-icons/Fonts/MaterialIcons.ttf', () => '', { virtual: true });
 
  jest.mock('expo-router', () => ({
    useRouter: () => ({
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn()
    }),
    useLocalSearchParams: jest.fn().mockReturnValue({}),
    Link: 'Link'
  }));
  
  // Mock Firebase
  jest.mock('./services/firebaseConfig', () => ({
    auth: {
      currentUser: {
        uid: 'test-user-id',
        email: 'test@example.com',
        displayName: 'Test User',
        getIdToken: jest.fn(() => Promise.resolve('mock-token'))
      },
      onAuthStateChanged: jest.fn(),
      signInWithEmailAndPassword: jest.fn(),
      createUserWithEmailAndPassword: jest.fn(),
      signOut: jest.fn()
    },
    db: {
      collection: jest.fn().mockReturnThis(),
      doc: jest.fn().mockReturnThis(),
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      get: jest.fn(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis()
    }
  }));
  
  // Mock Date.now() to return a fixed timestamp
  const mockDate = new Date('2025-05-10T12:00:00Z');
  global.Date.now = jest.fn(() => mockDate.getTime());
  
  // Mock console.error to keep test output clean
  const originalConsoleError = console.error;
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning:') || 
       args[0].includes('React does not recognize the') || 
       args[0].includes('Invalid prop'))
    ) {
      return;
    }
    originalConsoleError(...args);
  };