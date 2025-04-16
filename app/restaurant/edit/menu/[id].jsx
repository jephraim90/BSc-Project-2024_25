import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Modal
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import RestaurantService from '@/services/restaurantService';
import { useAuth } from '@/contexts/AuthContext';
import databaseService from '@/services/databaseService';

const EditRestaurantMenu = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  
  // State for restaurant data
  const [restaurant, setRestaurant] = useState(null);
  const [menuSections, setMenuSections] = useState([]);
  
  // State for UI
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  
  // State for editing
  const [activeSection, setActiveSection] = useState(null);
  const [activeSectionIndex, setActiveSectionIndex] = useState(-1);
  const [activeItem, setActiveItem] = useState(null);
  const [activeItemIndex, setActiveItemIndex] = useState(-1);
  const [isNewSection, setIsNewSection] = useState(false);
  const [isNewItem, setIsNewItem] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  
  useEffect(() => {
    const fetchRestaurant = async () => {
      try {
        setLoading(true);
        const data = await RestaurantService.getRestaurantById(id);
        
        if (!data) {
          Alert.alert('Error', 'Restaurant not found');
          router.back();
          return;
        }
        
        setRestaurant(data);
        
        // Check if user has permission to edit this restaurant
        const isOwner = data.ownerId === user?.uid;
        const isAdmin = user?.role === 'admin';
        
        if (!isOwner && !isAdmin) {
          setHasPermission(false);
          return;
        }
        
        setHasPermission(true);
        
        // Initialize menu sections
        setMenuSections(data.menuSections || []);
        
      } catch (error) {
        console.error('Error fetching restaurant:', error);
        Alert.alert('Error', 'Failed to load restaurant data');
      } finally {
        setLoading(false);
      }
    };
    
    if (id && user) {
      fetchRestaurant();
    }
  }, [id, user]);
  
  const handleSaveMenu = async () => {
    setSaving(true);
    try {
      // Prepare updated restaurant data with menu sections
      const updatedData = {
        menuSections: menuSections,
        updatedAt: new Date().toISOString(),
      };
      
      // Update restaurant in database
      const result = await RestaurantService.updateRestaurant(id, updatedData);
      
      if (result.success) {
        Alert.alert(
          'Success',
          'Menu updated successfully!',
          [{ 
            text: 'OK',
            onPress: () => router.back()
          }]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to update menu');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update menu');
    } finally {
      setSaving(false);
    }
  };
  
  const addSection = () => {
    setActiveSection({
      name: '',
      description: '',
      items: []
    });
    setIsNewSection(true);
    setShowSectionModal(true);
  };
  
  const editSection = (section, index) => {
    setActiveSection({...section});
    setActiveSectionIndex(index);
    setIsNewSection(false);
    setShowSectionModal(true);
  };
  
  const deleteSection = (index) => {
    Alert.alert(
      'Delete Section',
      'Are you sure you want to delete this menu section? All items in this section will also be deleted.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updatedSections = [...menuSections];
            updatedSections.splice(index, 1);
            setMenuSections(updatedSections);
          },
        },
      ],
      { cancelable: true }
    );
  };
  
  const saveSection = () => {
    if (!activeSection.name.trim()) {
      Alert.alert('Error', 'Section name is required');
      return;
    }
    
    const updatedSections = [...menuSections];
    
    if (isNewSection) {
      updatedSections.push(activeSection);
    } else {
      updatedSections[activeSectionIndex] = activeSection;
    }
    
    setMenuSections(updatedSections);
    setShowSectionModal(false);
  };
  
  const addItem = (sectionIndex) => {
    setActiveItem({
      name: '',
      description: '',
      price: '',
      imageUrl: '',
      ingredients: '',
      dietary: {
        vegetarian: false,
        vegan: false,
        glutenFree: false,
        nutFree: false
      }
    });
    setActiveSectionIndex(sectionIndex);
    setIsNewItem(true);
    setShowItemModal(true);
  };
  
  const editItem = (item, itemIndex, sectionIndex) => {
    // Ensure dietary object exists
    const itemWithDefaults = {
      ...item,
      dietary: item.dietary || {
        vegetarian: false,
        vegan: false,
        glutenFree: false,
        nutFree: false
      }
    };
    
    setActiveItem({...itemWithDefaults});
    setActiveItemIndex(itemIndex);
    setActiveSectionIndex(sectionIndex);
    setIsNewItem(false);
    setShowItemModal(true);
  };
  
  const deleteItem = (itemIndex, sectionIndex) => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to delete this menu item?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updatedSections = [...menuSections];
            updatedSections[sectionIndex].items.splice(itemIndex, 1);
            setMenuSections(updatedSections);
          },
        },
      ],
      { cancelable: true }
    );
  };
  
  const saveItem = () => {
    if (!activeItem.name.trim()) {
      Alert.alert('Error', 'Item name is required');
      return;
    }
    
    if (!activeItem.price.trim()) {
      Alert.alert('Error', 'Item price is required');
      return;
    }
    
    // Parse price to ensure it's a valid number
    const priceValue = parseFloat(activeItem.price.replace(/[^0-9.]/g, ''));
    if (isNaN(priceValue)) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }
    
    // Format price as currency
    activeItem.price = priceValue.toFixed(2);
    
    // Process ingredients as array
    if (typeof activeItem.ingredients === 'string') {
      activeItem.ingredients = activeItem.ingredients
        .split(',')
        .map(item => item.trim())
        .filter(item => item);
    }
    
    const updatedSections = [...menuSections];
    
    if (isNewItem) {
      if (!updatedSections[activeSectionIndex].items) {
        updatedSections[activeSectionIndex].items = [];
      }
      updatedSections[activeSectionIndex].items.push(activeItem);
    } else {
      updatedSections[activeSectionIndex].items[activeItemIndex] = activeItem;
    }
    
    setMenuSections(updatedSections);
    setShowItemModal(false);
  };
  
  if (loading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#1a1a1a" />
        <Text style={styles.loadingText}>Loading menu data...</Text>
      </View>
    );
  }
  
  // If user doesn't have permission, show access denied
  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <View style={styles.accessDenied}>
          <Ionicons name="lock-closed" size={64} color="#666" />
          <Text style={styles.accessDeniedTitle}>Access Denied</Text>
          <Text style={styles.accessDeniedText}>
            You need to be the restaurant owner or an admin to edit this menu.
          </Text>
          <TouchableOpacity 
            style={styles.button}
            onPress={() => router.back()}
          >
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Menu</Text>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSaveMenu}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#1a1a1a" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.container}>
          <View style={styles.menuContainer}>
            <Text style={styles.restaurantName}>{restaurant?.name}</Text>
            
            <TouchableOpacity 
              style={styles.addSectionButton}
              onPress={addSection}
            >
              <Ionicons name="add-circle-outline" size={24} color="#1a1a1a" />
              <Text style={styles.addSectionText}>Add Menu Section</Text>
            </TouchableOpacity>
            
            {menuSections.length === 0 && (
              <View style={styles.emptyState}>
                <MaterialIcons name="restaurant-menu" size={64} color="#ccc" />
                <Text style={styles.emptyStateText}>No menu sections yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  Tap "Add Menu Section" to create your first menu section like Appetizers, Main Courses, Desserts, etc.
                </Text>
              </View>
            )}
            
            {menuSections.map((section, sectionIndex) => (
              <View key={`section-${sectionIndex}`} style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                  <View>
                    <Text style={styles.sectionName}>{section.name}</Text>
                    {section.description && (
                      <Text style={styles.sectionDescription}>{section.description}</Text>
                    )}
                  </View>
                  
                  <View style={styles.sectionActions}>
                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={() => editSection(section, sectionIndex)}
                    >
                      <Ionicons name="pencil" size={22} color="#1a1a1a" />
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={() => deleteSection(sectionIndex)}
                    >
                      <Ionicons name="trash-outline" size={22} color="#e53935" />
                    </TouchableOpacity>
                  </View>
                </View>
                
                <TouchableOpacity 
                  style={styles.addItemButton}
                  onPress={() => addItem(sectionIndex)}
                >
                  <Ionicons name="add" size={20} color="#1a1a1a" />
                  <Text style={styles.addItemText}>Add Item</Text>
                </TouchableOpacity>
                
                {(!section.items || section.items.length === 0) && (
                  <Text style={styles.noItemsText}>No items in this section</Text>
                )}
                
                {section.items && section.items.map((item, itemIndex) => (
                  <View key={`item-${sectionIndex}-${itemIndex}`} style={styles.menuItemContainer}>
                    <View style={styles.menuItemContent}>
                      <View style={styles.menuItemInfo}>
                        <Text style={styles.menuItemName}>{item.name}</Text>
                        {item.description && (
                          <Text style={styles.menuItemDescription}>{item.description}</Text>
                        )}
                        <Text style={styles.menuItemPrice}>${item.price}</Text>
                        
                        {/* Display dietary icons if present */}
                        {item.dietary && (
                          <View style={styles.dietaryContainer}>
                            {item.dietary.vegetarian && (
                              <View style={styles.dietaryBadge}>
                                <Text style={styles.dietaryText}>Vegetarian</Text>
                              </View>
                            )}
                            {item.dietary.vegan && (
                              <View style={styles.dietaryBadge}>
                                <Text style={styles.dietaryText}>Vegan</Text>
                              </View>
                            )}
                            {item.dietary.glutenFree && (
                              <View style={styles.dietaryBadge}>
                                <Text style={styles.dietaryText}>Gluten-Free</Text>
                              </View>
                            )}
                            {item.dietary.nutFree && (
                              <View style={styles.dietaryBadge}>
                                <Text style={styles.dietaryText}>Nut-Free</Text>
                              </View>
                            )}
                          </View>
                        )}
                      </View>
                      
                      <View style={styles.menuItemActions}>
                        <TouchableOpacity
                          style={styles.iconButton}
                          onPress={() => editItem(item, itemIndex, sectionIndex)}
                        >
                          <Ionicons name="pencil" size={20} color="#1a1a1a" />
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          style={styles.iconButton}
                          onPress={() => deleteItem(itemIndex, sectionIndex)}
                        >
                          <Ionicons name="trash-outline" size={20} color="#e53935" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
        
        {/* Section Edit Modal */}
        <Modal
          visible={showSectionModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowSectionModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {isNewSection ? 'Add Menu Section' : 'Edit Menu Section'}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowSectionModal(false)}
                >
                  <Ionicons name="close" size={24} color="#1a1a1a" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalContent}>
                <Text style={styles.formLabel}>Section Name*</Text>
                <TextInput
                  style={styles.input}
                  value={activeSection?.name || ''}
                  onChangeText={(text) => setActiveSection({...activeSection, name: text})}
                  placeholder="e.g. Appetizers, Main Courses, Desserts"
                  placeholderTextColor="#999"
                />
                
                <Text style={styles.formLabel}>Description</Text>
                <TextInput
                  style={styles.textArea}
                  value={activeSection?.description || ''}
                  onChangeText={(text) => setActiveSection({...activeSection, description: text})}
                  placeholder="Optional section description"
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
                
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => setShowSectionModal(false)}
                  >
                    <Text style={styles.modalCancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.modalSaveButton}
                    onPress={saveSection}
                  >
                    <Text style={styles.modalSaveButtonText}>Save Section</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
        
        {/* Item Edit Modal */}
        <Modal
          visible={showItemModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowItemModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {isNewItem ? 'Add Menu Item' : 'Edit Menu Item'}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowItemModal(false)}
                >
                  <Ionicons name="close" size={24} color="#1a1a1a" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalContent}>
                <Text style={styles.formLabel}>Item Name*</Text>
                <TextInput
                  style={styles.input}
                  value={activeItem?.name || ''}
                  onChangeText={(text) => setActiveItem({...activeItem, name: text})}
                  placeholder="e.g. Margherita Pizza"
                  placeholderTextColor="#999"
                />
                
                <Text style={styles.formLabel}>Description</Text>
                <TextInput
                  style={styles.textArea}
                  value={activeItem?.description || ''}
                  onChangeText={(text) => setActiveItem({...activeItem, description: text})}
                  placeholder="Optional item description"
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
                
                <Text style={styles.formLabel}>Price*</Text>
                <TextInput
                  style={styles.input}
                  value={activeItem?.price?.toString() || ''}
                  onChangeText={(text) => setActiveItem({...activeItem, price: text})}
                  placeholder="e.g. 9.99"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                />
                
                <Text style={styles.formLabel}>Image URL</Text>
                <TextInput
                  style={styles.input}
                  value={activeItem?.imageUrl || ''}
                  onChangeText={(text) => setActiveItem({...activeItem, imageUrl: text})}
                  placeholder="https://example.com/image.jpg"
                  placeholderTextColor="#999"
                />
                
                <Text style={styles.formLabel}>Ingredients (comma separated)</Text>
                <TextInput
                  style={styles.input}
                  value={Array.isArray(activeItem?.ingredients) 
                    ? activeItem.ingredients.join(', ') 
                    : activeItem?.ingredients || ''}
                  onChangeText={(text) => setActiveItem({...activeItem, ingredients: text})}
                  placeholder="e.g. Tomato, Mozzarella, Basil"
                  placeholderTextColor="#999"
                />
                
                <Text style={styles.formLabel}>Dietary Information</Text>
                <View style={styles.dietaryOptionsContainer}>
                  <TouchableOpacity
                    style={[
                      styles.dietaryOption,
                      activeItem?.dietary?.vegetarian && styles.dietaryOptionSelected
                    ]}
                    onPress={() => setActiveItem({
                      ...activeItem, 
                      dietary: {
                        ...activeItem.dietary,
                        vegetarian: !activeItem.dietary.vegetarian
                      }
                    })}
                  >
                    <Text style={[
                      styles.dietaryOptionText,
                      activeItem?.dietary?.vegetarian && styles.dietaryOptionTextSelected
                    ]}>
                      Vegetarian
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.dietaryOption,
                      activeItem?.dietary?.vegan && styles.dietaryOptionSelected
                    ]}
                    onPress={() => setActiveItem({
                      ...activeItem,
                      dietary: {
                        ...activeItem.dietary,
                        vegan: !activeItem.dietary.vegan
                      }
                    })}
                  >
                    <Text style={[
                      styles.dietaryOptionText,
                      activeItem?.dietary?.vegan && styles.dietaryOptionTextSelected
                    ]}>
                      Vegan
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.dietaryOption,
                      activeItem?.dietary?.glutenFree && styles.dietaryOptionSelected
                    ]}
                    onPress={() => setActiveItem({
                      ...activeItem,
                      dietary: {
                        ...activeItem.dietary,
                        glutenFree: !activeItem.dietary.glutenFree
                      }
                    })}
                  >
                    <Text style={[
                      styles.dietaryOptionText,
                      activeItem?.dietary?.glutenFree && styles.dietaryOptionTextSelected
                    ]}>
                      Gluten-Free
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.dietaryOption,
                      activeItem?.dietary?.nutFree && styles.dietaryOptionSelected
                    ]}
                    onPress={() => setActiveItem({
                      ...activeItem,
                      dietary: {
                        ...activeItem.dietary,
                        nutFree: !activeItem.dietary.nutFree
                      }
                    })}
                  >
                    <Text style={[
                      styles.dietaryOptionText,
                      activeItem?.dietary?.nutFree && styles.dietaryOptionTextSelected
                    ]}>
                      Nut-Free
                    </Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => setShowItemModal(false)}
                  >
                    <Text style={styles.modalCancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.modalSaveButton}
                    onPress={saveItem}
                  >
                    <Text style={styles.modalSaveButtonText}>Save Item</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  saveButton: {
    padding: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  menuContainer: {
    padding: 15,
  },
  restaurantName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 15,
  },
  addSectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    justifyContent: 'center',
  },
  addSectionText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
  },
  sectionContainer: {
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    fontSize: 16,
    marginBottom: 15,
  },
  textArea: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    fontSize: 16,
    marginBottom: 15,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  dietaryOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  dietaryOption: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    marginRight: 8,
    marginBottom: 8,
  },
  dietaryOptionSelected: {
    backgroundColor: '#e8f4ff',
    borderColor: '#4a90e2',
  },
  dietaryOptionText: {
    fontSize: 14,
    color: '#666',
  },
  dietaryOptionTextSelected: {
    color: '#4a90e2',
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
  },
  modalCancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 10,
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  modalSaveButton: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  modalSaveButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  accessDenied: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  accessDeniedTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 16,
    marginBottom: 8,
  },
  accessDeniedText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  sectionName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  sectionActions: {
    flexDirection: 'row',
  },
  iconButton: {
    padding: 8,
    marginLeft: 8,
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 15,
    alignSelf: 'flex-start',
  },
  addItemText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#1a1a1a',
  },
  noItemsText: {
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  menuItemContainer: {
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    paddingBottom: 15,
  },
  menuItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  menuItemInfo: {
    flex: 1,
  },
  menuItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  menuItemDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  menuItemPrice: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginTop: 6,
  },
  menuItemActions: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  dietaryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  dietaryBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 6,
    marginBottom: 6,
  },
  dietaryText: {
    fontSize: 12,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: '70%',
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  modalContent: {
    padding: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
}
});

export default EditRestaurantMenu;
  
 