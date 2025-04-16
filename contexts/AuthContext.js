import { createContext, useContext, useState, useEffect } from "react";
import { getCurrentUser, signIn, signUp, signOut } from '../services/authService';
import { doc, getDoc } from "firebase/firestore";
import { db } from '../services/firebaseConfig';
import { onAuthStateChanged } from "firebase/auth";
import { auth } from '../services/firebaseConfig';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

 
  const fetchUserWithRole = async (authUser) => {
    if (!authUser) return null;
    
    try {
      const userDoc = await getDoc(doc(db, 'users', authUser.uid));
      return {
        uid: authUser.uid,
        email: authUser.email,
        ...userDoc.data()
      };
    } catch (error) {
      console.error("Error fetching user data:", error);
      return {
        uid: authUser.uid,
        email: authUser.email,
        role: 'user' // defultrole
      };
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setLoading(true);
      if (authUser) {
        const mergedUser = await fetchUserWithRole(authUser);
        setUser(mergedUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    try {
      const response = await signIn(email, password);
      if (response?.error) return response;
      
      // Refresh user data after login
      const authUser = auth.currentUser;
      const mergedUser = await fetchUserWithRole(authUser);
      setUser(mergedUser);
      
      return { success: true };
    } catch (error) {
      return { error: error.message };
    }
  };

  const register = async (email, password) => {
    try {
      const response = await signUp(email, password);
      if (response?.error) return response;
      
      // Get the newly created user and merge data
      const authUser = auth.currentUser;
      const mergedUser = await fetchUserWithRole(authUser);
      setUser(mergedUser);
      
      return { success: true };
    } catch (error) {
      return { error: error.message };
    }
  };

  const logout = async () => {
    try {
      await signOut();
      setUser(null);
    } catch (error) {
      return { error: error.message };
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      register,
      loading,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};