import { View, Text } from 'react-native'
import React from 'react'
import { Stack } from 'expo-router'
import { AuthProvider } from '@/contexts/AuthContext';

const AuthenticationLayout = () => {
  return (
    <AuthProvider>
    <Stack screenOptions={{headerShown: false}} />
    </AuthProvider>
  )
}

export default AuthenticationLayout