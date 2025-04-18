import { AuthProvider } from '@/contexts/AuthContext';
import { Stack } from 'expo-router'
import React from 'react'
import { View, Text } from 'react-native'

const EditReservationLayout = () => {
  return (
     <AuthProvider>
    <Stack screenOptions={{headerShown: false}} />
     </AuthProvider>
  )
}

export default EditReservationLayout