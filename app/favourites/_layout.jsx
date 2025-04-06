import { View, Text} from 'react-native'
import { Stack } from 'expo-router'
import React from 'react'
import { useAuth,AuthProvider} from '@/contexts/AuthContext';



const FavouritesLayout = () => {
 
  return (
    <AuthProvider>
    
    <Stack screenOptions={{headerShown: false}} />
    </AuthProvider>
    
  )
}

export default FavouritesLayout