import { View, Text , SafeAreaView,} from 'react-native'
import React from 'react'
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
const TabBar = () => {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          height: 60, 
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0', 
          backgroundColor: '#f9f9f9', 
        },
        tabBarActiveTintColor: '#007bff', 
        tabBarInactiveTintColor: '#888', 
        tabBarLabelStyle: {
          fontSize: 12, 
          marginTop: 2, 
        },
      }}
    >
      <Tabs.Screen
        name="index" 
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
          headerShown: false, 
        }}
      />
      <Tabs.Screen
        name="restaurants" 
        options={{
          tabBarLabel: 'Restaurants',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search-outline" size={size} color={color} />
          ),
          headerTitle: 'Restaurants',
        }}
      />
      <Tabs.Screen
        name="favourites" 
        options={{
          tabBarLabel: 'Favourites',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart-outline" size={size} color={color} />
          ),
          headerTitle: 'Favourites',
        }}
      />
      <Tabs.Screen
        name="reservations" 
        options={{
          tabBarLabel: 'Reservations',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
          headerTitle: 'Reservations',
        }}
      />
      <Tabs.Screen
        name="profile" 
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