import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import React from 'react'
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
const NavBar = () => {
  const router = useRouter();
  
  return (
    <View style={styles.bottomNav}>
      <TouchableOpacity style={styles.navItem} onPress={() => router.replace('/')}>
        <Ionicons name="home-outline" size={24} color="#1a1a1a" />
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.navItem} onPress={() => router.replace('/restaurants')}>
        <Ionicons name="search" size={24} color="#1a1a1a" />
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.navItem} onPress={() => router.replace('/reservations')}>
        <Ionicons name="calendar-outline" size={24} color="#1a1a1a" />
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.navItem} onPress={() => router.replace('/favourites')}>
        <Ionicons name="heart-outline" size={24} color="#1a1a1a" />
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.navItem} onPress={() => router.replace('/profile')}>
        <Ionicons name="person-outline" size={24} color="#1a1a1a" />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 60,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#FFFFFF',
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: '100%',
  },
})

export default NavBar