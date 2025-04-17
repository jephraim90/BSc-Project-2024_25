import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  Platform, 
  Alert, 
  TouchableOpacity, 
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  ScrollView,
  Image
} from "react-native";
import {
  signUp,
  signIn,
  subscribeToAuthChanges,
  signOut,
  getCurrentUser,
} from "@/services/authService";

import { useRouter } from "expo-router";
import { Ionicons } from '@expo/vector-icons';
import {useAuth} from '@/contexts/AuthContext';

const AuthenticationScreen = () => {
  const router = useRouter();
  const { login, register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [error, setError] = useState(false);
  const [user, setUser] = useState(null);
  
  const showPlatformAlert = (
    title,
    message,
    confirmAction,
    cancelAction = () => {}
  ) => {
    if (Platform.OS === "web") {
      // For web platform
      if (confirmAction) {
        const isConfirmed = window.confirm(`${title}\n\n${message}`);
        if (isConfirmed) {
          confirmAction();
        } else {
          cancelAction();
        }
      } else {
        
        window.alert(`${title}\n\n${message}`);
      }
    } else {
      // For native platforms (iOS/Android)
      if (confirmAction) {
        Alert.alert(
          title,
          message,
          [
            {
              text: "Cancel",
              style: "cancel",
              onPress: cancelAction,
            },
            {
              text: "Delete",
              style: "destructive",
              onPress: confirmAction,
            },
          ],
          { cancelable: false }
        );
      } else {
        Alert.alert(title, message);
      }
    }
  };

  const handleAuth = async () => {
    setError(false);
    
    if (!email.trim() || !password.trim()) {
      setError("Email and password are required");
      return;
    }
    
    if (isSigningUp && !confirmPassword.trim()) {
      setError("Please confirm your password");
      return;
    }
    
    if (isSigningUp && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    let response;
    
    try {
      if (isSigningUp) {
        response = await register(email, password);
      } else {
        response = await login(email, password);
      }
      
      if (response?.error) {
        showPlatformAlert("Error", response.error);
        setError(response.error);
        return;
      }
      
      // redirect to home
      router.replace('/');
    } catch (err) {
      setError(err.message || "Authentication failed");
    }
  };

  useEffect(() => {
    // Initialize auth listener
    const unsubscribe = subscribeToAuthChanges((user) => {
      setUser(user);
    });
    
    // Check for existing logged-in user
    const currentUser = getCurrentUser();
    if (currentUser) setUser(currentUser);

    return unsubscribe;
  }, []);

  useEffect(() => {
    // Reset error when switching between sign in and sign up
    setError(false);
  }, [isSigningUp]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoid}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.logoContainer}>
            <Text style={styles.appTitle}>DineConnect</Text>
            <Text style={styles.appTagline}>
              Reserve, Discover, Enjoy
            </Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.authTitle}>
              {isSigningUp ? "Create Account" : "Welcome Back"}
            </Text>
            
            <Text style={styles.authSubtitle}>
              {isSigningUp 
                ? "Sign up to start booking tables at your favorite restaurants" 
                : "Log in to access your reservations and favorites"}
            </Text>

            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={20} color="#d9534f" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#999"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
              />
            </View>

            {isSigningUp && (
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password"
                  placeholderTextColor="#999"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  textContentType="none"
                />
              </View>
            )}

            <TouchableOpacity style={styles.button} onPress={handleAuth}>
              <Text style={styles.buttonText}>
                {isSigningUp ? "Sign Up" : "Log In"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.switchAuthContainer}
              onPress={() => setIsSigningUp(!isSigningUp)}
            >
              <Text style={styles.switchText}>
                {isSigningUp
                  ? "Already have an account? "
                  : "Don't have an account? "}
                <Text style={styles.switchTextBold}>
                  {isSigningUp ? "Log In" : "Sign Up"}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e8f0ed",
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  appTagline: {
    fontSize: 16,
    color: "#666",
  },
  formContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  authTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  authSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 24,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8d7da",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: "#d9534f",
    fontSize: 14,
    marginLeft: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    height: 50,
    backgroundColor: "#f9f9f9",
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: "#333",
  },
  button: {
    backgroundColor: "#1a1a1a",
    borderRadius: 8,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 16,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  switchAuthContainer: {
    alignItems: "center",
    padding: 8,
  },
  switchText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  switchTextBold: {
    fontWeight: "700",
    color: "#1a1a1a",
  },
});

export default AuthenticationScreen;