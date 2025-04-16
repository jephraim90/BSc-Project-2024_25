import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Switch,
  TextInput,
  Modal
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import RestaurantService from '@/services/restaurantService';
import RestaurantHoursService from '@/services/restaurantHoursService';
import { useAuth } from '@/contexts/AuthContext';

const EditRestaurantSpecialHours = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  
  // Restaurant state
  const [restaurant, setRestaurant] = useState(null);
  
  // Status state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  
  // Special hours state
  const [specialHours, setSpecialHours] = useState([]);
  
  // New special hours entry state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSpecialHours, setNewSpecialHours] = useState({
    date: new Date(),
    isOpen: true,
    opens: '09:00',
    closes: '22:00',
    note: ''
  });
  
  // Date/Time picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [currentEditField, setCurrentEditField] = useState(null); // 'date', 'opens', or 'closes'
  const [selectedDate, setSelectedDate] = useState(new Date());
  
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
        
        // Initialize special hours if available
        if (data.specialHours) {
          // transform dates from strings to Date objects for the component
          const formattedSpecialHours = data.specialHours.map(item => ({
            ...item,
            dateObj: new Date(item.date)
          }));
          
          // Sort by date
          formattedSpecialHours.sort((a, b) => new Date(a.date) - new Date(b.date));
          
          // Filter out past dates
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const filteredHours = formattedSpecialHours.filter(
            item => new Date(item.date) >= today
          );
          
          setSpecialHours(filteredHours);
        }
        
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
  
  const handleAddSpecialHours = async () => {
    // Validate the new special hours
    if (newSpecialHours.isOpen) {
      if (!newSpecialHours.opens || !newSpecialHours.closes) {
        Alert.alert('Error', 'Please set both opening and closing times');
        return;
      }
      
      // Compare times to ensure closing is after opening
      const openParts = newSpecialHours.opens.split(':');
      const closeParts = newSpecialHours.closes.split(':');
      const openHour = parseInt(openParts[0], 10);
      const openMinute = parseInt(openParts[1], 10);
      const closeHour = parseInt(closeParts[0], 10);
      const closeMinute = parseInt(closeParts[1], 10);
      
      if (closeHour < openHour || (closeHour === openHour && closeMinute <= openMinute)) {
        Alert.alert('Error', 'Closing time must be after opening time');
        return;
      }
    }
    
    // Format date as YYYY-MM-DD
    const dateObj = newSpecialHours.date;
    const year = dateObj.getFullYear();
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const day = dateObj.getDate().toString().padStart(2, '0');
    const dateFormatted = `${year}-${month}-${day}`;
    
    // Check if this date already exists
    const existingIndex = specialHours.findIndex(
      h => h.date === dateFormatted
    );
    
    if (existingIndex !== -1) {
      Alert.alert(
        'Date Already Exists',
        'This date already has special hours. Do you want to update it?',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Update',
            onPress: () => updateSpecialHours(dateFormatted, existingIndex)
          }
        ]
      );
      return;
    }
    
    // Add new special hours
    setSaving(true);
    try {
      const specialHoursData = {
        date: dateFormatted,
        isOpen: newSpecialHours.isOpen,
        opens: newSpecialHours.isOpen ? newSpecialHours.opens : null,
        closes: newSpecialHours.isOpen ? newSpecialHours.closes : null,
        note: newSpecialHours.note.trim() || null
      };
      
      const result = await RestaurantHoursService.addSpecialHours(id, specialHoursData);
      
      if (result.success) {
        // Add to local state with dateObj for rendering
        const newEntry = {
          ...specialHoursData,
          dateObj: new Date(dateFormatted)
        };
        
        // Add and sort
        const updatedHours = [...specialHours, newEntry].sort(
          (a, b) => new Date(a.date) - new Date(b.date)
        );
        
        setSpecialHours(updatedHours);
        setShowAddModal(false);
        
        // Reset form
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setNewSpecialHours({
          date: tomorrow,
          isOpen: true,
          opens: '09:00',
          closes: '22:00',
          note: ''
        });
        
        Alert.alert('Success', 'Special hours added successfully');
      } else {
        Alert.alert('Error', result.error || 'Failed to add special hours');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to add special hours');
    } finally {
      setSaving(false);
    }
  };
  
  const updateSpecialHours = async (date, index) => {
    setSaving(true);
    try {
      const specialHoursData = {
        date,
        isOpen: newSpecialHours.isOpen,
        opens: newSpecialHours.isOpen ? newSpecialHours.opens : null,
        closes: newSpecialHours.isOpen ? newSpecialHours.closes : null,
        note: newSpecialHours.note.trim() || null
      };
      
      const result = await RestaurantHoursService.addSpecialHours(id, specialHoursData);
      
      if (result.success) {
        // Update local state
        const updatedHours = [...specialHours];
        updatedHours[index] = {
          ...specialHoursData,
          dateObj: new Date(date)
        };
        
        setSpecialHours(updatedHours);
        setShowAddModal(false);
        
        // Reset form
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setNewSpecialHours({
          date: tomorrow,
          isOpen: true,
          opens: '09:00',
          closes: '22:00',
          note: ''
        });
        
        Alert.alert('Success', 'Special hours updated successfully');
      } else {
        Alert.alert('Error', result.error || 'Failed to update special hours');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update special hours');
    } finally {
      setSaving(false);
    }
  };
  
  const handleDeleteSpecialHours = (date, index) => {
    Alert.alert(
      'Delete Special Hours',
      'Are you sure you want to delete the special hours for this date?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              const result = await RestaurantHoursService.deleteSpecialHours(id, date);
              
              if (result.success) {
                // Update local state
                const updatedHours = [...specialHours];
                updatedHours.splice(index, 1);
                setSpecialHours(updatedHours);
                Alert.alert('Success', 'Special hours deleted successfully');
              } else {
                Alert.alert('Error', result.error || 'Failed to delete special hours');
              }
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to delete special hours');
            } finally {
              setSaving(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };
  
  const openDatePicker = () => {
    setCurrentEditField('date');
    setSelectedDate(newSpecialHours.date);
    setShowDatePicker(true);
  };
  
  const openTimePicker = (field) => {
    setCurrentEditField(field);
    
    // Set up the current time on the picker
    const timeStr = newSpecialHours[field];
    if (timeStr) {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const date = new Date();
      date.setHours(hours, minutes, 0);
      setSelectedDate(date);
    } else {
      // Default to 9am for opening, 5pm for closing
      const date = new Date();
      if (field === 'opens') {
        date.setHours(9, 0, 0);
      } else {
        date.setHours(17, 0, 0);
      }
      setSelectedDate(date);
    }
    
    setShowTimePicker(true);
  };
  
  const handleDateChange = (event, date) => {
    setShowDatePicker(Platform.OS === 'ios');
    
    if (date) {
      // make sure time is set to start of day to avoid timezone issues
      date.setHours(0, 0, 0, 0);
      setSelectedDate(date);
      
      // Update form state
      setNewSpecialHours(prev => ({
        ...prev,
        date
      }));
    }
  };
  
  const handleTimeChange = (event, date) => {
    setShowTimePicker(Platform.OS === 'ios');
    
    if (date) {
      setSelectedDate(date);
      
      // Format time as HH:MM
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}`;
      
      // Update form state
      setNewSpecialHours(prev => ({
        ...prev,
        [currentEditField]: timeString
      }));
    }
  };
  
  const formatDate = (date) => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString(undefined, options);
  };
  
  const formatTime = (timeString) => {
    if (!timeString) return '';
    
    // Convert from 24-hour to 12-hour format with AM/PM
    const [hours, minutes] = timeString.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 === 0 ? 12 : hours % 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };
  
  if (loading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#1a1a1a" />
        <Text style={styles.loadingText}>Loading special hours...</Text>
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
            You need to be the restaurant owner or an admin to edit special hours.
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
          <Text style={styles.headerTitle}>Special Hours</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              // Set tomorrow as default date
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              setNewSpecialHours({
                date: tomorrow,
                isOpen: true,
                opens: '09:00',
                closes: '22:00',
                note: ''
              });
              setShowAddModal(true);
            }}
          >
            <Ionicons name="add" size={24} color="#1a1a1a" />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.container}>
          <View style={styles.contentContainer}>
            <Text style={styles.restaurantName}>{restaurant?.name}</Text>
            
            <View style={styles.infoContainer}>
              <Ionicons name="calendar-outline" size={20} color="#666" />
              <Text style={styles.infoText}>
                Set special business hours for holidays, events, or temporary changes. These will override your regular hours for the specified dates.
              </Text>
            </View>
            
            {specialHours.length === 0 && (
              <View style={styles.emptyState}>
                <MaterialIcons name="event-busy" size={64} color="#ccc" />
                <Text style={styles.emptyStateText}>No special hours set</Text>
                <Text style={styles.emptyStateSubtext}>
                  Tap the + button in the top right to add special hours for holidays, early closings, or other schedule changes.
                </Text>
              </View>
            )}
            
            {specialHours.map((hours, index) => (
              <View key={`special-${hours.date}`} style={styles.specialDayCard}>
                <View style={styles.specialDayHeader}>
                  <Text style={styles.specialDayDate}>{formatDate(hours.dateObj)}</Text>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteSpecialHours(hours.date, index)}
                  >
                    <Ionicons name="trash-outline" size={20} color="#e53935" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.specialDayStatus}>
                  <View style={[
                    styles.statusBadge,
                    hours.isOpen ? styles.openBadge : styles.closedBadge
                  ]}>
                    <Text style={[
                      styles.statusText,
                      hours.isOpen ? styles.openText : styles.closedText
                    ]}>
                      {hours.isOpen ? 'Open' : 'Closed'}
                    </Text>
                  </View>
                  
                  {hours.note && (
                    <Text style={styles.noteText}>{hours.note}</Text>
                  )}
                </View>
                
                {hours.isOpen && (
                  <View style={styles.hoursRow}>
                    <Text style={styles.hoursLabel}>Hours:</Text>
                    <Text style={styles.hoursValue}>
                      {formatTime(hours.opens)} - {formatTime(hours.closes)}
                    </Text>
                  </View>
                )}
                
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => {
                    // Prepare the form for editing
                    setNewSpecialHours({
                      date: hours.dateObj,
                      isOpen: hours.isOpen,
                      opens: hours.opens || '09:00',
                      closes: hours.closes || '22:00',
                      note: hours.note || ''
                    });
                    setShowAddModal(true);
                  }}
                >
                  <Ionicons name="pencil" size={16} color="#1a1a1a" />
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </ScrollView>
        
        {/* Add/Edit Special Hours Modal */}
        <Modal
          visible={showAddModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowAddModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  Special Hours
                </Text>
                <TouchableOpacity
                  onPress={() => setShowAddModal(false)}
                >
                  <Ionicons name="close" size={24} color="#1a1a1a" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalContent}>
                <Text style={styles.formLabel}>Date</Text>
                <TouchableOpacity 
                  style={styles.datePickerButton}
                  onPress={openDatePicker}
                >
                  <Text style={styles.dateText}>{formatDate(newSpecialHours.date)}</Text>
                  <Ionicons name="calendar-outline" size={20} color="#666" />
                </TouchableOpacity>
                
                <View style={styles.switchContainer}>
                  <Text style={styles.switchLabel}>
                    {newSpecialHours.isOpen ? 'Open on this day' : 'Closed on this day'}
                  </Text>
                  <Switch
                    value={newSpecialHours.isOpen}
                    onValueChange={(value) => setNewSpecialHours({...newSpecialHours, isOpen: value})}
                    trackColor={{ false: '#ccc', true: '#c1dfc4' }}
                    thumbColor={newSpecialHours.isOpen ? '#4a9c59' : '#f4f3f4'}
                  />
                </View>
                
                {newSpecialHours.isOpen && (
                  <View style={styles.hoursContainer}>
                    <Text style={styles.formLabel}>Hours</Text>
                    
                    <View style={styles.timeInputContainer}>
                      <TouchableOpacity
                        style={styles.timeButton}
                        onPress={() => openTimePicker('opens')}
                      >
                        <Text style={styles.timeLabel}>Opens</Text>
                        <Text style={styles.timeValue}>
                          {formatTime(newSpecialHours.opens)}
                        </Text>
                        <Ionicons name="chevron-down" size={16} color="#666" />
                      </TouchableOpacity>
                      
                      <Text style={styles.timeSeparator}>to</Text>
                      
                      <TouchableOpacity
                        style={styles.timeButton}
                        onPress={() => openTimePicker('closes')}
                      >
                        <Text style={styles.timeLabel}>Closes</Text>
                        <Text style={styles.timeValue}>
                          {formatTime(newSpecialHours.closes)}
                        </Text>
                        <Ionicons name="chevron-down" size={16} color="#666" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                
                <Text style={styles.formLabel}>Note (optional)</Text>
                <TextInput
                  style={styles.noteInput}
                  value={newSpecialHours.note}
                  onChangeText={(text) => setNewSpecialHours({...newSpecialHours, note: text})}
                  placeholder="e.g. Holiday, Event, Staff training"
                  placeholderTextColor="#999"
                  maxLength={50}
                />
                
                <View style={styles.noteHelp}>
                  <Ionicons name="information-circle-outline" size={16} color="#666" />
                  <Text style={styles.noteHelpText}>
                    Add a short note to explain why hours are different on this day
                  </Text>
                </View>
                
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleAddSpecialHours}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save Special Hours</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
        
        {/* Date Picker Modal */}
        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            minimumDate={new Date()}
          />
        )}
        
        {/* Time Picker Modal */}
        {showTimePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="time"
            is24Hour={false}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleTimeChange}
            minuteInterval={15}
          />
        )}
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
  addButton: {
    padding: 8,
  },
  contentContainer: {
    padding: 15,
  },
  restaurantName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 15,
  },
  infoContainer: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
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
  specialDayCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  specialDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  specialDayDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  deleteButton: {
    padding: 6,
  },
  specialDayStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  openBadge: {
    backgroundColor: '#e8f5e9',
  },
  closedBadge: {
    backgroundColor: '#ffebee',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  openText: {
    color: '#2e7d32',
  },
  closedText: {
    color: '#c62828',
  },
  noteText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  hoursRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  hoursLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 5,
  },
  hoursValue: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  editButtonText: {
    fontSize: 14,
    color: '#1a1a1a',
    marginLeft: 5,
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
    minHeight: '80%',
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
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    marginBottom: 15,
  },
  dateText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingVertical: 10,
  },
  switchLabel: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  hoursContainer: {
    marginBottom: 15,
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  timeLabel: {
    fontSize: 14,
    color: '#666',
  },
  timeValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
    flex: 1,
    textAlign: 'center',
  },
  timeSeparator: {
    marginHorizontal: 10,
    fontSize: 14,
    color: '#999',
  },
  noteInput: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    fontSize: 16,
    marginBottom: 8,
  },
  noteHelp: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  noteHelpText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 5,
  },
  saveButton: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  saveButtonText: {
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
});

export default EditRestaurantSpecialHours;