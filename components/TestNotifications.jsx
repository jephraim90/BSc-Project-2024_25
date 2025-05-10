import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import {
  registerForPushNotifications,
  scheduleLocalNotification
} from '@/services/notificationService';
import { collection, addDoc } from 'firebase/firestore';
import { db, auth } from '../services/firebaseConfig';

export default function TestNotifications() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState(null);
  const [logs, setLogs] = useState([]);
  
  // Add a log message with timestamp
  const addLog = (message) => {
    const timestamp = new Date().toISOString().substring(11, 19);
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev]);
    console.log(message);
  };
  
  // Get user ID
  useEffect(() => {
    if (user) {
      addLog(`Current User ID: ${user.uid}`);
    }
  }, [user]);
  
  // Register for push notifications
  const handleRegisterForNotifications = async () => {
    setLoading(true);
    addLog('Requesting notification permissions...');
    
    try {
      const result = await registerForPushNotifications();
      
      if (result.success) {
        setToken(result.token);
        addLog(`Success! Token: ${result.token}`);
        Alert.alert(
          'Registration Successful',
          'Your device is now registered for notifications.'
        );
      } else {
        addLog(`Error: ${result.error}`);
        Alert.alert(
          'Registration Failed',
          result.error || 'Could not register for notifications'
        );
      }
    } catch (error) {
      addLog(`Exception: ${error.message}`);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Test local notification
  const handleTestLocalNotification = async () => {
    addLog('Scheduling local notification...');
    
    try {
      const result = await scheduleLocalNotification(
        'Test Notification',
        'This is a local test notification',
        { type: 'local_test' },
        2
      );
      
      if (result.success) {
        addLog(`Local notification scheduled: ${result.identifier}`);
      } else {
        addLog(`Error: ${result.error}`);
      }
    } catch (error) {
      addLog(`Exception: ${error.message}`);
    }
  };
  const testCreateNotification = async () => {
    if (!auth.currentUser) {
      console.log('No user logged in');
      Alert.alert('Error', 'You must be logged in to test this feature');
      return;
    }
    
    try {
      const userId = auth.currentUser.uid;
      console.log('Creating test notification for user:', userId);
      
      // Create a simple notification document
      const notificationsRef = collection(db, 'notifications');
      const notificationData = {
        userId: userId,
        title: 'Test Notification',
        body: 'This is a direct test notification',
        data: {
          type: 'test',
          timestamp: new Date().toISOString()
        },
        read: false,
        createdAt: new Date().toISOString(),
        source: 'test'
      };
      
      const docRef = await addDoc(notificationsRef, notificationData);
      console.log('Test notification created with ID:', docRef.id);
      
      Alert.alert(
        'Success',
        `Notification document created with ID: ${docRef.id}`
      );
    } catch (error) {
      console.error('Error creating test notification:', error);
      Alert.alert(
        'Error',
        `Failed to create notification: ${error.message}`
      );
    }
  };
  

  <TouchableOpacity 
    style={[styles.actionButton, styles.secondaryButton]}
    onPress={testCreateNotification}
  >
    <Text style={styles.secondaryButtonText}>
      Test Create Notification Document
    </Text>
  </TouchableOpacity>
  
  // Test server notification
  const handleTestServerNotification = async () => {
    if (!user) {
      addLog('No user logged in');
      return;
    }
    
    addLog('Requesting server notification...');
    setLoading(true);
    
    try {
      // Local server endpoint
      const baseUrl = Platform.OS === 'android' ? 
        'http://10.0.2.2:5007' : 
        'http://localhost:5007';
      
      const response = await fetch(`${baseUrl}/debug/send-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          title: 'Server Test',
          body: 'This is a test from your notification server',
          data: { type: 'server_test', timestamp: new Date().toISOString() }
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        addLog(`Server response: ${JSON.stringify(data)}`);
        Alert.alert('Server Notification', 'Notification sent successfully');
      } else {
        addLog(`Server err: ${JSON.stringify(data)}`);
        Alert.alert('Error', data.error || 'Failed to send notification');
      }
    } catch (error) {
      addLog(`Network error: ${error.message}`);
      Alert.alert('Network Error', error.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Check notification status
  const handleCheckStatus = async () => {
    addLog('Checking notification status...');
    
    try {
      const { status } = await Notifications.getPermissionsAsync();
      addLog(`Permission status: ${status}`);
      
      if (user) {
        addLog(`User ID: ${user.uid}`);
        
        try {
          // Get current user token status from server
          const baseUrl = Platform.OS === 'android' ? 
            'http://192.168.1.100:5007' : 
            'http://localhost:5007';
          
          const response = await fetch(`${baseUrl}/debug/user/${user.uid}`);
          const data = await response.json();
          
          if (response.ok) {
            addLog(`Server reports token count: ${data.tokenCount || 0}`);
            addLog(`Has tokens: ${data.hasTokens ? 'Yes' : 'No'}`);
          } else {
            addLog(`Server error: ${JSON.stringify(data)}`);
          }
        } catch (error) {
          addLog(`Server check error: ${error.message}`);
        }
      } else {
        addLog('No user logged in');
      }
    } catch (error) {
      addLog(`Error checking status: ${error.message}`);
    }
  };
  
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification Testing</Text>
      </View>
      
      {/* User Info */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>User Information</Text>
        <Text style={styles.infoText}>
          ID: {user?.uid || 'Not logged in'}
        </Text>
        <Text style={styles.infoText}>
          Email: {user?.email || 'N/A'}
        </Text>
        {token && (
          <Text style={styles.tokenText} numberOfLines={2} ellipsizeMode="middle">
            Token: {token}
          </Text>
        )}
      </View>
      
      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={handleRegisterForNotifications}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="notifications-outline" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>Register for Notifications</Text>
            </>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={handleTestLocalNotification}
          disabled={loading}
        >
          <Ionicons name="phone-portrait-outline" size={24} color="#1a1a1a" />
          <Text style={styles.secondaryButtonText}>Test Local Notification</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={handleTestServerNotification}
          disabled={loading}
        >
          <Ionicons name="server-outline" size={24} color="#1a1a1a" />
          <Text style={styles.secondaryButtonText}>Test Server Notification</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.tertiaryButton]}
          onPress={handleCheckStatus}
        >
          <Ionicons name="information-circle-outline" size={24} color="#1a1a1a" />
          <Text style={styles.tertiaryButtonText}>Check Status</Text>
        </TouchableOpacity>
      </View>
      
      {/* Logs */}
      <View style={styles.logsContainer}>
        <Text style={styles.logsTitle}>Activity Log</Text>
        <ScrollView style={styles.logs}>
          {logs.map((log, index) => (
            <Text key={index} style={styles.logText}>{log}</Text>
          ))}
          {logs.length === 0 && (
            <Text style={styles.emptyLogText}>No activity yet</Text>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
  infoCard: {
    margin: 15,
    padding: 15,
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    marginBottom: 5,
  },
  tokenText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  actionContainer: {
    padding: 15,
  },
  actionButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#fff',
    marginLeft: 10,
    fontWeight: '600',
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  secondaryButtonText: {
    color: '#1a1a1a',
    marginLeft: 10,
    fontWeight: '600',
    fontSize: 16,
  },
  tertiaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  tertiaryButtonText: {
    color: '#1a1a1a',
    marginLeft: 10,
    fontSize: 16,
  },
  logsContainer: {
    flex: 1,
    margin: 15,
    marginTop: 0,
  },
  logsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  logs: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    padding: 10,
  },
  logText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 5,
  },
  emptyLogText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
  },
});