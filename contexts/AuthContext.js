import { createContext, useContext, useState, useEffect } from "react";
import { getCurrentUser, signIn, signUp, signOut } from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      setLoading(true);
      try {
        const response = await getCurrentUser();
        setUser(response || null);
      } catch (error) {
        setUser(null);
      }
      setLoading(false);
    };
    
    checkUser();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await signIn(email, password);
      if (response?.error) return response;
      const user = await getCurrentUser();
      setUser(user);
      return { success: true };
    } catch (error) {
      return { error: error.message };
    }
  };

  const register = async (email, password) => {
    try {
      const response = await signUp(email, password);
      if (response?.error) return response;
      return await login(email, password);
    } catch (error) {
      return { error: error.message };
    }
  };
  const logout = async () => {
    try {
      await signOut();
      setUser(null);
      await checkUser();
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