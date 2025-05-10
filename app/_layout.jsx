import { Stack } from "expo-router";
import { useRouter, usePathname } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import NavBar from "../components/NavBar";
import { AuthProvider } from "@/contexts/AuthContext";

export default function RootLayout() {
  const pathname = usePathname();
  
  // Check if we're on the auth page to determine whether to show the NavBar
  const isAuthRoute = pathname === "/auth" || pathname.startsWith("/auth/");

  return (
    <AuthProvider>
      <SafeAreaView style={{ flex: 1 }}>
        <Stack
          screenOptions={{
            headerShown: false
          }}
        >
          {/* Define your routes and their authentication requirements */}
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="auth" options={{ headerShown: false }} />
          
          {/* These routes will be protected by auth checks in the component */}
          <Stack.Screen name="shared-reservations" options={{ headerShown: false }} />
          <Stack.Screen name="reservation" options={{ headerShown: false }} />
          
          <Stack.Screen name="reservations" options={{ headerShown: false }} />
          <Stack.Screen name="settings" options={{ headerShown: false }} />
          <Stack.Screen name="favourites" options={{ headerShown: false }} />
          <Stack.Screen name="reviews" options={{ headerShown: false }} />
          <Stack.Screen name="help" options={{ headerShown: false }} />
        </Stack>
        
        {/* Only render NavBar if we're not on the auth page */}
        {!isAuthRoute && <NavBar />}
      </SafeAreaView>
    </AuthProvider>
  );
}