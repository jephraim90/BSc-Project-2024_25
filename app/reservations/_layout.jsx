import { View, Text } from 'react-native'
import React from 'react'
import { Stack } from 'expo-router'
import { useAuth,AuthProvider} from '@/contexts/AuthContext';

const ReservationsLayout = () => {
  return (
     <AuthProvider>
    <Stack screenOptions={{headerShown: false}} />
     </AuthProvider>
  )
}

export default ReservationsLayout