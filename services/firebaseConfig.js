import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';  
import { getFirestore } from 'firebase/firestore'; 
import { getStorage } from 'firebase/storage'; 
import { getFunctions } from 'firebase/functions';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Initialize Firebase Cloud Messaging and export it
let messaging;
// Only initialize messaging in browser environments where it's supported
if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
    try {
        messaging = getMessaging(app);
    } catch (error) {
        // console.error('Firebase messaging initialization error:', error);
    }
}
export const fcm = messaging;

// Function to request notification permission and get FCM token
export const requestNotificationPermission = async () => {
    if (!messaging) return { success: false, error: 'Messaging not supported in this environment' };
    
    try {
        // Request permission
        const permission = await Notification.requestPermission();
        
        if (permission !== 'granted') {
            return { 
                success: false, 
                error: 'Notification permission denied' 
            };
        }
        
        // Get token
        const token = await getToken(messaging, {
            vapidKey: process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY, 
        });
        
        if (token) {
            return { 
                success: true, 
                token 
            };
        } else {
            return { 
                success: false, 
                error: 'Failed to generate FCM token' 
            };
        }
    } catch (error) {
        console.error('Error requesting notification permission:', error);
        return { 
            success: false, 
            error: error.message 
        };
    }
};

// Function to handle foreground messages
export const setupMessageListener = (callback) => {
    if (!messaging) return null;
    
    return onMessage(messaging, (payload) => {
        console.log('Message received in foreground:', payload);
        callback(payload);
    });
};

export default app;