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
  Image
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import RestaurantService from '@/services/restaurantService';
import { useAuth } from '@/contexts/AuthContext';

const EditRestaurant = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  
  // Form state
  const [name, setName] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [priceRange, setPriceRange] = useState('$$');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [specialties, setSpecialties] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // Status state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [restaurant, setRestaurant] = useState(null);
  const [hasPermission, setHasPermission] = useState(false);
  
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
        
        // Populate form fields
        setName(data.name || '');
        setCuisine(data.cuisine || '');
        setPriceRange(data.priceRange || '$$');
        setDescription(data.description || '');
        setAddress(data.address || '');
        setPhone(data.phone || '');
        setSpecialties(data.specialties ? data.specialties.join(', ') : '');
        setImageUrl(data.images && data.images.length > 0 ? data.images[0] : '');
        
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
  
  const handleSubmit = async () => {
    // Reset errors
    setErrors({});
    
    // Validate form
    const newErrors = {};
    if (!name) newErrors.name = 'Restaurant name is required';
    if (!cuisine) newErrors.cuisine = 'Cuisine type is required';
    if (!address) newErrors.address = 'Address is required';
    if (!phone) newErrors.phone = 'Phone number is required';
    if (!description) newErrors.description = 'Description is required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setSaving(true);
    
    try {
      // Prepare updated restaurant data
      const updatedData = {
        name,
        cuisine,
        priceRange,
        description,
        address,
        phone,
        specialties: specialties.split(',').map(item => item.trim()).filter(item => item),
        images: imageUrl ? [imageUrl] : [],
        // We don't update rating, reviews, menuSections, or ownerId here
        updatedAt: new Date().toISOString(),
      };
      
      // Update restaurant in database
      const result = await RestaurantService.updateRestaurant(id, updatedData);
      
      if (result.success) {
        Alert.alert(
          'Success',
          'Restaurant updated successfully!',
          [
            { 
              text: 'View Restaurant', 
              onPress: () => router.push(`/restaurant/${id}`) 
            },
            { 
              text: 'OK',
              onPress: () => router.back()
            }
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to update restaurant');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update restaurant');
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#1a1a1a" />
        <Text style={styles.loadingText}>Loading restaurant details...</Text>
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
            You need to be the restaurant owner or an admin to edit this restaurant.
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
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Restaurant</Text>
          <View style={{ width: 24 }}></View>
        </View>
        
        {/* Current restaurant image preview */}
        {imageUrl ? (
          <View style={styles.imagePreviewContainer}>
            <Image
              source={{ uri: imageUrl }}
              style={styles.imagePreview}
              resizeMode="cover"
            />
          </View>
        ) : null}
        
        <View style={styles.formContainer}>
          <Text style={styles.formLabel}>Restaurant Name*</Text>
          <TextInput
            style={[styles.input, errors.name && styles.inputError]}
            value={name}
            onChangeText={setName}
            placeholder="Enter restaurant name"
            placeholderTextColor="#999"
          />
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          
          <Text style={styles.formLabel}>Cuisine Type*</Text>
          <TextInput
            style={[styles.input, errors.cuisine && styles.inputError]}
            value={cuisine}
            onChangeText={setCuisine}
            placeholder="e.g. Italian, Japanese, Mexican"
            placeholderTextColor="#999"
          />
          {errors.cuisine && <Text style={styles.errorText}>{errors.cuisine}</Text>}
          
          <Text style={styles.formLabel}>Price Range</Text>
          <View style={styles.priceRangeContainer}>
            {['$', '$$', '$$$', '$$$$'].map((price) => (
              <TouchableOpacity
                key={price}
                style={[
                  styles.priceRangeButton,
                  priceRange === price && styles.priceRangeButtonActive
                ]}
                onPress={() => setPriceRange(price)}
              >
                <Text 
                  style={[
                    styles.priceRangeText,
                    priceRange === price && styles.priceRangeTextActive
                  ]}
                >
                  {price}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <Text style={styles.formLabel}>Address*</Text>
          <TextInput
            style={[styles.input, errors.address && styles.inputError]}
            value={address}
            onChangeText={setAddress}
            placeholder="Full restaurant address"
            placeholderTextColor="#999"
          />
          {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
          
          <Text style={styles.formLabel}>Phone Number*</Text>
          <TextInput
            style={[styles.input, errors.phone && styles.inputError]}
            value={phone}
            onChangeText={setPhone}
            placeholder="e.g. +1 123 456 7890"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
          />
          {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
          
          <Text style={styles.formLabel}>Description*</Text>
          <TextInput
            style={[styles.textArea, errors.description && styles.inputError]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe your restaurant"
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
          
          <Text style={styles.formLabel}>Specialties (comma separated)</Text>
          <TextInput
            style={styles.input}
            value={specialties}
            onChangeText={setSpecialties}
            placeholder="e.g. Seafood Pasta, Tiramisu, Wood-fired Pizza"
            placeholderTextColor="#999"
          />
          
          <Text style={styles.formLabel}>Main Image URL</Text>
          <TextInput
            style={styles.input}
            value={imageUrl}
            onChangeText={setImageUrl}
            placeholder="https://example.com/image.jpg"
            placeholderTextColor="#999"
          />
          
          <Text style={styles.note}>
            * Required fields
          </Text>
          
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={[styles.cancelButton]}
              onPress={() => router.back()}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.submitButton, saving && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
          
          {/* Advanced Options - Less common fields to edit */}
          <TouchableOpacity 
            style={styles.advancedOptionsButton}
            onPress={() => router.push(`/restaurant/edit/menu/${id}`)}
          >
            <Text style={styles.advancedOptionsText}>Edit Menu</Text>
            <Ionicons name="chevron-forward" size={20} color="#1a1a1a" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.advancedOptionsButton}
            onPress={() => router.push(`/restaurant/edit/hours/${id}`)}
          >
            <Text style={styles.advancedOptionsText}>Edit Business Hours</Text>
            <Ionicons name="chevron-forward" size={20} color="#1a1a1a" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.advancedOptionsButton}
            onPress={() => router.push(`/restaurant/edit/photos/${id}`)}
          >
            <Text style={styles.advancedOptionsText}>Manage Photos</Text>
            <Ionicons name="chevron-forward" size={20} color="#1a1a1a" />
          </TouchableOpacity>
          
          {/* Danger Zone */}
          <View style={styles.dangerZone}>
            <Text style={styles.dangerZoneTitle}>Danger Zone</Text>
            
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={() => {
                Alert.alert(
                  'Delete Restaurant',
                  'Are you sure you want to delete this restaurant? This action cannot be undone.',
                  [
                    {
                      text: 'Cancel',
                      style: 'cancel',
                    },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          setSaving(true);
                          const result = await RestaurantService.deleteRestaurant(id);
                          if (result.success) {
                            Alert.alert('Success', 'Restaurant deleted successfully');
                            router.replace('/profile');
                          } else {
                            Alert.alert('Error', result.error || 'Failed to delete restaurant');
                          }
                        } catch (error) {
                          Alert.alert('Error', error.message || 'Failed to delete restaurant');
                        } finally {
                          setSaving(false);
                        }
                      },
                    },
                  ],
                  { cancelable: true }
                );
              }}
            >
              <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
              <Text style={styles.deleteButtonText}>Delete Restaurant</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e8f0ed',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e8f0ed',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#e8f0ed',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  imagePreviewContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  imagePreview: {
    width: '90%',
    height: 200,
    borderRadius: 12,
  },
  formContainer: {
    padding: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
  },
  inputError: {
    borderColor: '#dc3545',
  },
  errorText: {
    color: '#dc3545',
    fontSize: 12,
    marginTop: 4,
  },
  textArea: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
    minHeight: 100,
  },
  priceRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  priceRangeButton: {
    flex: 1,
    padding: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  priceRangeButtonActive: {
    backgroundColor: '#1a1a1a',
    borderColor: '#1a1a1a',
  },
  priceRangeText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  priceRangeTextActive: {
    color: '#FFFFFF',
  },
  note: {
    color: '#666',
    fontSize: 12,
    marginTop: 16,
    marginBottom: 8,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  submitButton: {
    flex: 2,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#999',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: '600',
  },
  advancedOptionsButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  advancedOptionsText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  dangerZone: {
    marginTop: 32,
    marginBottom: 32,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dc3545',
    borderStyle: 'dashed',
  },
  dangerZoneTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc3545',
    marginBottom: 16,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dc3545',
    borderRadius: 8,
    padding: 16,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  accessDenied: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  accessDeniedTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
    color: '#1a1a1a',
  },
  accessDeniedText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default EditRestaurant;