import { View, Text } from 'react-native'
import React from 'react'
import { Stack } from 'expo-router'
import { AuthProvider } from '@/contexts/AuthContext';


const ReservationLayout = () => {
  return (
      <AuthProvider>
      <Stack>
     <Stack.Screen
          name="[id]"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="edit"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="confirmation"
          options={{
            headerShown: false,
          }}
        />
        </Stack>
     </AuthProvider>
  )
}

export default ReservationLayout