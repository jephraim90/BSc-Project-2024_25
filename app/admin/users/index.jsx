import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import databaseService from '@/services/databaseService';

const AdminUsersPage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetailModalVisible, setUserDetailModalVisible] = useState(false);
  const [changeRoleModalVisible, setChangeRoleModalVisible] = useState(false);
  
  // Available user roles
  const userRoles = [
    { id: 'user', label: 'Customer' },
    { id: 'owner', label: 'Restaurant Owner' },
    { id: 'admin', label: 'Admin' }
  ];

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);
  
  // Filter users when search query or role filter changes
  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, filterRole]);

  // Fetch all users from database
  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Get users from Firestore 'users' collection
      const result = await databaseService.getDocuments('users');
      
      if (result.success) {
        setUsers(result.data);
      } else {
        Alert.alert('Error', 'Failed to load users');
      }
    } catch (error) {
      console.log('Error fetching users:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Filter users based on search query and role
  const filterUsers = () => {
    let filtered = [...users];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user => 
        (user.displayName && user.displayName.toLowerCase().includes(query)) ||
        (user.email && user.email.toLowerCase().includes(query))
      );
    }
    
    // Apply role filter
    if (filterRole !== 'all') {
      filtered = filtered.filter(user => user.role === filterRole);
    }
    
    setFilteredUsers(filtered);
  };

  // Open user detail modal
  const viewUserDetails = (user) => {
    setSelectedUser(user);
    setUserDetailModalVisible(true);
  };

  // Open change role modal
  const openChangeRoleModal = (user) => {
    setSelectedUser(user);
    setChangeRoleModalVisible(true);
  };

  // Change user role
  const changeUserRole = async (newRole) => {
    if (!selectedUser) return;
    
    try {
      setLoading(true);
      const result = await databaseService.updateDocument('users', selectedUser.id, {
        role: newRole,
        updatedAt: new Date().toISOString()
      });
      
      if (result.success) {
        // Update local data
        const updatedUsers = users.map(user => 
          user.id === selectedUser.id ? { ...user, role: newRole } : user
        );
        setUsers(updatedUsers);
        
        // Close modal and show success message
        setChangeRoleModalVisible(false);
        setUserDetailModalVisible(false);
        Alert.alert('Success', `User role changed to ${getRoleName(newRole)}`);
      } else {
        Alert.alert('Error', 'Failed to update user role');
      }
    } catch (error) {
      console.log('Error changing user role:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Disable/Enable user account
  const toggleUserStatus = async (user) => {
    const newStatus = user.status === 'active' ? 'disabled' : 'active';
    const actionText = newStatus === 'active' ? 'enable' : 'disable';
    
    Alert.alert(
      `Confirm ${actionText}`,
      `Are you sure you want to ${actionText} this user account?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          style: newStatus === 'active' ? 'default' : 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const result = await databaseService.updateDocument('users', user.id, {
                status: newStatus,
                updatedAt: new Date().toISOString()
              });
              
              if (result.success) {
                // Update local data
                const updatedUsers = users.map(u => 
                  u.id === user.id ? { ...u, status: newStatus } : u
                );
                setUsers(updatedUsers);
                
                if (selectedUser && selectedUser.id === user.id) {
                  setSelectedUser({...selectedUser, status: newStatus});
                }
                
                Alert.alert('Success', `User account ${newStatus}`);
              } else {
                Alert.alert('Error', `Failed to ${actionText} user account`);
              }
            } catch (error) {
              console.log('Error toggling user status:', error);
              Alert.alert('Error', 'An unexpected error occurred');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Delete user account
  const deleteUser = async (user) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this user account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const result = await databaseService.deleteDocument('users', user.id);
              
              if (result.success) {
                // Update local data
                const updatedUsers = users.filter(u => u.id !== user.id);
                setUsers(updatedUsers);
                
                // Close modal if open
                setUserDetailModalVisible(false);
                
                Alert.alert('Success', 'User account deleted');
              } else {
                Alert.alert('Error', 'Failed to delete user account');
              }
            } catch (error) {
              console.log('Error deleting user:', error);
              Alert.alert('Error', 'An unexpected error occurred');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Get role name for display
  const getRoleName = (roleId) => {
    const role = userRoles.find(r => r.id === roleId);
    return role ? role.label : 'Unknown';
  };

  // Get role badge color
  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin':
        return '#4527A0'; // Deep purple
      case 'restaurant_owner':
        return '#1565C0'; // Blue
      case 'customer':
        return '#2E7D32'; // Green
      default:
        return '#757575'; // Grey
    }
  };

  // Get status badge color
  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'active':
        return '#43A047'; // Green
      case 'disabled':
        return '#E53935'; // Red
      case 'pending':
        return '#FB8C00'; // Orange
      default:
        return '#757575'; // Grey
    }
  };

  // Format date for display
  const formatDate = (dateInput) => {
    if (!dateInput) return 'N/A';
    
    try {
      let date;
      
      // Handle different date formats
      if (typeof dateInput === 'string') {
        // Handle string formats
        if (dateInput.includes('/')) {
          // MM/DD/YYYY format
          const [month, day, year] = dateInput.split('/').map(Number);
          date = new Date(year, month - 1, day);
        } else if (dateInput.includes('-')) {
          // YYYY-MM-DD format
          date = new Date(dateInput);
        } else {
          // Try parsing the string directly
          date = new Date(dateInput);
        }
      } else if (dateInput.toDate) {
        // Firestore timestamp
        date = dateInput.toDate();
      } else {
        // Try as-is (if it's already a Date object)
        date = new Date(dateInput);
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.log('Invalid date:', dateInput);
        return 'Invalid Date';
      }
      
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.log('Error formatting date:', error, dateInput);
      return 'Error';
    }
  };
  // Get user initials for avatar
  const getUserInitials = (user) => {
    if (!user.displayName) return '?';
    
    const names = user.displayName.split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  // Render user avatar
  const renderUserAvatar = (user) => {
    if (user.photoURL) {
      return (
        <Image source={{ uri: user.photoURL }} style={styles.userAvatar} />
      );
    } else {
      return (
        <View style={[styles.userAvatarPlaceholder, { backgroundColor: stringToColor(user.id) }]}>
          <Text style={styles.userInitials}>{getUserInitials(user)}</Text>
        </View>
      );
    }
  };

  // Convert string to color for avatar background
  const stringToColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const colors = [
      '#F44336', '#E91E63', '#9C27B0', '#673AB7', 
      '#3F51B5', '#2196F3', '#03A9F4', '#00BCD4',
      '#009688', '#4CAF50', '#8BC34A', '#CDDC39',
      '#FFC107', '#FF9800', '#FF5722', '#795548'
    ];
    
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.headerContainer}>
          <Text style={styles.mainHeading}>User Management</Text>
          <Text style={styles.subheading}>Manage users and their roles</Text>
        </View>
        
        {/* Search and Filter */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#555" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search users by name or email..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#555" />
              </TouchableOpacity>
            ) : null}
          </View>
          
          <View style={styles.roleFilter}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity
                style={[
                  styles.roleChip,
                  filterRole === 'all' && styles.selectedChip
                ]}
                onPress={() => setFilterRole('all')}
              >
                <Text style={[
                  styles.chipText,
                  filterRole === 'all' && styles.selectedChipText
                ]}>All</Text>
              </TouchableOpacity>
              
              {userRoles.map(role => (
                <TouchableOpacity
                  key={role.id}
                  style={[
                    styles.roleChip,
                    filterRole === role.id && styles.selectedChip
                  ]}
                  onPress={() => setFilterRole(role.id)}
                >
                  <Text style={[
                    styles.chipText,
                    filterRole === role.id && styles.selectedChipText
                  ]}>{role.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
        
        {/* Users List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1a1a1a" />
            <Text style={styles.subheading}>Loading users...</Text>
          </View>
        ) : filteredUsers.length > 0 ? (
          <View style={styles.usersList}>
            {filteredUsers.map(user => (
              <TouchableOpacity
                key={user.id}
                style={styles.userCard}
                onPress={() => viewUserDetails(user)}
              >
                <View style={styles.userCardHeader}>
                  {renderUserAvatar(user)}
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{user.displayName || 'No Name'}</Text>
                    <Text style={styles.userEmail}>{user.email}</Text>
                    <View style={styles.userMeta}>
                      <View style={[styles.roleBadge, { backgroundColor: getRoleBadgeColor(user.role) }]}>
                        <Text style={styles.roleBadgeText}>{getRoleName(user.role)}</Text>
                      </View>
                      
                      {user.status && user.status !== 'active' && (
                        <View style={[styles.statusBadge, { backgroundColor: getStatusBadgeColor(user.status) }]}>
                          <Text style={styles.statusBadgeText}>{user.status}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
                
                <View style={styles.userCardFooter}>
                  <TouchableOpacity 
                    style={styles.userAction}
                    onPress={(e) => {
                      e.stopPropagation();
                      openChangeRoleModal(user);
                    }}
                  >
                    <Ionicons name="person-circle-outline" size={18} color="#1a1a1a" />
                    <Text style={styles.userActionText}>Change Role</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.userAction}
                    onPress={(e) => {
                      e.stopPropagation();
                      toggleUserStatus(user);
                    }}
                  >
                    <Ionicons 
                      name={user.status === 'active' ? "ban-outline" : "checkmark-circle-outline"} 
                      size={18} 
                      color={user.status === 'active' ? "#E53935" : "#43A047"} 
                    />
                    <Text style={[styles.userActionText, 
                      { color: user.status === 'active' ? "#E53935" : "#43A047" }
                    ]}>
                      {user.status === 'active' ? 'Disable' : 'Active'}
                    </Text>
                  </TouchableOpacity>
                  
                  <Ionicons name="chevron-forward" size={20} color="#666" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#555555" />
            <Text style={styles.emptyText}>No users found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery || filterRole !== 'all'
                ? 'Try changing your search or filter criteria'
                : 'There are no users in the system yet'}
            </Text>
          </View>
        )}
        
        {/* User Detail Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={userDetailModalVisible}
          onRequestClose={() => setUserDetailModalVisible(false)}
        >
          {selectedUser && (
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>User Details</Text>
                  <TouchableOpacity onPress={() => setUserDetailModalVisible(false)}>
                    <Ionicons name="close" size={24} color="#1a1a1a" />
                  </TouchableOpacity>
                </View>
                
                <ScrollView style={styles.modalBody}>
                  <View style={styles.userDetailHeader}>
                    {renderUserAvatar(selectedUser)}
                    <View style={styles.userDetailInfo}>
                      <Text style={styles.userDetailName}>{selectedUser.displayName || 'No Name'}</Text>
                      <Text style={styles.userDetailEmail}>{selectedUser.email}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.userDetailSection}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Role:</Text>
                      <View style={[styles.roleBadge, { backgroundColor: getRoleBadgeColor(selectedUser.role) }]}>
                        <Text style={styles.roleBadgeText}>{getRoleName(selectedUser.role)}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Status:</Text>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusBadgeColor(selectedUser.status || 'active') }]}>
                        <Text style={styles.statusBadgeText}>{selectedUser.status || 'active'}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Phone:</Text>
                      <Text style={styles.detailValue}>{selectedUser.phone || 'Not provided'}</Text>
                    </View>
                    
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Created:</Text>
                      <Text style={styles.detailValue}>{formatDate(selectedUser.createdAt)}</Text>
                    </View>
                    
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Last update:</Text>
                      <Text style={styles.detailValue}>{formatDate(selectedUser.updatedAt)}</Text>
                    </View>
                    
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>User ID:</Text>
                      <Text style={styles.detailValue}>{selectedUser.id}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.userActions}>
                    <TouchableOpacity 
                      style={styles.userActionButton}
                      onPress={() => openChangeRoleModal(selectedUser)}
                    >
                      <Ionicons name="person-circle-outline" size={20} color="#1a1a1a" />
                      <Text style={styles.userActionButtonText}>Change Role</Text>
                    </TouchableOpacity>
                    
                  
                    
                    <TouchableOpacity 
                      style={[styles.userActionButton, styles.deleteButton]}
                      onPress={() => deleteUser(selectedUser)}
                    >
                      <Ionicons name="trash-outline" size={20} color="#E53935" />
                      <Text style={[styles.userActionButtonText, styles.deleteButtonText]}>
                        Delete Account
                      </Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            </View>
          )}
        </Modal>
        
        {/* Change Role Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={changeRoleModalVisible}
          onRequestClose={() => setChangeRoleModalVisible(false)}
        >
          {selectedUser && (
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, styles.smallerModal]}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Change User Role</Text>
                  <TouchableOpacity onPress={() => setChangeRoleModalVisible(false)}>
                    <Ionicons name="close" size={24} color="#1a1a1a" />
                  </TouchableOpacity>
                </View>
                
                <Text style={styles.roleModalText}>
                  Change role for <Text style={styles.highlightText}>{selectedUser.displayName || selectedUser.email}</Text>
                </Text>
                
                <View style={styles.roleOptions}>
                  {userRoles.map(role => (
                    <TouchableOpacity
                      key={role.id}
                      style={[
                        styles.roleOption,
                        selectedUser.role === role.id && styles.selectedRoleOption
                      ]}
                      onPress={() => changeUserRole(role.id)}
                    >
                      <View style={[styles.roleIconBg, { backgroundColor: getRoleBadgeColor(role.id) }]}>
                        <Ionicons 
                          name={
                            role.id === 'admin' ? 'shield-outline' : 
                            role.id === 'restaurant_owner' ? 'business-outline' : 'person-outline'
                          } 
                          size={24} 
                          color="#fff" 
                        />
                      </View>
                      <View style={styles.roleInfo}>
                        <Text style={styles.roleName}>{role.label}</Text>
                        <Text style={styles.roleDescription}>
                          {role.id === 'admin' 
                            ? 'Full access to all system features' 
                            : role.id === 'restaurant_owner'
                              ? 'Can manage restaurants and reservations'
                              : 'Can make reservations and write reviews'
                          }
                        </Text>
                      </View>
                      {selectedUser.role === role.id && (
                        <View style={styles.currentRoleBadge}>
                          <Text style={styles.currentRoleText}>Current</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
                
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setChangeRoleModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </Modal>
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
    roleFilter: {
      marginVertical: 10,
    },
    roleChip: {
      paddingVertical: 10,
      paddingHorizontal: 18,
      borderRadius: 20,
      backgroundColor: '#e0e0e0',
      marginRight: 10,
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
    loadingContainer: {
      padding: 50,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
      backgroundColor: 'rgba(255,255,255,0.8)',
      borderRadius: 16,
      marginTop: 20,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: '600',
      color: "#333333",
      marginTop: 16,
      fontFamily: "System",
    },
    emptySubtext: {
      fontSize: 16,
      color: "#555555",
      textAlign: 'center',
      marginTop: 8,
      fontFamily: "System",
    },
    usersList: {
      marginBottom: 30,
    },
    userCard: {
      backgroundColor: '#ffffff',
      borderRadius: 16,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 4,
      overflow: 'hidden',
    },
    userCardHeader: {
      flexDirection: 'row',
      padding: 16,
    },
    userAvatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      marginRight: 16,
    },
    userAvatarPlaceholder: {
      width: 50,
      height: 50,
      borderRadius: 25,
      marginRight: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    userInitials: {
      color: '#fff',
      fontSize: 18,
      fontWeight: '600',
    },
    userInfo: {
      flex: 1,
      justifyContent: 'center',
    },
    userName: {
      fontSize: 18,
      fontWeight: '600',
      color: '#1a1a1a',
      marginBottom: 4,
      fontFamily: "System",
    },
    userEmail: {
      fontSize: 14,
      color: '#555555',
      marginBottom: 8,
      fontFamily: "System",
    },
    userMeta: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    roleBadge: {
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 4,
      marginRight: 8,
    },
    roleBadgeText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '600',
      fontFamily: "System",
    },
    statusBadge: {
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 4,
    },
    statusBadgeText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '600',
      fontFamily: "System",
    },
    userCardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      borderTopWidth: 1,
      borderTopColor: '#f0f0f0',
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    userAction: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 8,
      marginRight: 16,
    },
    userActionText: {
      marginLeft: 6,
      fontSize: 14,
      color: '#1a1a1a',
      fontFamily: "System",
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      width: '90%',
      maxHeight: '80%',
      backgroundColor: '#fff',
      borderRadius: 16,
      padding: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 5,
    },
    smallerModal: {
      maxHeight: '70%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#f0f0f0',
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: '#1a1a1a',
      fontFamily: "System",
    },
    modalBody: {
      flex: 1,
    },
    userDetailHeader: {
      flexDirection: 'row',
      marginBottom: 24,
      alignItems: 'center',
    },
    userDetailInfo: {
      flex: 1,
      marginLeft: 16,
    },
    userDetailName: {
      fontSize: 20,
      fontWeight: '700',
      color: '#1a1a1a',
      marginBottom: 4,
      fontFamily: "System",
    },
        userDetailEmail: {
      fontSize: 14,
      color: '#555555',
      fontFamily: "System",
    },
    userDetailSection: {
      backgroundColor: '#f9f9f9',
      borderRadius: 12,
      padding: 16,
      marginBottom: 24,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    detailLabel: {
      width: '35%',
      fontSize: 15,
      color: '#555555',
      fontFamily: "System",
    },
    detailValue: {
      flex: 1,
      fontSize: 15,
      color: '#333333',
      fontFamily: "System",
    },
    userActions: {
      marginTop: 8,
      marginBottom: 24,
    },
    userActionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f5f5f5',
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 20,
      marginBottom: 12,
    },
    userActionButtonText: {
      marginLeft: 10,
      fontSize: 16,
      fontWeight: '600',
      color: '#1a1a1a',
      fontFamily: "System",
    },
    deleteButton: {
      backgroundColor: '#ffebee',
    },
    deleteButtonText: {
      color: '#E53935',
    },
    roleModalText: {
      fontSize: 16,
      color: '#555555',
      marginBottom: 20,
      fontFamily: "System",
      textAlign: 'center',
    },
    highlightText: {
      color: '#1a1a1a',
      fontWeight: '600',
    },
    roleOptions: {
      marginBottom: 24,
    },
    roleOption: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#f9f9f9',
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: '#f0f0f0',
    },
    selectedRoleOption: {
      borderColor: '#1a1a1a',
      backgroundColor: '#f0f5ff',
    },
    roleIconBg: {
      width: 46,
      height: 46,
      borderRadius: 23,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    roleInfo: {
      flex: 1,
    },
    roleName: {
      fontSize: 16,
      fontWeight: '600',
      color: '#1a1a1a',
      marginBottom: 4,
      fontFamily: "System",
    },
    roleDescription: {
      fontSize: 14,
      color: '#555555',
      fontFamily: "System",
    },
    currentRoleBadge: {
      paddingVertical: 4,
      paddingHorizontal: 10,
      backgroundColor: '#e8f5e9',
      borderRadius: 12,
      marginLeft: 8,
    },
    currentRoleText: {
      fontSize: 12,
      color: '#43A047',
      fontWeight: '600',
      fontFamily: "System",
    },
    cancelButton: {
      paddingVertical: 14,
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: '#f0f0f0',
    },
    cancelButtonText: {
      fontSize: 16,
      color: '#555555',
      fontFamily: "System",
    }
  });

export default AdminUsersPage