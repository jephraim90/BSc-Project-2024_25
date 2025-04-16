import { View, Text , SafeAreaView,} from 'react-native'
import React from 'react'
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const TabBar = () => {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          height: 60, // Adjust as needed to match the image
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0', // Light gray border
          backgroundColor: '#f9f9f9', // Light background color
        },
        tabBarActiveTintColor: '#007bff', // Example: A blue color for active icons/text
        tabBarInactiveTintColor: '#888', // Example: Gray color for inactive icons/text
        tabBarLabelStyle: {
          fontSize: 12, // Adjust label font size
          marginTop: 2, // Add some spacing between icon and label
        },
      }}
    >
      <Tabs.Screen
        name="index" // Maps to app/index.jsx
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
          headerShown: false, // Optionally hide header for this screen
        }}
      />
      <Tabs.Screen
        name="restaurants" // Maps to app/restaurants/index.jsx
        options={{
          tabBarLabel: 'Restaurants',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search-outline" size={size} color={color} />
          ),
          headerTitle: 'Restaurants', // Optional header title
        }}
      />
      <Tabs.Screen
        name="favourites" // Maps to app/favourites/index.jsx
        options={{
          tabBarLabel: 'Favourites',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart-outline" size={size} color={color} />
          ),
          headerTitle: 'Favourites',
        }}
      />
      <Tabs.Screen
        name="reservations" // Maps to app/reservations/index.jsx
        options={{
          tabBarLabel: 'Reservations',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
          headerTitle: 'Reservations',
        }}
      />
      <Tabs.Screen
        name="profile" // Maps to app/profile/index.jsx
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
          headerTitle: 'Profile',
        }}
      />
    </Tabs>
    
  )
}

export default TabBar