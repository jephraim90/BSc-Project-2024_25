import React, { useState } from 'react';
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
  KeyboardAvoidingView
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import RestaurantService from '@/services/restaurantService';
import { useAuth } from '@/contexts/AuthContext';


const AddRestaurant = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const showPlatformAlert = (
    title,
    message,
    buttons = [], // Array of { text, onPress }
    
    options = {}
  ) => {
    if (Platform.OS === "web") {
      // Web implementation
      const buttonLabels = buttons.map(b => b.text).join(' / ');
      const confirmation = window.confirm(
        `${title}\n\n${message}\n\n${buttonLabels}`
      );
      
      if (buttons.length >= 1) {
        confirmation ? buttons[0]?.onPress?.() : buttons[1]?.onPress?.();
      }
    } else {
      // Native implementation
      Alert.alert(
        title,
        message,
        buttons,
        options
      );
    }
  }
  
  // Form state
  const [name, setName] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [priceRange, setPriceRange] = useState('$$');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [specialties, setSpecialties] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  
  // Form validation
  const [errors, setErrors] = useState({});
  
  // Check if user has permission to add restaurants
  const hasPermission = user && (user.role === 'admin' || user.role === 'owner');
  
  // Handle form submission
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
    
    setLoading(true);
    
    try {
      // Prepare restaurant data
      const restaurantData = {
        name,
        cuisine,
        priceRange,
        description,
        address,
        phone,
        specialties: specialties.split(',').map(item => item.trim()).filter(item => item),
        rating: 0, 
        reviews: 0, 
        images: imageUrl ? [imageUrl] : [],
        hours: [
          { day: 'Monday-Friday', hours: '9:00 AM - 10:00 PM' },
          { day: 'Saturday-Sunday', hours: '10:00 AM - 11:00 PM' },
        ],
        menuSections: [],
        ownerId: user.uid, 
        createdAt: new Date().toISOString(),
      };
      
      // Add restaurant to database
      const result = await RestaurantService.addRestaurant(restaurantData);
      
      if (result.success) {
        showPlatformAlert(
          'Success',
          'Restaurant added successfully!',
          [
            { 
              text: 'View Restaurant', 
              onPress: () => router.push(`/restaurant/${result.id}`) 
            },
            { 
              text: 'Add Another', 
              onPress: () => {
                setName('');
                setCuisine('');
                setPriceRange('$$');
                setDescription('');
                setAddress('');
                setPhone('');
                setSpecialties('');
                setImageUrl('');
              },
              style: 'cancel' // For iOS
            }
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to add restaurant');
    } finally {
      setLoading(false);
    }
  };
  
  // If user doesn't have permission, show access denied
  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <View style={styles.accessDenied}>
          <Ionicons name="lock-closed" size={64} color="#666" />
          <Text style={styles.accessDeniedTitle}>Access Denied</Text>
          <Text style={styles.accessDeniedText}>
            You need admin or restaurant owner privileges to add restaurants.
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
      style={{flex: 1}}
    ><ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add New Restaurant</Text>
        <View style={{width: 24}}></View>
      </View>
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
          
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Add Restaurant</Text>
            )}
          </TouchableOpacity>
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
  submitButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  disabledButton: {
    backgroundColor: '#999',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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

export default AddRestaurant;