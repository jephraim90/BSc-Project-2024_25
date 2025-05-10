import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import databaseService from '@/services/databaseService';
import ReservationService from '@/services/reservationService';
import RestaurantService from '@/services/restaurantService';

function ReservationDetail () {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [reservation, setReservation] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [note, setNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    const fetchReservationDetails = async () => {
      if (!id) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Get reservation document
        const reservationResult = await databaseService.getDocumentById('reservations', id);
        
        if (!reservationResult.success) {
          throw new Error(reservationResult.error || 'Could not find reservation');
        }
        
        const reservationData = reservationResult.data;
        setReservation(reservationData);
        
        // Fetch restaurant data
        if (reservationData.restaurantId) {
          const restaurantResult = await RestaurantService.getRestaurantById(reservationData.restaurantId);
          setRestaurant(restaurantResult);
          
          // Check if user is authorized to view this reservation
          // Must be admin, owner of the restaurant, or the customer who made the reservation
          if (user) {
            if (
              user.role === 'admin' || 
              (restaurantResult && restaurantResult.ownerId === user.uid) ||
              reservationData.userId === user.uid
            ) {
              // User is authorized
            } else {
              router.replace('/profile');
              throw new Error('You are not authorized to view this reservation');
            }
          }
        }
        
        // Fetch customer data if available
        if (reservationData.userId) {
          const customerResult = await databaseService.getDocumentById('users', reservationData.userId);
          if (customerResult.success) {
            setCustomer(customerResult.data);
          }
        }
        
      } catch (err) {
        console.log('Error fetching reservation details:', err);
        setError(err.message || 'Failed to load reservation details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchReservationDetails();
  }, [id, user]);
  
  const handleChangeStatus = async (newStatus) => {
    if (!reservation || !id) return;
    
    setUpdatingStatus(true);
    try {
      const result = await ReservationService.updateReservationStatus(id, newStatus);
      
      if (result.success) {
        // Update local state
        setReservation({
          ...reservation,
          status: newStatus,
          updatedAt: new Date().toISOString()
        });
        
        // Close modal
        setShowStatusModal(false);
      } else {
        throw new Error(result.error || 'Failed to update reservation status');
      }
    } catch (err) {
      console.log('Error updating reservation status:', err);
      Alert.alert('Error', err.message || 'Failed to update reservation status');
    } finally {
      setUpdatingStatus(false);
    }
  };
  
  const handleAddNote = async () => {
    if (!reservation || !id || !note.trim()) return;
    
    setAddingNote(true);
    try {
      // Get existing notes or initialize empty array
      const notes = reservation.notes || [];
      
      // Create new note
      const newNote = {
        text: note.trim(),
        createdAt: new Date().toISOString(),
        createdBy: user?.uid || 'unknown',
        createdByName: user?.displayName || user?.email || 'Staff'
      };
      
      // Add to notes array
      const updatedNotes = [...notes, newNote];
      
      // Update reservation
      const result = await databaseService.updateDocument('reservations', id, {
        notes: updatedNotes,
        updatedAt: new Date().toISOString()
      });
      
      if (result.success) {
        // Update local state
        setReservation({
          ...reservation,
          notes: updatedNotes,
          updatedAt: new Date().toISOString()
        });
        
        // Reset note and close modal
        setNote('');
        setShowNoteModal(false);
      } else {
        throw new Error(result.error || 'Failed to add note');
      }
    } catch (err) {
      console.log('Error adding note:', err);
      Alert.alert('Error', err.message || 'Failed to add note');
    } finally {
      setAddingNote(false);
    }
  };

  const formatDate = (dateString) => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  const formatTime = (timeString) => {
    // If already in 12-hour format with AM/PM, return as is
    if (timeString.includes('AM') || timeString.includes('PM')) {
      return timeString;
    }
    
    // Convert 24-hour format to 12-hour format
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours, 10);
      const suffix = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${suffix}`;
    } catch (err) {
      // If any error in conversion, return original
      return timeString;
    }
  };
  
  const getStatusColor = (status) => {
    switch(status) {
      case 'confirmed': return '#4CAF50'; // Green
      case 'pending': return '#FF9800';   // Orange
      case 'cancelled': return '#F44336'; // Red
      case 'completed': return '#2196F3'; // Blue
      default: return '#757575';          // Grey
    }
  };
  
  const getStatusLabel = (status) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };
  
  const formatDateTime = (date, time) => {
    if (!date || !time) return 'Not specified';
    return `${formatDate(date)} at ${formatTime(time)}`;
  };
  
  const isOwnerOrAdmin = () => {
    if (!user || !restaurant) return false;
    return user.role === 'admin' || restaurant.ownerId === user.uid;
  };
  
  const showDeleteConfirmation = () => {
    Alert.alert(
      'Delete Reservation',
      'Are you sure you want to delete this reservation? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: handleDeleteReservation,
        },
      ]
    );
  };
  
  const handleDeleteReservation = async () => {
    if (!id) return;
    
    try {
      const result = await databaseService.deleteDocument('reservations', id);
      
      if (result.success) {
        Alert.alert('Success', 'Reservation deleted successfully', [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]);
      } else {
        throw new Error(result.error || 'Failed to delete reservation');
      }
    } catch (err) {
      console.log('Error deleting reservation:', err);
      Alert.alert('Error', err.message || 'Failed to delete reservation');
    }
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a1a1a" />
        <Text style={styles.loadingText}>Loading reservation details...</Text>
      </View>
    );
  }
  
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#e53935" />
        <Text style={styles.errorTitle}>Error</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  if (!reservation) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="calendar-outline" size={64} color="#e53935" />
        <Text style={styles.errorTitle}>Reservation Not Found</Text>
        <Text style={styles.errorText}>The reservation you're looking for doesn't exist or may have been deleted.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reservation Details</Text>
          <View style={styles.placeholderIcon}>
            {/* Placeholder for spacing */}
          </View>
        </View>
        
        {/* Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: getStatusColor(reservation.status) }]}>
          <Text style={styles.statusText}>{getStatusLabel(reservation.status)}</Text>
          
        </View>
        
        {/* Restaurant Information */}
        {restaurant && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Restaurant</Text>
            <View style={styles.restaurantCard}>
              <Text style={styles.restaurantName}>{restaurant.name}</Text>
              <Text style={styles.restaurantAddress}>{restaurant.address}</Text>
              {restaurant.phone && (
                <TouchableOpacity style={styles.contactItem}>
                  <Ionicons name="call-outline" size={16} color="#666" />
                  <Text style={styles.contactText}>{restaurant.phone}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
        
        {/* Reservation Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reservation Details</Text>
          <View style={styles.detailCard}>
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Ionicons name="calendar-outline" size={18} color="#666" />
                <Text style={styles.detailLabel}>Date & Time</Text>
                <Text style={styles.detailValue}>
                  {formatDateTime(reservation.date, reservation.time)}
                </Text>
              </View>
            </View>
            
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Ionicons name="people-outline" size={18} color="#666" />
                <Text style={styles.detailLabel}>Party Size</Text>
                <Text style={styles.detailValue}>
                  {reservation.guests} {reservation.guests === 1 ? 'guest' : 'guests'}
                </Text>
              </View>
            </View>
            
            {reservation.tableIds && reservation.tableIds.length > 0 && (
              <View style={styles.detailRow}>
                <View style={styles.detailItem}>
                  <Ionicons name="restaurant-outline" size={18} color="#666" />
                  <Text style={styles.detailLabel}>Table Assignments</Text>
                  <Text style={styles.detailValue}>
                    {reservation.tableIds.join(', ')}
                  </Text>
                </View>
              </View>
            )}
            
            {reservation.reservationCode && (
              <View style={styles.detailRow}>
                <View style={styles.detailItem}>
                  <Ionicons name="barcode-outline" size={18} color="#666" />
                  <Text style={styles.detailLabel}>Reservation Code</Text>
                  <Text style={styles.detailValue}>
                    {reservation.reservationCode}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
        
        {/* Customer Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <View style={styles.detailCard}>
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Ionicons name="person-outline" size={18} color="#666" />
                <Text style={styles.detailLabel}>Name</Text>
                <Text style={styles.detailValue}>
                  {reservation.userName || customer?.displayName || 'Guest'}
                </Text>
              </View>
            </View>
            
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Ionicons name="mail-outline" size={18} color="#666" />
                <Text style={styles.detailLabel}>Email</Text>
                <Text style={styles.detailValue}>
                  {reservation.userEmail || customer?.email || 'Not provided'}
                </Text>
              </View>
            </View>
            
            {(reservation.phone || customer?.phone) && (
              <View style={styles.detailRow}>
                <View style={styles.detailItem}>
                  <Ionicons name="call-outline" size={18} color="#666" />
                  <Text style={styles.detailLabel}>Phone</Text>
                  <Text style={styles.detailValue}>
                    {reservation.phone || customer?.phone}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
        
        {/* Special Requests */}
        {reservation.specialRequests && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Special Requests</Text>
            <View style={styles.specialRequestsCard}>
              <Text style={styles.specialRequestsText}>
                {reservation.specialRequests}
              </Text>
            </View>
          </View>
        )}
        
        {/* Pre-selected Menu Items */}
        {reservation.menuSelections && reservation.menuSelections.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pre-selected Menu Items</Text>
            <View style={styles.menuItemsCard}>
              {reservation.menuSelections.map((item, index) => (
                <View key={index} style={styles.menuItem}>
                  <View style={styles.menuItemInfo}>
                    <Text style={styles.menuItemName}>{item.name}</Text>
                    {item.specialInstructions && (
                      <Text style={styles.menuItemInstructions}>
                        {item.specialInstructions}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.menuItemQuantity}>x{item.quantity}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
        
        {/* Notes */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Staff Notes</Text>
            {isOwnerOrAdmin() && (
              <TouchableOpacity 
                style={styles.addButton} 
                onPress={() => setShowNoteModal(true)}
              >
                <Ionicons name="add" size={18} color="#1a1a1a" />
                <Text style={styles.addButtonText}>Add Note</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {reservation.notes && reservation.notes.length > 0 ? (
            <View style={styles.notesCard}>
              {reservation.notes.map((note, index) => (
                <View key={index} style={styles.noteItem}>
                  <Text style={styles.noteText}>{note.text}</Text>
                  <View style={styles.noteFooter}>
                    <Text style={styles.noteAuthor}>
                      {note.createdByName || 'Staff'}
                    </Text>
                    <Text style={styles.noteDate}>
                      {new Date(note.createdAt).toLocaleString()}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyNotesCard}>
              <Ionicons name="document-text-outline" size={24} color="#ccc" />
              <Text style={styles.emptyNotesText}>
                No notes added yet
              </Text>
            </View>
          )}
        </View>
        
        {/* Action Buttons for Owner/Admin */}
        {isOwnerOrAdmin() && (
          <View style={styles.actionsContainer}>
            <TouchableOpacity 
              style={[
                styles.actionButton, 
                reservation.status === 'confirmed' ? styles.actionConfirm : styles.actionDisabled
              ]}
              disabled={reservation.status === 'confirmed'}
              onPress={() => handleChangeStatus('confirmed')}
            >
              <Ionicons name="checkmark-circle-outline" size={18} color={reservation.status === 'confirmed' ? '#aaa' : '#fff'} />
              <Text style={styles.actionButtonText}>Confirm</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.actionButton, 
                reservation.status === 'completed' ? styles.actionDisabled : styles.actionComplete
              ]}
              disabled={reservation.status === 'completed'}
              onPress={() => handleChangeStatus('completed')}
            >
              <Ionicons name="checkmark-done-outline" size={18} color={reservation.status === 'completed' ? '#aaa' : '#fff'} />
              <Text style={styles.actionButtonText}>Complete</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.actionButton, 
                reservation.status === 'cancelled' ? styles.actionDisabled : styles.actionCancel
              ]}
              disabled={reservation.status === 'cancelled'}
              onPress={() => handleChangeStatus('cancelled')}
            >
              <Ionicons name="close-circle-outline" size={18} color={reservation.status === 'cancelled' ? '#aaa' : '#fff'} />
              <Text style={styles.actionButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Delete Button (Admin Only) */}
        {user?.role === 'admin' && (
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={showDeleteConfirmation}
          >
            <Ionicons name="trash-outline" size={18} color="#fff" />
            <Text style={styles.deleteButtonText}>Delete Reservation</Text>
          </TouchableOpacity>
        )}
        
        {/* Spacer */}
        <View style={{ height: 40 }} />
      </ScrollView>
      
      {/* Status Change Modal */}
      <Modal
        visible={showStatusModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowStatusModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Reservation Status</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowStatusModal(false)}
              >
                <Ionicons name="close" size={24} color="#1a1a1a" />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={[styles.statusOption, reservation.status === 'confirmed' && styles.selectedStatusOption]}
              onPress={() => handleChangeStatus('confirmed')}
              disabled={updatingStatus}
            >
              <View style={[styles.statusDot, { backgroundColor: '#4CAF50' }]} />
              <Text style={styles.statusOptionText}>Confirmed</Text>
              {reservation.status === 'confirmed' && (
                <Ionicons name="checkmark" size={20} color="#4CAF50" />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.statusOption, reservation.status === 'pending' && styles.selectedStatusOption]}
              onPress={() => handleChangeStatus('pending')}
              disabled={updatingStatus}
            >
              <View style={[styles.statusDot, { backgroundColor: '#FF9800' }]} />
              <Text style={styles.statusOptionText}>Pending</Text>
              {reservation.status === 'pending' && (
                <Ionicons name="checkmark" size={20} color="#FF9800" />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.statusOption, reservation.status === 'completed' && styles.selectedStatusOption]}
              onPress={() => handleChangeStatus('completed')}
              disabled={updatingStatus}
            >
              <View style={[styles.statusDot, { backgroundColor: '#2196F3' }]} />
              <Text style={styles.statusOptionText}>Completed</Text>
              {reservation.status === 'completed' && (
                <Ionicons name="checkmark" size={20} color="#2196F3" />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.statusOption, reservation.status === 'cancelled' && styles.selectedStatusOption]}
              onPress={() => handleChangeStatus('cancelled')}
              disabled={updatingStatus}
            >
              <View style={[styles.statusDot, { backgroundColor: '#F44336' }]} />
              <Text style={styles.statusOptionText}>Cancelled</Text>
              {reservation.status === 'cancelled' && (
                <Ionicons name="checkmark" size={20} color="#F44336" />
              )}
            </TouchableOpacity>
            
            {updatingStatus && (
              <View style={styles.updatingContainer}>
                <ActivityIndicator size="small" color="#1a1a1a" />
                <Text style={styles.updatingText}>Updating status...</Text>
              </View>
            )}
            
            <TouchableOpacity 
              style={styles.modalCancelButton}
              onPress={() => setShowStatusModal(false)}
              disabled={updatingStatus}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Add Note Modal */}
      <Modal
        visible={showNoteModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowNoteModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Note</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowNoteModal(false)}
              >
                <Ionicons name="close" size={24} color="#1a1a1a" />
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={styles.noteInput}
              placeholder="Add a note about this reservation..."
              placeholderTextColor="#999"
              value={note}
              onChangeText={setNote}
              multiline
              maxLength={500}
              autoFocus
            />
            
            <Text style={styles.characterCount}>
              {note.length}/500 characters
            </Text>
            
            {addingNote && (
              <View style={styles.updatingContainer}>
                <ActivityIndicator size="small" color="#1a1a1a" />
                <Text style={styles.updatingText}>Adding note...</Text>
              </View>
            )}
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => setShowNoteModal(false)}
                disabled={addingNote}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalSaveButton, (!note.trim() || addingNote) && styles.modalDisabledButton]}
                onPress={handleAddNote}
                disabled={!note.trim() || addingNote}
              >
                <Text style={styles.modalSaveText}>Save Note</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  backBtn: {
    padding: 5,
  },
  placeholderIcon: {
    width: 24,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  statusText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  changeStatusButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  changeStatusText: {
    color: '#fff',
    fontSize: 14,
    marginRight: 4,
  },
  section: {
    marginHorizontal: 15,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 10,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  restaurantCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2.5,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemInfo: {
    flex: 1,
  },
  menuItemName: {
    fontSize: 15,
    color: '#1a1a1a',
  },
  menuItemInstructions: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 2,
  },
  menuItemQuantity: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginLeft: 8,
  },
  notesCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2.5,
    elevation: 2,
  },
  noteItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  noteText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 6,
  },
  noteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noteAuthor: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  noteDate: {
    fontSize: 12,
    color: '#999',
  },
  emptyNotesCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2.5,
    elevation: 2,
  },
  emptyNotesText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addButtonText: {
    fontSize: 13,
    color: '#1a1a1a',
    marginLeft: 4,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 15,
    marginTop: 25,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  actionConfirm: {
    backgroundColor: '#4CAF50',
  },
  actionComplete: {
    backgroundColor: '#2196F3',
  },
  actionCancel: {
    backgroundColor: '#F44336',
  },
  actionDisabled: {
    backgroundColor: '#e0e0e0',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 4,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e53935',
    marginHorizontal: 15,
    marginTop: 15,
    paddingVertical: 12,
    borderRadius: 8,
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  modalCloseButton: {
    padding: 4,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#f9f9f9',
  },
  selectedStatusOption: {
    backgroundColor: '#f0f0f0',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  statusOptionText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  updatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  updatingText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  modalCancelButton: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 5,
  },
  modalCancelText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  noteInput: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    fontSize: 16,
    textAlignVertical: 'top',
    color: '#333',
    marginBottom: 6,
  },
  characterCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginBottom: 15,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  modalSaveButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginLeft: 10,
  },
  modalDisabledButton: {
    backgroundColor: '#e0e0e0',
  },
  modalSaveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default ReservationDetail;
 