import { 
    View, 
    Text, 
    StyleSheet, 
    Modal, 
    TouchableOpacity, 
    TextInput,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform
  } from 'react-native';
  import React, { useState } from 'react';
  import { Ionicons } from '@expo/vector-icons';
  import reservationSharingService from '@/services/reservationSharingService';
  
  const ShareReservationModal = ({ 
    visible, 
    onClose, 
    reservationId, 
    userId,
    restaurantName,
    reservationDate,
    reservationTime
  }) => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    const handleShare = async () => {
    
      if (!email || !email.includes('@') || !email.includes('.')) {
        setError('Please enter a valid email address');
        return;
      }
      
      setError('');
      setLoading(true);
      
      try {
        const result = await reservationSharingService.shareReservation(
          reservationId,
          email,
          userId
        );
        
        if (result.success) {
          Alert.alert(
            'Invitation Sent',
            `Reservation shared with ${email} successfully!`,
            [{ text: 'OK', onPress: () => {
              setEmail('');
              onClose();
            }}]
          );
        } else {
          throw new Error(result.error || 'Failed to share reservation');
        }
      } catch (err) {
        console.error('Error sharing reservation:', err);
        setError(err.message || 'Something went wrong. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    return (
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={onClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Share Reservation</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
              >
                <Ionicons name="close" size={24} color="#1a1a1a" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.reservationInfo}>
              <Text style={styles.restaurantName}>{restaurantName}</Text>
              <Text style={styles.reservationDetails}>
                {reservationDate} at {reservationTime}
              </Text>
            </View>
            
            <Text style={styles.instructions}>
              Enter the email of a DineConnect user you want to share this reservation with.
              They will be able to view the reservation details and confirm if they're joining you.
            </Text>
            
            <TextInput
              style={styles.emailInput}
              placeholder="Enter email address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            
            <TouchableOpacity
              style={[styles.shareButton, loading && styles.disabledButton]}
              onPress={handleShare}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.shareButtonText}>Send Invitation</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  };
  
  const styles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContent: {
      backgroundColor: '#fff',
      borderRadius: 16,
      width: '100%',
      padding: 20,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: '#1a1a1a',
    },
    closeButton: {
      padding: 4,
    },
    reservationInfo: {
      backgroundColor: '#f8f8f8',
      padding: 16,
      borderRadius: 8,
      marginBottom: 16,
    },
    restaurantName: {
      fontSize: 16,
      fontWeight: '600',
      color: '#1a1a1a',
      marginBottom: 4,
    },
    reservationDetails: {
      fontSize: 14,
      color: '#666',
    },
    instructions: {
      fontSize: 14,
      color: '#666',
      marginBottom: 16,
      lineHeight: 20,
    },
    emailInput: {
      backgroundColor: '#f2f2f2',
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      marginBottom: 8,
    },
    errorText: {
      color: '#e53935',
      fontSize: 14,
      marginBottom: 16,
    },
    shareButton: {
      backgroundColor: '#1a1a1a',
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 8,
    },
    disabledButton: {
      backgroundColor: '#999',
    },
    shareButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
  });
  
  export default ShareReservationModal;