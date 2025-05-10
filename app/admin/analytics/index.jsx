import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import databaseService from '@/services/databaseService';
import {
  LineChart,
  BarChart,
  PieChart,
  ProgressChart
} from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

const AdminAnalytics = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('week'); // 'week', 'month', 'year'
  const [selectedRestaurant, setSelectedRestaurant] = useState('all');
  const [restaurants, setRestaurants] = useState([]);
  
  // Analytics data states
  const [reservationStats, setReservationStats] = useState({
    total: 0,
    confirmed: 0,
    pending: 0,
    cancelled: 0,
    timeData: []
  });
  
  const [restaurantStats, setRestaurantStats] = useState([]);
  const [userStats, setUserStats] = useState({
    total: 0,
    active: 0,
    new: 0,
    roles: []
  });
  
  const [popularTimes, setPopularTimes] = useState([]);

  // Fetch data on component mount
  useEffect(() => {
    fetchRestaurants();
    fetchAnalyticsData();
  }, [timeRange, selectedRestaurant]);

  // Fetch restaurants list
  const fetchRestaurants = async () => {
    try {
      const result = await databaseService.getDocuments('restaurants');
      
      if (result.success) {
        setRestaurants(result.data);
      } else {
        console.log('Failed to load restaurants');
      }
    } catch (error) {
      console.log('Error fetching restaurants:', error);
    }
  };

  // Fetch all analytics data
  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchReservationStats(),
        fetchRestaurantStats(),
        fetchUserStats(),
        fetchPopularTimes()
      ]);
    } catch (error) {
      console.log('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

// Fetch reservation statistics
const fetchReservationStats = async () => {
  try {
    // Set up query constraints
    let queryConstraints = [];
    
    // Add restaurant constraint if specific restaurant selected
    if (selectedRestaurant !== 'all') {
      queryConstraints.push(
        databaseService.queries.where('restaurantId', '==', selectedRestaurant)
      );
    }
    
    // Fetch ALL reservations first
    const result = await databaseService.getDocuments('reservations', queryConstraints);
    
    if (result.success) {
      const allReservations = result.data;
      
      // Get the start date for filtering
      const startDate = getStartDateFromTimeRange(timeRange);
      
      // Filter reservations by date
      const reservations = allReservations.filter(reservation => {
        // Skip if no date
        if (!reservation.date) return false;
        
        let reservationDate;
        
        // Parse reservation date
        if (typeof reservation.date === 'string') {
          reservationDate = new Date(reservation.date);
        } else if (reservation.date.toDate) {
          // Firestore timestamp
          reservationDate = reservation.date.toDate();
        } else {
          // Fallback
          reservationDate = new Date(reservation.date);
        }
        
        // Check if the reservation date is after the start date
        return reservationDate >= startDate;
      });
      
      console.log(`Found ${reservations.length} reservations in selected time range`);
      
      // Calculate reservation status counts
      const confirmed = reservations.filter(r => r.status === 'confirmed').length;
      const pending = reservations.filter(r => r.status === 'pending').length;
      const cancelled = reservations.filter(r => r.status === 'cancelled').length;
      
      // Calculate time series data
      const timeData = generateTimeSeriesData(reservations, timeRange);
      
      setReservationStats({
        total: reservations.length,
        confirmed,
        pending,
        cancelled,
        timeData
      });
    }
  } catch (error) {
    console.log('Error fetching reservation stats:', error);
  }
};

  // Fetch restaurant statistics
  const fetchRestaurantStats = async () => {
    try {
      // Use selected restaurant if specified
      const restaurantsToAnalyze = selectedRestaurant === 'all' 
        ? restaurants 
        : restaurants.filter(r => r.id === selectedRestaurant);
      
      if (restaurantsToAnalyze.length === 0) return;
      
      const stats = [];
      
      // If all restaurants selected, get top 5 by reservation count
      if (selectedRestaurant === 'all') {
        // Get all reservations first
        const reservationsResult = await databaseService.getDocuments('reservations');
        
        if (reservationsResult.success) {
          const reservations = reservationsResult.data;
          
          // Count reservations per restaurant
          const counts = {};
          reservations.forEach(res => {
            if (res.restaurantId) {
              counts[res.restaurantId] = (counts[res.restaurantId] || 0) + 1;
            }
          });
          
          // Convert to array and sort
          const sortedRestaurants = Object.keys(counts).map(id => {
            const restaurant = restaurants.find(r => r.id === id);
            return {
              id,
              name: restaurant ? restaurant.name : 'Unknown',
              count: counts[id]
            };
          }).sort((a, b) => b.count - a.count).slice(0, 5);
          
          setRestaurantStats(sortedRestaurants);
        }
      } else {
        // For single restaurant, get detailed stats
        const restaurantId = selectedRestaurant;
        const reservationsResult = await databaseService.getDocuments('reservations', [
          databaseService.queries.where('restaurantId', '==', restaurantId)
        ]);
        
        if (reservationsResult.success) {
          const restaurant = restaurants.find(r => r.id === restaurantId);
          if (restaurant) {
            setRestaurantStats([{
              id: restaurantId,
              name: restaurant.name,
              count: reservationsResult.data.length
            }]);
          }
        }
      }
    } catch (error) {
      console.log('Error fetching restaurant stats:', error);
    }
  };

// Fetch user statistics
const fetchUserStats = async () => {
  try {
    // Get all users
    const result = await databaseService.getDocuments('users');
    console.log("The user results are: ", result)
    if (result.success) {
      const users = result.data;
      console.log(`Found ${users.length} total users in database`);
      
      // Calculate active users (consider all users active by default if no status field)
      const active = users.filter(u => !u.status || u.status === 'active').length;
      
      // Calculate new users based on time range
      const startDate = getStartDateFromTimeRange(timeRange);
      
      // Debug user creation dates
      users.forEach((user, index) => {
        if (index < 3) { // Log first 3 users for debugging
          console.log(`User ${index} createdAt:`, user.createdAt, 
                      'Type:', typeof user.createdAt,
                      'Has toDate:', user.createdAt && !!user.createdAt.toDate);
        }
      });
      
      const newUsers = users.filter(u => {
        if (!u.createdAt) return false;
        
        let userCreatedDate;
        
        // Handle different date formats
        if (typeof u.createdAt === 'string') {
          userCreatedDate = new Date(u.createdAt);
        } else if (u.createdAt.toDate) {
          // Firestore timestamp
          userCreatedDate = u.createdAt.toDate();
        } else {
          // Try as-is
          userCreatedDate = new Date(u.createdAt);
        }
        
        // Skip invalid dates
        if (isNaN(userCreatedDate.getTime())) {
          return false;
        }
        
        return userCreatedDate >= startDate;
      }).length;
      
      // Calculate role distribution
      const roles = {};
      users.forEach(user => {
        const role = user.role || 'customer';
        roles[role] = (roles[role] || 0) + 1;
      });
      
      const roleData = Object.keys(roles).map(role => ({
        name: getRoleName(role),
        count: roles[role],
        color: getRoleColor(role)
      }));
      
      console.log(`Active users: ${active}, New users: ${newUsers}, Role data:`, roleData);
      
      setUserStats({
        total: users.length,
        active,
        new: newUsers,
        roles: roleData
      });
    } else {
      console.log('Failed to fetch users:', result.error);
    }
  } catch (error) {
    console.log('Error fetching user stats:', error);
  }
};

  // Fetch popular times
  const fetchPopularTimes = async () => {
    try {
      // Set up query constraints
      let queryConstraints = [];
      
      // Add time range constraint
      const startDate = getStartDateFromTimeRange(timeRange);
      queryConstraints.push(
        databaseService.queries.where('createdAt', '>=', startDate.toISOString())
      );
      
      // Add restaurant constraint if specific restaurant selected
      if (selectedRestaurant !== 'all') {
        queryConstraints.push(
          databaseService.queries.where('restaurantId', '==', selectedRestaurant)
        );
      }
      
      // Fetch reservations
      const result = await databaseService.getDocuments('reservations', queryConstraints);
      
      if (result.success) {
        const reservations = result.data;
        
        // Extract hour of day from time field
        const hourCounts = {};
        
        reservations.forEach(res => {
          if (res.time) {
            // Parse time (assuming format like "7:00 PM")
            const timeParts = res.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
            if (timeParts) {
              let hour = parseInt(timeParts[1]);
              const minutes = parseInt(timeParts[2]);
              const period = timeParts[3].toUpperCase();
              
              // Convert to 24-hour format
              if (period === 'PM' && hour < 12) hour += 12;
              if (period === 'AM' && hour === 12) hour = 0;
              
              // Round to nearest hour for simplicity
              if (minutes >= 30) hour = (hour + 1) % 24;
              
              hourCounts[hour] = (hourCounts[hour] || 0) + 1;
            }
          }
        });
        
        // Convert to array and sort by hour
        const popularTimes = [];
        for (let i = 0; i < 24; i++) {
          popularTimes.push({
            hour: i,
            count: hourCounts[i] || 0,
            label: formatHour(i)
          });
        }
        
        setPopularTimes(popularTimes);
      }
    } catch (error) {
      console.log('Error fetching popular times:', error);
    }
  };

  // Generate time series data for reservations
 
const generateTimeSeriesData = (reservations, timeRange) => {
  const data = {
    labels: [],
    datasets: [
      {
        data: [],
        color: (opacity = 1) => `rgba(26, 26, 26, ${opacity})`,
        strokeWidth: 2
      }
    ]
  };
  
  if (!reservations.length) return data;
  
  // Generate date labels and counts based on time range
  const dateFormat = new Intl.DateTimeFormat('en-US', { 
    month: 'short', 
    day: 'numeric'
  });
  
  const monthFormat = new Intl.DateTimeFormat('en-US', { month: 'short' });
  
  const counts = {};
  const now = new Date();
  let labels = [];
  
  try {
    if (timeRange === 'week') {
      // Last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateString = dateFormat.format(date);
        labels.push(dateString);
        counts[dateString] = 0;
      }
      
      // Count reservations per day
      reservations.forEach(res => {
        if (res.date) {
          try {
            // Handle different date formats
            let resDate;
            
            if (typeof res.date === 'string') {
              resDate = new Date(res.date);
            } else if (res.date.toDate) {
              // Firestore timestamp
              resDate = res.date.toDate();
            } else {
              // Try as-is
              resDate = new Date(res.date);
            }
            
            // Skip invalid dates
            if (isNaN(resDate.getTime())) {
              console.log('Skipping reservation with invalid date:', res.id);
              return;
            }
            
            const dateString = dateFormat.format(resDate);
            if (counts[dateString] !== undefined) {
              counts[dateString]++;
            }
          } catch (err) {
            console.log('Error processing reservation date:', err);
          }
        }
      });
    } else if (timeRange === 'month') {
      // Last 4 weeks (28 days)
      for (let i = 0; i < 4; i++) {
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - (i * 7 + 6));
        const weekEnd = new Date(now);
        weekEnd.setDate(weekEnd.getDate() - (i * 7));
        
        const label = `${dateFormat.format(weekStart)} - ${dateFormat.format(weekEnd)}`;
        labels.unshift(label.replace(' - ', '\n'));
        counts[label] = 0;
      }
      
      // Count reservations per week
      reservations.forEach(res => {
        if (res.date) {
          try {
            // Handle different date formats
            let resDate;
            
            if (typeof res.date === 'string') {
              resDate = new Date(res.date);
            } else if (res.date.toDate) {
              // Firestore timestamp
              resDate = res.date.toDate();
            } else {
              // Try as-is
              resDate = new Date(res.date);
            }
            
            // Skip invalid dates
            if (isNaN(resDate.getTime())) {
              console.log('Skipping reservation with invalid date:', res.id);
              return;
            }
            
            const daysAgo = Math.floor((now - resDate) / (1000 * 60 * 60 * 24));
            if (daysAgo < 0 || daysAgo >= 28) return; // Skip if outside our date range
            
            const weekIndex = Math.min(3, Math.floor(daysAgo / 7));
            
            const weekStart = new Date(now);
            weekStart.setDate(weekStart.getDate() - (weekIndex * 7 + 6));
            const weekEnd = new Date(now);
            weekEnd.setDate(weekEnd.getDate() - (weekIndex * 7));
            
            const label = `${dateFormat.format(weekStart)} - ${dateFormat.format(weekEnd)}`;
            if (counts[label] !== undefined) {
              counts[label]++;
            }
          } catch (err) {
            console.log('Error processing reservation date for weekly chart:', err);
          }
        }
      });
    } else if (timeRange === 'year') {
      // Last 12 months
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now);
        date.setMonth(date.getMonth() - i);
        const monthStr = monthFormat.format(date);
        labels.push(monthStr);
        counts[monthStr] = 0;
      }
      
      // Count reservations per month
      reservations.forEach(res => {
        if (res.date) {
          try {
            // Handle different date formats
            let resDate;
            
            if (typeof res.date === 'string') {
              resDate = new Date(res.date);
            } else if (res.date.toDate) {
              // Firestore timestamp
              resDate = res.date.toDate();
            } else {
              // Try as-is
              resDate = new Date(res.date);
            }
            
            // Skip invalid dates
            if (isNaN(resDate.getTime())) {
              console.log('Skipping reservation with invalid date for monthly chart:', res.id);
              return;
            }
            
            const monthStr = monthFormat.format(resDate);
            if (counts[monthStr] !== undefined) {
              counts[monthStr]++;
            }
          } catch (err) {
            console.log('Error processing reservation date for monthly chart:', err);
          }
        }
      });
    }
    
    data.labels = labels;
    data.datasets[0].data = Object.values(counts);
    
    return data;
  } catch (error) {
    console.error('Error generating time series data:', error);
    // Return empty data on error
    return {
      labels: [],
      datasets: [
        {
          data: [],
          color: (opacity = 1) => `rgba(26, 26, 26, ${opacity})`,
          strokeWidth: 2
        }
      ]
    };
  }
};

// Helper: Get start date based on time range
const getStartDateFromTimeRange = (range) => {
  const now = new Date();
  const startDate = new Date(now);
  
  switch (range) {
    case 'week':
      startDate.setDate(now.getDate() - 7);
      break;
    case 'month':
      startDate.setDate(now.getDate() - 30);
      break;
    case 'year':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    default:
      startDate.setDate(now.getDate() - 7);
  }
  
  // Reset hours, minutes, seconds to start of day
  startDate.setHours(0, 0, 0, 0);
  
  console.log(`Start date for ${range}: ${startDate.toISOString()}`);
  return startDate;
};

  // Helper: Format hour for display
  const formatHour = (hour) => {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
  };

  // Helper: Get readable role name
  const getRoleName = (role) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'restaurant_owner': return 'Restaurant Owner';
      case 'customer': return 'Customer';
      default: return role.charAt(0).toUpperCase() + role.slice(1);
    }
  };

  // Helper: Get role color
  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return '#4527A0';
      case 'restaurant_owner': return '#1565C0';
      case 'customer': return '#2E7D32';
      default: return '#757575';
    }
  };

  // Chart configurations
  const chartConfig = {
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    color: (opacity = 1) => `rgba(26, 26, 26, ${opacity})`,
    strokeWidth: 2,
    decimalPlaces: 0,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#ffa726'
    }
  };

  // Adjusted to work within our component context
  const renderReservationChart = () => {
    if (!reservationStats.timeData.labels || reservationStats.timeData.labels.length === 0) {
      return (
        <View style={styles.noDataContainer}>
          <Ionicons name="bar-chart-outline" size={48} color="#ccc" />
          <Text style={styles.noDataText}>No reservation data available</Text>
        </View>
      );
    }
    
    return (
      <LineChart
        data={reservationStats.timeData}
        width={screenWidth - 40}
        height={220}
        chartConfig={chartConfig}
        bezier
        style={styles.chart}
      />
    );
  };

  // Render restaurant popularity chart
  const renderRestaurantChart = () => {
    if (!restaurantStats.length) {
      return (
        <View style={styles.noDataContainer}>
          <Ionicons name="restaurant-outline" size={48} color="#ccc" />
          <Text style={styles.noDataText}>No restaurant data available</Text>
        </View>
      );
    }
    
    const data = {
      labels: restaurantStats.map(r => r.name.length > 12 ? r.name.substring(0, 10) + '...' : r.name),
      datasets: [
        {
          data: restaurantStats.map(r => r.count)
        }
      ]
    };
    
    return (
      <BarChart
        data={data}
        width={screenWidth - 40}
        height={220}
        chartConfig={{
          ...chartConfig,
          barPercentage: 0.7,
        }}
        style={styles.chart}
        verticalLabelRotation={30}
      />
    );
  };

  // Render user distribution pie chart
  const renderUserRolesChart = () => {
    if (!userStats.roles.length) {
      return (
        <View style={styles.noDataContainer}>
          <Ionicons name="people-outline" size={48} color="#ccc" />
          <Text style={styles.noDataText}>No user role data available</Text>
        </View>
      );
    }
    
    const pieData = userStats.roles.map(role => ({
      name: role.name,
      population: role.count,
      color: role.color,
      legendFontColor: '#7F7F7F',
      legendFontSize: 15
    }));
    
    return (
      <PieChart
        data={pieData}
        width={screenWidth - 40}
        height={220}
        chartConfig={chartConfig}
        accessor="population"
        backgroundColor="transparent"
        paddingLeft="15"
        style={styles.chart}
      />
    );
  };

  // Render popular times chart
  const renderPopularTimesChart = () => {
    if (!popularTimes.length) {
      return (
        <View style={styles.noDataContainer}>
          <Ionicons name="time-outline" size={48} color="#ccc" />
          <Text style={styles.noDataText}>No reservation time data available</Text>
        </View>
      );
    }
    
    // Get the 12 busiest hours
    const busyHours = [...popularTimes]
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
    
    const data = {
      labels: busyHours.map(h => h.label),
      datasets: [
        {
          data: busyHours.map(h => h.count)
        }
      ]
    };
    
    return (
      <BarChart
        data={data}
        width={screenWidth - 40}
        height={220}
        chartConfig={{
          ...chartConfig,
          barPercentage: 0.7,
          color: (opacity = 1) => `rgba(21, 101, 192, ${opacity})`,
        }}
        style={styles.chart}
      />
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.headerContainer}>
          <Text style={styles.mainHeading}>Analytics Dashboard</Text>
          <Text style={styles.subheading}>Monitor your restaurant platform performance</Text>
        </View>
        
        {/* Filters */}
        <View style={styles.filtersContainer}>
          {/* Time Range Filter */}
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Time Period:</Text>
            <View style={styles.filterOptions}>
              <TouchableOpacity 
                style={[styles.filterOption, timeRange === 'week' && styles.activeFilter]}
                onPress={() => setTimeRange('week')}
              >
                <Text style={[styles.filterOptionText, timeRange === 'week' && styles.activeFilterText]}>
                  Week
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.filterOption, timeRange === 'month' && styles.activeFilter]}
                onPress={() => setTimeRange('month')}
              >
                <Text style={[styles.filterOptionText, timeRange === 'month' && styles.activeFilterText]}>
                  Month
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.filterOption, timeRange === 'year' && styles.activeFilter]}
                onPress={() => setTimeRange('year')}
              >
                <Text style={[styles.filterOptionText, timeRange === 'year' && styles.activeFilterText]}>
                  Year
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Restaurant Filter */}
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Restaurant:</Text>
            <View style={styles.restaurantSelector}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity 
                  style={[styles.restaurantOption, selectedRestaurant === 'all' && styles.activeRestaurant]}
                  onPress={() => setSelectedRestaurant('all')}
                >
                  <Text style={[styles.restaurantOptionText, selectedRestaurant === 'all' && styles.activeRestaurantText]}>
                    All Restaurants
                  </Text>
                </TouchableOpacity>
                
                {restaurants.map(restaurant => (
                  <TouchableOpacity 
                    key={restaurant.id}
                    style={[styles.restaurantOption, selectedRestaurant === restaurant.id && styles.activeRestaurant]}
                    onPress={() => setSelectedRestaurant(restaurant.id)}
                  >
                    <Text style={[styles.restaurantOptionText, selectedRestaurant === restaurant.id && styles.activeRestaurantText]}>
                      {restaurant.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </View>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1a1a1a" />
            <Text style={styles.loadingText}>Loading analytics data...</Text>
          </View>
        ) : (
          <>
            {/* Stats Overview Cards */}
            <View style={styles.statsCards}>
              <View style={styles.statsCard}>
                <View style={styles.statsCardHeader}>
                  <Ionicons name="calendar-outline" size={24} color="#1a1a1a" />
                  <Text style={styles.statsCardTitle}>Reservations</Text>
                </View>
                <Text style={styles.statsCardValue}>{reservationStats.total}</Text>
                <View style={styles.statsDetail}>
                  <View style={styles.statsDetailItem}>
                    <View style={[styles.statusDot, { backgroundColor: '#4CAF50' }]} />
                    <Text style={styles.statsDetailText}>Confirmed: {reservationStats.confirmed}</Text>
                  </View>
                  <View style={styles.statsDetailItem}>
                    <View style={[styles.statusDot, { backgroundColor: '#FF9800' }]} />
                    <Text style={styles.statsDetailText}>Pending: {reservationStats.pending}</Text>
                  </View>
                  <View style={styles.statsDetailItem}>
                    <View style={[styles.statusDot, { backgroundColor: '#F44336' }]} />
                    <Text style={styles.statsDetailText}>Cancelled: {reservationStats.cancelled}</Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.statsCard}>
                <View style={styles.statsCardHeader}>
                  <Ionicons name="people-outline" size={24} color="#1a1a1a" />
                  <Text style={styles.statsCardTitle}>Users</Text>
                </View>
                <Text style={styles.statsCardValue}>{userStats.total}</Text>
                <View style={styles.statsDetail}>
                  <View style={styles.statsDetailItem}>
                    <View style={[styles.statusDot, { backgroundColor: '#4CAF50' }]} />
                    <Text style={styles.statsDetailText}>Active: {userStats.active}</Text>
                  </View>
                  <View style={styles.statsDetailItem}>
                    <View style={[styles.statusDot, { backgroundColor: '#2196F3' }]} />
                    <Text style={styles.statsDetailText}>New: {userStats.new}</Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.statsCard}>
                <View style={styles.statsCardHeader}>
                  <Ionicons name="restaurant-outline" size={24} color="#1a1a1a" />
                  <Text style={styles.statsCardTitle}>Restaurants</Text>
                </View>
                <Text style={styles.statsCardValue}>{restaurants.length}</Text>
              </View>
            </View>
            
            {/* Charts */}
            <View style={styles.chartsContainer}>
              {/* Reservations Over Time */}
              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>Reservations Over Time</Text>
                {renderReservationChart()}
              </View>
              
              {/* Popular Restaurants */}
              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>
                  {selectedRestaurant === 'all' ? 'Most Popular Restaurants' : 'Restaurant Performance'}
                </Text>
                {renderRestaurantChart()}
              </View>
              
              {/* User Roles Distribution */}
              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>User Role Distribution</Text>
                {renderUserRolesChart()}
              </View>
              
              {/* Popular Reservation Times */}
              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>Most Popular Reservation Times</Text>
                {renderPopularTimesChart()}
              </View>
            </View>
          </>
        )}
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
  filtersContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  filterRow: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
    fontFamily: "System",
  },
  filterOptions: {
    flexDirection: 'row',
  },
  filterOption: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  activeFilter: {
    backgroundColor: '#1a1a1a',
  },
  filterOptionText: {
    fontSize: 14,
    color: '#333333',
    fontFamily: "System",
  },
  activeFilterText: {
    color: '#ffffff',
  },
  restaurantSelector: {
    marginTop: 8,
  },
  restaurantOption: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  activeRestaurant: {
    backgroundColor: '#1a1a1a',
  },
  restaurantOptionText: {
    fontSize: 14,
    color: '#333333',
    fontFamily: "System",
  },
  activeRestaurantText: {
    color: '#ffffff',
  },
  loadingContainer: {
    padding: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#555555',
    marginTop: 16,
    fontFamily: "System",
  },
  statsCards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statsCard: {
    width: '31%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  statsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statsCardTitle: {
    fontSize: 14,
    color: '#333333',
    marginLeft: 8,
    fontFamily: "System",
  },
  statsCardValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
    fontFamily: "System",
  },
  statsDetail: {
    marginTop: 4,
  },
  statsDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statsDetailText: {
    fontSize: 12,
    color: '#555555',
    fontFamily: "System",
  },
  chartsContainer: {
    marginBottom: 30,
  },
  chartCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
    fontFamily: "System",
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  noDataContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 16,
  },
  noDataText: {
    fontSize: 16,
    color: '#555555',
    marginTop: 12,
    fontFamily: "System",
  }
});

export default AdminAnalytics;