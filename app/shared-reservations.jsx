import { 
  View, 
  Text, 
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import reservationSharingService from '@/services/reservationSharingService';

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

const SharedReservations = () => {
  const router = useRouter();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sharedReservations, setSharedReservations] = useState({
    received: [],
    sent: []
  });
  
  const [activeTab, setActiveTab] = useState('received');
  const [respondingToId, setRespondingToId] = useState(null);

  useEffect(() => {
    const fetchSharedReservations = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const result = await reservationSharingService.getSharedReservations(user.uid);
        
        if (result.success) {
          setSharedReservations(result.data);
        } else {
          setError(result.error || 'Failed to load shared reservations');
        }
      } catch (err) {
        console.log('Error fetching shared reservations:', err);
        setError('Something went wrong. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSharedReservations();
  }, [user]);

  const handleViewReservation = (reservationId) => {
    router.push(`/reservation/${reservationId}`);
  };

  const handleRespondToInvitation = async (invitationId, response) => {
    try {
      setRespondingToId(invitationId);
      
      const result = await reservationSharingService.respondToInvitation(
        invitationId,
        user.uid,
        response
      );
      
      if (result.success) {
        setSharedReservations(prev => ({
          ...prev,
          received: prev.received.map(invitation => 
            invitation.id === invitationId
              ? { ...invitation, status: response }
              : invitation
          )
        }));
        
        const message = response === 'accepted'
          ? 'You have accepted the reservation invitation!'
          : 'You have declined the reservation invitation.';
        
        showPlatformAlert('Success', message);
      } else {
        throw new Error(result.error || 'Failed to respond to invitation');
      }
    } catch (err) {
      console.log('Error responding to invitation:', err);
      showPlatformAlert('Error', err.message || 'Something went wrong. Please try again.');
    } finally {
      setRespondingToId(null);
    }
  };

  const handleCancelInvitation = async (invitationId) => {
    try {
      setRespondingToId(invitationId);
      
      const result = await reservationSharingService.cancelInvitation(
        invitationId,
        user.uid
      );
      
      if (result.success) {
        setSharedReservations(prev => ({
          ...prev,
          sent: prev.sent.map(invitation => 
            invitation.id === invitationId
              ? { ...invitation, status: 'cancelled' }
              : invitation
          )
        }));
        
        showPlatformAlert('Success', 'The invitation has been cancelled.');
      } else {
        throw new Error(result.error || 'Failed to cancel invitation');
      }
    } catch (err) {
      console.log('Error cancelling invitation:', err);
      showPlatformAlert('Error', err.message || 'Something went wrong. Please try again.');
    } finally {
      setRespondingToId(null);
    }
  };

  const formatDate = (dateString) => {
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderStatusBadge = (status) => {
    let color, icon, label;
    
    switch (status) {
      case 'pending':
        color = '#FF9800';
        icon = 'time-outline';
        label = 'Pending';
        break;
      case 'accepted':
        color = '#4CAF50';
        icon = 'checkmark-circle-outline';
        label = 'Accepted';
        break;
      case 'rejected':
        color = '#F44336';
        icon = 'close-circle-outline';
        label = 'Declined';
        break;
      case 'cancelled':
        color = '#9E9E9E';
        icon = 'ban-outline';
        label = 'Cancelled';
        break;
      default:
        color = '#9E9E9E';
        icon = 'help-circle-outline';
        label = status;
    }
    
    return (
      <View style={[styles.statusBadge, { backgroundColor: color }]}>
        <Ionicons name={icon} size={12} color="#fff" />
        <Text style={styles.statusText}>{label}</Text>
      </View>
    );
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.unauthorized}>
          <Ionicons name="lock-closed" size={64} color="#ccc" />
          <Text style={styles.unauthorizedText}>
            Please log in to view shared reservations.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push('/auth')}
          >
            <Text style={styles.buttonText}>Login / Sign Up</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Shared Reservations</Text>
        <View style={{width: 32}} />
      </View>
      
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'received' && styles.activeTabButton
          ]}
          onPress={() => setActiveTab('received')}
        >
          <Text style={[
            styles.tabButtonText,
            activeTab === 'received' && styles.activeTabText
          ]}>
            Received
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'sent' && styles.activeTabButton
          ]}
          onPress={() => setActiveTab('sent')}
        >
          <Text style={[
            styles.tabButtonText,
            activeTab === 'sent' && styles.activeTabText
          ]}>
            Sent
          </Text>
        </TouchableOpacity>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1a1a1a" />
          <Text style={styles.loadingText}>Loading shared reservations...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#e53935" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => router.reload()}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.scrollView}>
          {activeTab === 'received' ? (
            <>
              {sharedReservations.received.length === 0 ? (
                <View style={styles.emptyStateContainer}>
                  <Ionicons name="mail-outline" size={64} color="#ccc" />
                  <Text style={styles.emptyStateText}>
                    You haven't received any reservation invitations yet.
                  </Text>
                </View>
              ) : (
                sharedReservations.received.map((invitation) => (
                  <View key={invitation.id} style={styles.invitationCard}>
                    {renderStatusBadge(invitation.status)}
                    
                    <Text style={styles.restaurantName}>
                      {invitation.reservation.restaurantName}
                    </Text>
                    
                    <Text style={styles.reservationDetails}>
                      {formatDate(invitation.reservation.date)} at {invitation.reservation.time}
                    </Text>
                    
                    <Text style={styles.guestsText}>
                      {invitation.reservation.guests} {invitation.reservation.guests === 1 ? 'guest' : 'guests'}
                    </Text>
                    
                    <Text style={styles.invitationTimestamp}>
                      Invitation received {formatTimestamp(invitation.sharedAt)}
                    </Text>
                    
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={styles.viewButton}
                        onPress={() => handleViewReservation(invitation.reservationId)}
                      >
                        <Ionicons name="eye-outline" size={18} color="#1a1a1a" />
                        <Text style={styles.viewButtonText}>View Details</Text>
                      </TouchableOpacity>
                      
                      {invitation.status === 'pending' && (
                        <View style={styles.responseButtons}>
                          <TouchableOpacity
                            style={styles.acceptButton}
                            onPress={() => handleRespondToInvitation(invitation.id, 'accepted')}
                            disabled={respondingToId === invitation.id}
                          >
                            {respondingToId === invitation.id ? (
                              <ActivityIndicator size="small" color="#fff" />
                            ) : (
                              <>
                                <Ionicons name="checkmark" size={18} color="#fff" />
                                <Text style={styles.responseButtonText}>Accept</Text>
                              </>
                            )}
                          </TouchableOpacity>
                          
                          <TouchableOpacity
                            style={styles.declineButton}
                            onPress={() => handleRespondToInvitation(invitation.id, 'rejected')}
                            disabled={respondingToId === invitation.id}
                          >
                            <Ionicons name="close" size={18} color="#fff" />
                            <Text style={styles.responseButtonText}>Decline</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                ))
              )}
            </>
          ) : (
            <>
              {sharedReservations.sent.length === 0 ? (
                <View style={styles.emptyStateContainer}>
                  <Ionicons name="paper-plane-outline" size={64} color="#ccc" />
                  <Text style={styles.emptyStateText}>
                    You haven't sent any reservation invitations yet.
                  </Text>
                </View>
              ) : (
                sharedReservations.sent.map((invitation) => (
                  <View key={invitation.id} style={styles.invitationCard}>
                    {renderStatusBadge(invitation.status)}
                    
                    <Text style={styles.restaurantName}>
                      {invitation.reservation.restaurantName}
                    </Text>
                    
                    <Text style={styles.reservationDetails}>
                      {formatDate(invitation.reservation.date)} at {invitation.reservation.time}
                    </Text>
                    
                    <Text style={styles.guestsText}>
                      {invitation.reservation.guests} {invitation.reservation.guests === 1 ? 'guest' : 'guests'}
                    </Text>
                    
                    <Text style={styles.invitationTimestamp}>
                      Invitation sent {formatTimestamp(invitation.sharedAt)}
                    </Text>
                    
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={styles.viewButton}
                        onPress={() => handleViewReservation(invitation.reservationId)}
                      >
                        <Ionicons name="eye-outline" size={18} color="#1a1a1a" />
                        <Text style={styles.viewButtonText}>View Details</Text>
                      </TouchableOpacity>
                      
                      {invitation.status === 'pending' && (
                        <TouchableOpacity
                          style={styles.cancelButton}
                          onPress={() => handleCancelInvitation(invitation.id)}
                          disabled={respondingToId === invitation.id}
                        >
                          {respondingToId === invitation.id ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <>
                              <Ionicons name="close-circle-outline" size={18} color="#fff" />
                              <Text style={styles.responseButtonText}>Cancel</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))
              )}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTabButton: {
    backgroundColor: '#1a1a1a',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    marginTop: 16,
    color: '#e53935',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 24,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  scrollView: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  invitationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  restaurantName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  reservationDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  guestsText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  invitationTimestamp: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  viewButtonText: {
    marginLeft: 8,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  responseButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
  },
  declineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F44336',
  },
 
    cancelButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#F44336',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 6,
    },
    responseButtonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
      marginLeft: 4,
    },
    unauthorized: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    unauthorizedText: {
      marginTop: 16,
      marginBottom: 24,
      fontSize: 16,
      color: '#666',
      textAlign: 'center',
    },
    button: {
      backgroundColor: '#1a1a1a',
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
    },
    buttonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
  });
  
export default SharedReservations;