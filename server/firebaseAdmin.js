// firebaseAdmin.js - Centralized Firebase Admin SDK initialization

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

/**
 * Initialize Firebase Admin SDK if not already initialized
 * @returns {admin} Firebase Admin SDK instance
 */
function initializeFirebaseAdmin() {
  // Check if already initialized to prevent multiple initializations
  if (admin.apps.length > 0) {
    console.log('Firebase Admin SDK already initialized');
    return admin;
  }

  try {
    let serviceAccount;
    
    // First try to use environment variables
    if (process.env.FIREBASE_PROJECT_ID && 
        process.env.FIREBASE_CLIENT_EMAIL && 
        process.env.FIREBASE_PRIVATE_KEY) {
      
      console.log('Using Firebase credentials from environment variables');
      serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      };
    } 
    // If environment variables aren't available, try service account file
    else if (fs.existsSync(path.join(__dirname, 'serviceAccountKey.json'))) {
      console.log('Using Firebase credentials from serviceAccountKey.json');
      serviceAccount = require('./serviceAccountKey.json');
    } 
    // If neither is available, throw an error
    else {
      throw new Error('Firebase configuration is missing. Please provide environment variables or a serviceAccountKey.json file.');
    }

    // Initialize with explicit app options
    const appOptions = {
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.projectId || serviceAccount.project_id,
      databaseURL: process.env.FIREBASE_DATABASE_URL || `https://${serviceAccount.projectId || serviceAccount.project_id}.firebaseio.com`,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID
    };
    
    // Initialize Firebase Admin SDK
    admin.initializeApp(appOptions);
    
    // Verify initialization success
    const projectId = admin.app().options.projectId;
    console.log('Firebase Admin SDK initialized successfully');
    console.log('==============================');
    console.log('SERVER FIREBASE PROJECT ID:', projectId);
    console.log('==============================');
    
    return admin;
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
    throw error;
  }
}

// Initialize and export
module.exports = initializeFirebaseAdmin();