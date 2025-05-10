import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import databaseService from '@/services/databaseService';
import { useRouter } from 'expo-router';

const AdminRestaurantPage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [restaurants, setRestaurants] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  const categories = [
    'all',
    'italian',
    'japanese',
    'indian',
    'american',
    'mexican',
    'chinese',
    'thai',
    'french'
  ];

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const showPlatformAlert = (
    title,
    message,
    confirmAction,
    cancelAction = () => {}
  ) => {
    if (Platform.OS === "web") {
      if (confirmAction) {
        const isConfirmed = window.confirm(`${title}\n\n${message}`);
        isConfirmed ? confirmAction() : cancelAction();
      } else {
        window.alert(`${title}\n\n${message}`);
      }
    } else {
      if (confirmAction) {
        Alert.alert(
          title,
          message,
          [
            {
              text: "Cancel",
              style: "cancel",
              onPress: cancelAction,
            },
            {
              text: "OK",
              onPress: confirmAction,
            },
          ],
          { cancelable: false }
        );
      } else {
        Alert.alert(title, message);
      }
    }
  };

  const fetchRestaurants = async () => {
    setLoading(true);
    try {
      const result = await databaseService.getDocuments('restaurants');
      if (result.success) {
        setRestaurants(result.data);
      } else {
        showPlatformAlert('Error', 'Failed to load restaurants');
      }
    } catch (error) {
      console.log('Error fetching restaurants:', error);
      showPlatformAlert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const filteredRestaurants = restaurants.filter(restaurant => {
    const matchesSearch = restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          restaurant.address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || restaurant.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const handleDeleteRestaurant = async (restaurantId) => {
    showPlatformAlert(
      'Confirm Deletion',
      'Are you sure you want to delete this restaurant? This action cannot be undone.',
      async () => {
        setLoading(true);
        try {
          const result = await databaseService.deleteDocument('restaurants', restaurantId);
          if (result.success) {
            showPlatformAlert('Success', 'Restaurant deleted successfully');
            fetchRestaurants();
          } else {
            showPlatformAlert('Error', result.error || 'Failed to delete restaurant');
          }
        } catch (error) {
          console.log('Error deleting restaurant:', error);
          showPlatformAlert('Error', 'An unexpected error occurred');
        } finally {
          setLoading(false);
        }
      }
    );
  };

  const renderRestaurantItem = ({ item }) => (
    <View style={styles.restaurantItem}>
      <View style={styles.restaurantImageContainer}>
        {item.imageUrl ? (
          <Image 
            source={{ uri: item.imageUrl }} 
            style={styles.restaurantImage}
            resizeMode="cover" 
          />
        ) : (
          <View style={[styles.restaurantImage, styles.placeholderImage]}>
            <Ionicons name="restaurant-outline" size={40} color="#aaa" />
          </View>
        )}
      </View>
      
      <View style={styles.restaurantInfo}>
        <Text style={styles.restaurantName}>{item.name}</Text>
        <Text style={styles.featureItem}>{item.category}</Text>
        <Text style={styles.subheading}>{item.address}</Text>
        
        <View style={styles.restaurantStats}>
          <View style={styles.statItem}>
            <Ionicons name="call-outline" size={16} color="#555" />
            <Text style={styles.statText}>{item.phone || 'No phone'}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="people-outline" size={16} color="#555" />
            <Text style={styles.statText}>Capacity: {item.maxCapacity || 'N/A'}</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => router.push(`/restaurant/edit/${item.id}`)}
        >
          <Ionicons name="create-outline" size={20} color="#fff" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={() => handleDeleteRestaurant(item.id)}
        >
          <Ionicons name="trash-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.headerContainer}>
          <Text style={styles.mainHeading}>Restaurant Management</Text>
          <Text style={styles.subheading}>Manage and monitor all restaurants in your platform</Text>
        </View>
        
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#555" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search restaurants..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#555" />
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.categoryFilter}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {categories.map(category => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryChip,
                    filterCategory === category && styles.selectedChip
                  ]}
                  onPress={() => setFilterCategory(category)}
                >
                  <Text style={[
                    styles.chipText,
                    filterCategory === category && styles.selectedChipText
                  ]}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
        
        <View style={styles.ctaWrapper}>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => router.push("/restaurant/add")}
          >
            <Text style={styles.callToAction}>Add New Restaurant</Text>
          </TouchableOpacity>
        </View>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1a1a1a" />
            <Text style={styles.subheading}>Loading restaurants...</Text>
          </View>
        ) : filteredRestaurants.length > 0 ? (
          <FlatList
            data={filteredRestaurants}
            renderItem={renderRestaurantItem}
            keyExtractor={item => item.id}
            scrollEnabled={false}
            contentContainerStyle={styles.listContainer}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="restaurant-outline" size={64} color="#555555" />
            <Text style={styles.featureItem}>No restaurants found</Text>
            <Text style={styles.subheading}>
              {searchQuery || filterCategory !== 'all'
                ? 'Try changing your search or filter criteria'
                : 'Add your first restaurant to get started'}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#e8f0ed",
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
  },
  headerContainer: {
    marginTop: 20,
    marginBottom: 24,
  },
  mainHeading: {
    fontSize: 36,
    fontWeight: "800",
    color: "#1a1a1a",
    lineHeight: 42,
    letterSpacing: -0.5,
    marginBottom: 16,
    fontFamily: "System",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginLeft: 8,
  },
  subheading: {
    fontSize: 16,
    color: "#555555",
    lineHeight: 22,
    fontFamily: "System",
  },
  searchContainer: {
    marginBottom: 24,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: "#333333",
    fontFamily: "System",
  },
  categoryFilter: {
    marginVertical: 10,
  },
  categoryChip: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
    marginRight: 10,
  },
  categorySelect: {
    marginTop: 10,
  },
  selectedChip: {
    backgroundColor: '#1a1a1a',
  },
  chipText: {
    fontSize: 14,
    color: '#333333',
    fontFamily: "System",
  },
  selectedChipText: {
    color: '#fff',
  },
  ctaWrapper: {
    alignItems: 'flex-start',
    marginVertical: 20,
  },
  addButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    overflow: "hidden",
  },
  callToAction: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  listContainer: {
    paddingBottom: 30,
  },
  restaurantItem: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  restaurantImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 16,
  },
  restaurantImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  restaurantInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  restaurantName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 6,
    fontFamily: "System",
  },
  restaurantStats: {
    flexDirection: 'row',
    marginTop: 8,
    flexWrap: 'wrap',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 6,
  },
  statText: {
    marginLeft: 6,
    fontSize: 14,
    color: "#555555",
    fontFamily: "System",
  },
  actionButtons: {
    justifyContent: 'space-between',
    padding: 4,
  },
  editButton: {
    backgroundColor: '#1a1a1a',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  deleteButton: {
    backgroundColor: '#F44336',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    padding: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    marginTop: 50,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '90%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  formGroup: {
    marginBottom: 20,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#333333",
    backgroundColor: '#fff',
    marginTop: 8,
    fontFamily: "System",
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  featureItem: {
    fontSize: 15,
    color: "#333333",
    marginBottom: 6,
    lineHeight: 22,
    fontFamily: "System",
  },
});

export default AdminRestaurantPage;