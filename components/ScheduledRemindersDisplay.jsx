import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator,
  TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import notificationService from '@/services/notificationService';

/**
 * Component to display scheduled reminders for a reservation
 */
const ScheduledRemindersDisplay = ({ 
  reservationId, 
  restaurantName, 
  reservationDate, 
  reservationTime 
}) => {
  const [scheduledReminders, setScheduledReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch scheduled reminders when component mounts
  useEffect(() => {
    const fetchScheduledReminders = async () => {
      if (!reservationId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Get scheduled reminders from AsyncStorage via the notification service
        const asyncStorage = require('@react-native-async-storage/async-storage').default;
        const scheduledRemindersString = await asyncStorage.getItem('scheduledReminders');
        
        if (scheduledRemindersString) {
          const allReminders = JSON.parse(scheduledRemindersString);
          const reservationReminders = allReminders[reservationId] || [];
          
          // Sort reminders by time
          const sortedReminders = [...reservationReminders].sort((a, b) => {
            return new Date(a.time) - new Date(b.time);
          });
          
          setScheduledReminders(sortedReminders);
        } else {
          setScheduledReminders([]);
        }
      } catch (err) {
        console.log('Error fetching scheduled reminders:', err);
        setError('Failed to load scheduled reminders');
      } finally {
        setLoading(false);
      }
    };

    fetchScheduledReminders();
  }, [reservationId, refreshKey]);

  // Function to refresh reminders
  const refreshReminders = () => {
    setRefreshKey(prevKey => prevKey + 1);
  };

  // Function to reschedule reminders if needed
  const handleRescheduleReminders = async () => {
    if (!reservationId || !restaurantName || !reservationDate || !reservationTime) {
      return;
    }

    try {
      setLoading(true);
      
      // First, cancel any existing reminders
      await notificationService.cancelReservationReminders(reservationId);
      
      // Then schedule new ones
      const dateObj = new Date(reservationDate);
      
      const result = await notificationService.scheduleReservationReminders(
        reservationId,
        restaurantName,
        dateObj,
        reservationTime,
        false // Not server-handled
      );
      
      if (result.success) {
        // Refresh the display
        refreshReminders();
      } else {
        setError('Failed to reschedule reminders');
      }
    } catch (err) {
      console.log('Error rescheduling reminders:', err);
      setError('Failed to reschedule reminders');
    } finally {
      setLoading(false);
    }
  };

  if (!reservationId) {
    return null;
  }

  // If no client reminders are scheduled, offer to schedule them
  if (!loading && scheduledReminders.length === 0 && !error) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Reservation Reminders</Text>
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-outline" size={40} color="#999" />
          <Text style={styles.emptyText}>No reminders are currently scheduled for this reservation</Text>
          <TouchableOpacity 
            style={styles.scheduleButton}
            onPress={handleRescheduleReminders}
          >
            <Text style={styles.scheduleButtonText}>Schedule Reminders</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Reservation Reminders</Text>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={refreshReminders}
          disabled={loading}
        >
          <Ionicons name="refresh" size={20} color="#1a1a1a" />
        </TouchableOpacity>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#1a1a1a" />
          <Text style={styles.loadingText}>Loading reminders...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={refreshReminders}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.remindersContainer}>
          {scheduledReminders.map((reminder, index) => {
            // Format the reminder time
            let reminderTime;
            try {
              const date = new Date(reminder.time);
              reminderTime = date.toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true 
              });
            } catch (e) {
              reminderTime = 'Unknown time';
            }
            
            // Get reminder type label
            let reminderLabel;
            switch (reminder.type) {
              case '30-minute':
                reminderLabel = '30 minutes before';
                break;
              case '15-minute':
                reminderLabel = '15 minutes before';
                break;
              case 'start':
                reminderLabel = 'At reservation time';
                break;
              default:
                reminderLabel = 'Reminder';
            }
            
            return (
              <View key={reminder.id || index} style={styles.reminderItem}>
                <View style={styles.reminderIconContainer}>
                  <Ionicons name="time-outline" size={24} color="#1a1a1a" />
                </View>
                <View style={styles.reminderContent}>
                  <Text style={styles.reminderLabel}>{reminderLabel}</Text>
                  <Text style={styles.reminderTime}>{reminderTime}</Text>
                </View>
              </View>
            );
          })}
          
          <TouchableOpacity 
            style={styles.rescheduleButton}
            onPress={handleRescheduleReminders}
          >
            <Text style={styles.rescheduleButtonText}>Reschedule Reminders</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  refreshButton: {
    padding: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  errorText: {
    fontSize: 14,
    color: '#E53935',
    marginBottom: 8,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#1a1a1a',
    borderRadius: 4,
  },
  retryText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  remindersContainer: {
    marginTop: 6,
  },
  reminderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  reminderIconContainer: {
    width: 40,
    alignItems: 'center',
    marginRight: 12,
  },
  reminderContent: {
    flex: 1,
  },
  reminderLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  reminderTime: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  rescheduleButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    alignSelf: 'center',
  },
  rescheduleButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginVertical: 12,
  },
  scheduleButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
  },
  scheduleButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
});

export default ScheduledRemindersDisplay;