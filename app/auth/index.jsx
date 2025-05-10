import React, { useState } from "react";
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
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";

const AuthenticationScreen = () => {
  const router = useRouter();
  const { login, register } = useAuth();
  
  // State management
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Handle platform-specific alerts
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
        // alert without confirmation
        window.alert(`${title}\n\n${message}`);
      }
    } else {
      // For mobile platforms
      Alert.alert(title, message, [
        { text: "OK", onPress: confirmAction },
        { text: "Cancel", style: "cancel", onPress: cancelAction },
      ]);
    }
  };

  // Handle login/signup
  const handleAuthentication = async () => {
    setError(null);
    setLoading(true);

    try {
      if (isSigningUp) {
        // Sign up logic
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match.");
        }
        await register(email, password);
      } else {
        // Login logic
        await login(email, password);
      }
      
      // Success - navigate to home
      router.replace("/");
    } catch (err) {
      console.log(isSigningUp ? "Signup failed:" : "Login failed:", err);
      setError(err.message || `${isSigningUp ? "Signup" : "Login"} failed.`);
    } finally {
      setLoading(false);
    }
  };

  // Toggle between signup and login
  const toggleAuthMode = () => {
    setError(null);
    setIsSigningUp(!isSigningUp);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.authCard}>
            {/* Auth Header */}
            <Text style={styles.authTitle}>
              {isSigningUp ? "Create Account" : "Welcome Back"}
            </Text>
            <Text style={styles.authSubtitle}>
              {isSigningUp
                ? "Sign up to continue"
                : "Sign in to access your account"}
            </Text>
            
            {/* Error Message */}
            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={24} color="#d9534f" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
            
            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Ionicons 
                name="mail" 
                size={24} 
                color="#888" 
                style={styles.inputIcon} 
              />
              <TextInput
                style={styles.input}
                placeholder="Email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
              />
            </View>
            
            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Ionicons 
                name="lock-closed" 
                size={24} 
                color="#888" 
                style={styles.inputIcon} 
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                secureTextEntry={true}
                value={password}
                onChangeText={setPassword}
              />
            </View>
            
            {/* Confirm Password (Sign Up only) */}
            {isSigningUp && (
              <View style={styles.inputContainer}>
                <Ionicons 
                  name="lock-closed" 
                  size={24} 
                  color="#888" 
                  style={styles.inputIcon} 
                />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password"
                  secureTextEntry={true}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
              </View>
            )}
            
            {/* Submit Button */}
            <TouchableOpacity
              style={styles.button}
              onPress={handleAuthentication}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonText}>
                  {isSigningUp ? "Sign Up" : "Log In"}
                </Text>
              )}
            </TouchableOpacity>
            
            {/* Toggle Auth Mode */}
            <TouchableOpacity
              style={styles.textButton}
              onPress={toggleAuthMode}
            >
              <Text style={styles.textButtonText}>
                {isSigningUp
                  ? "Already have an account? Log In"
                  : "Don't have an account? Sign Up"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#e8f0ed",
  },
  container: {
    flex: 1,
    backgroundColor: "#e8f0ed",
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  authCard: {
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
  textButton: {
    alignItems: "center",
    padding: 8,
  },
  textButtonText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
});

export default AuthenticationScreen;