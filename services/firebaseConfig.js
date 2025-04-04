
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth'; // 
import { getFirestore } from 'firebase/firestore'; 
import { getStorage } from 'firebase/storage'; 
import { getFunctions } from 'firebase/functions';


const firebaseConfig ={
    apiKey : "AIzaSyA8ZM_HLMMsjyiuE43bm7OHLj4OixgHDUk",
    authDomain : "dine-connect-13e1e.firebaseapp.com",
    projectId : "dine-connect-13e1e",
    storageBucket : "dine-connect-13e1e.firebasestorage.app",
    messagingSenderId : "716906757983",
    appId : "1:716906757983:web:1a7eee7b84d40a2d2140ea",
    measurementId : "G-6EDPBTWZL4"

}


const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);
export default app;
