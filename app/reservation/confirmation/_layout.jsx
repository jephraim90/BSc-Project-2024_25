import { View, Text } from 'react-native'
import React from 'react'
import { Stack } from 'expo-router'
import { AuthProvider } from '@/contexts/AuthContext';


const confirmationLayout = () => {
  return (
    <AuthProvider>
    <Stack screenOptions={{headerShown: false}} />
     </AuthProvider>
  )
}

export default confirmationLayout