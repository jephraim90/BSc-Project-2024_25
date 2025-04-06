import { Stack } from 'expo-router';
import { AuthProvider } from '@/contexts/AuthContext';

export default function RestaurantLayout() {
  return (
    
    <AuthProvider>
      <Stack>
        <Stack.Screen
          name="add"
          options={{
            headerShown: false,
          }}
        />
      
      </Stack>
    </AuthProvider>
  );
}