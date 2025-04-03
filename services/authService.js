import {auth, db} from '../services/firebaseConfig';
import {createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';


export const signUp = async (email, password) => {
    try{
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Create user document in Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
            email: userCredential.user.email,
            createdAt: new Date()
        });
        console.log('User signed up!');
        return userCredential.user
    } catch (error) {
        console.error('Error signing up:', error.message);
    }


}

export const signIn = async (email, password) => {
    try{
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log('User signed in!');
        return userCredential.user
    } catch (error) {
        return {
            error : error.message || 'Login failed. Please check your credentials again'
        }
    }
}


export const subscribeToAuthChanges = (callback)=>{
    return onAuthStateChanged(auth,(user)=>{
        callback(user)
    })
}
export const getCurrentUser =  () => {
    return auth.currentUser;
  };
  export const handleSignOut =async () => {
    try{
        await signOut(auth);
        console.log('User signed out!');
    }catch(error){
        throw error;
    }
  };

export const signOut = async () => {
    try{
        await auth.signOut();
        console.log('User signed out!');
    }catch(error){
        return {
            error : error.message || 'Logout failed. Please try again'
        }
    }
}
