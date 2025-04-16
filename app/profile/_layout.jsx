import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import React from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const HeaderLogout = () => {
  const router = useRouter();
  const { user, logout } = useAuth();
  
  const handleLogout = async () => {
    await logout();
    router.replace('/auth'); // Redirect to auth screen
  };  
  // Show button only if user is logged in
  return user ? (
    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
      <Ionicons name="log-out-outline" size={20} color="#1a1a1a" style={styles.logoutIcon} />
      <Text style={styles.logoutText}>Logout</Text>
    </TouchableOpacity>
  ) : null;
};

const ProfileLayout = () => {
  return (
    <AuthProvider>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#e8f0ed',
            elevation: 0,
            shadowOpacity: 0,
          },
          headerTintColor: '#1a1a1a',
          headerTitleStyle: {
            fontSize: 18,
            fontWeight: '600',
          },
          headerRight: () => <HeaderLogout />,
          contentStyle: {
            backgroundColor: '#e8f0ed',
          },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            headerTitle: '',
            headerBackVisible: false
          }}
        />
      </Stack>
    </AuthProvider>
  );
};

const styles = StyleSheet.create({
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
  },
  logoutIcon: {
    marginRight: 4,
  },
  logoutText: {
    color: '#1a1a1a',
    fontSize: 14,
    fontWeight: '500',
  }
});

export default ProfileLayout;