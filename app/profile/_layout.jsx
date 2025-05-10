// _layout.jsx
import { View, Text, StyleSheet } from "react-native";
import React from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Stack, useRouter } from "expo-router";

const ProfileLayout = () => {
  return (
    <AuthProvider>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: "#e8f0ed",
            elevation: 0,
            shadowOpacity: 0,
          },
          headerTintColor: "#1a1a1a",
          headerTitleStyle: {
            fontSize: 18,
            fontWeight: "600",
          },
        
          contentStyle: {
            backgroundColor: "#e8f0ed",
          },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            headerTitle: "",
            headerBackVisible: false,
          }}
        />
      </Stack>
    </AuthProvider>
  );
};

export default ProfileLayout;