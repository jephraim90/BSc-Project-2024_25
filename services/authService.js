import { auth, db } from '../services/firebaseConfig';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, runTransaction } from 'firebase/firestore';

export const signUp = async (email, password, role = 'user') => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const userId = userCredential.user.uid;
    const userEmail = email.toLowerCase();

    await runTransaction(db, async (transaction) => {
      // Create user document
      transaction.set(doc(db, 'users', userId), {
        email: userCredential.user.email,
        role: role,
        createdAt: new Date(),
      });

      // Create email mapping
      transaction.set(doc(db, 'user_emails', userEmail), {
        userId: userId,
        createdAt: new Date()
      });
    });

    console.log('User signed up with role:', role);
    return userCredential.user;
  } catch (error) {
    console.log('Error signing up:', error.message);
    // Rollback auth creation if transaction fails
    if (auth.currentUser) await auth.currentUser.delete();
    throw error;
  }
}

export const signIn = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log('User signed in!');
    return userCredential.user;
  } catch (error) {
    return {
      error: error.message || 'Login failed. Please check your credentials again'
    }
  }
}

export const subscribeToAuthChanges = (callback) => {
  return onAuthStateChanged(auth, (user) => {
    callback(user);
  });
}

export const getCurrentUser = () => {
  return auth.currentUser;
}

export const handleSignOut = async () => {
  try {
    await signOut(auth);
    console.log('User signed out!');
  } catch (error) {
    throw error;
  }
};
export {handleSignOut as signOut}