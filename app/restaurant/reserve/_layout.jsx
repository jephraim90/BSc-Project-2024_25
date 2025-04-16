import { View, Text } from 'react-native'
import React from 'react'
import { AuthProvider } from '@/contexts/AuthContext';
import { Stack } from 'expo-router';


const ReserveLayout = () => {
  return (
     <AuthProvider>
      <Stack screenOptions={{headerShown: false}} />
    </AuthProvider>
  )
}

export default ReserveLayout