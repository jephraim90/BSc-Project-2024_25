const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

// Your Firebase configuration
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
};

// Function to log environment info and test connection
const checkEnvironment = async () => {
  console.log('Environment Check for Firebase/Firestore');
  console.log('======================================');
  
  // Log Node version
  console.log(`Node version: ${process.version}`);
  
  // Check Firebase packages
  console.log('\nPackage versions:');
  try {
    const firebasePkg = require('firebase/package.json');
    console.log(`firebase: ${firebasePkg.version}`);
  } catch (err) {
    console.log('firebase: Unable to determine version');
  }
  
  // Environment variables (masked for security)
  console.log('\nEnvironment variables check:');
  
  const envVars = [
    'EXPO_PUBLIC_FIREBASE_API_KEY',
    'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
    'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'EXPO_PUBLIC_FIREBASE_APP_ID'
  ];
  
  envVars.forEach(varName => {
    const value = process.env[varName];
    if (!value) {
      console.log(`❌ ${varName}: Missing or empty`);
    } else {
      // Mask the value for security - show first 3 chars only
      const maskedValue = value.substring(0, 3) + '...' + 
        (value.length > 6 ? value.substring(value.length - 3) : '');
      console.log(`✅ ${varName}: ${maskedValue} (${value.length} chars)`);
    }
  });
  
  // Try initializing Firebase
  console.log('\nTesting Firebase initialization:');
  try {
    const app = initializeApp(firebaseConfig);
    console.log('✅ Firebase initialized successfully');
    
    // Try connecting to Firestore
    console.log('\nTesting Firestore connection:');
    const db = getFirestore(app);
    
    try {
      // Try to read data (this will test connection without writing)
      console.log('Attempting to read from Firestore...');
      const querySnapshot = await getDocs(collection(db, 'test-collection-that-probably-doesnt-exist'));
      console.log(`✅ Firestore read successful. Found ${querySnapshot.size} documents.`);
    } catch (error) {
      // If the collection doesn't exist, we should get a specific error
      // If it's a 'not-found' error, that's actually good - it means we connected
      if (error.code === 'not-found') {
        console.log('✅ Firestore connection successful (collection not found, but that\'s expected)');
      } else {
        console.log('❌ Firestore read error:', error.message);
        console.log('Error code:', error.code);
        if (error.details) console.log('Error details:', error.details);
      }
    }
    
  } catch (error) {
    console.log('❌ Firebase initialization failed:', error.message);
  }
  
  console.log('\nEnvironment check complete.');
};

// Run the environment check
checkEnvironment();