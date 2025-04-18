import { Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import NavBar from "../components/NavBar";
import { AuthProvider } from "@/contexts/AuthContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <SafeAreaView style={{ flex: 1 }}>
        <Stack 
          screenOptions={{
            headerShown: false
          }}
        >
          
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="auth" options={{ headerShown: false }} />
          
          {/* These routes will be protected by auth checks in the component */}
          <Stack.Screen name="shared-reservations" options={{ headerShown: false }} />
          <Stack.Screen name="reservation/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="reservation/edit/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="reservations" options={{ headerShown: false }} />
          <Stack.Screen name="settings" options={{ headerShown: false }} />
          <Stack.Screen name="favourites" options={{ headerShown: false }} />
          <Stack.Screen name="reviews" options={{ headerShown: false }} />
          <Stack.Screen name="help" options={{ headerShown: false }} />
        </Stack>
        
        <NavBar />
      </SafeAreaView>
    </AuthProvider>
  );
}