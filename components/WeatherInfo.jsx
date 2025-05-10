import React from 'react';
import { View, Text, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const WeatherInfo = ({ weatherData, loading, error }) => {
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#1a1a1a" />
        <Text style={styles.loadingText}>Loading weather forecast...</Text>
      </View>
    );
  }

  if (error || !weatherData) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="cloudy-outline" size={24} color="#999" />
        <Text style={styles.errorText}>Weather info unavailable</Text>
      </View>
    );
  }

  // Extract weather info
  const { main, weather, wind } = weatherData;
  const weatherCondition = weather[0].main;
  const weatherDescription = weather[0].description;
  const temperature = main.temp;
  const feelsLike = main.feels_like;
  const humidity = main.humidity;
  const iconCode = weather[0].icon;
  const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;

  // Get background color based on weather condition
  const getBackgroundColor = () => {
    const condition = weatherCondition.toLowerCase();
    
    if (condition.includes('clear')) {
      return '#f0f9ff'; // Light blue for clear skies
    } else if (condition.includes('cloud')) {
      return '#f8fafc'; // Light gray for cloudy
    } else if (condition.includes('rain') || condition.includes('drizzle')) {
      return '#f1f5f9'; // Slate gray for rain
    } else if (condition.includes('thunderstorm')) {
      return '#eff6ff'; // Blue gray for storms
    } else if (condition.includes('snow')) {
      return '#f8fafc'; // White/gray for snow
    } else {
      return '#f8f8f8'; // Default gray
    }
  };

  // Helper function to determine appropriate icon
  const getWeatherIcon = () => {
    const condition = weatherCondition.toLowerCase();
    
    if (condition.includes('clear')) {
      return <Ionicons name="sunny" size={36} color="#FFD700" />;
    } else if (condition.includes('cloud')) {
      return <Ionicons name="cloudy" size={36} color="#708090" />;
    } else if (condition.includes('rain') || condition.includes('drizzle')) {
      return <Ionicons name="rainy" size={36} color="#4682B4" />;
    } else if (condition.includes('thunderstorm')) {
      return <Ionicons name="thunderstorm" size={36} color="#483D8B" />;
    } else if (condition.includes('snow')) {
      return <Ionicons name="snow" size={36} color="#B0C4DE" />;
    } else if (condition.includes('mist') || condition.includes('fog')) {
      return <Ionicons name="water" size={36} color="#B0C4DE" />;
    } else {
      return <Ionicons name="cloudy" size={36} color="#708090" />;
    }
  };

  // Helper function to format temperature with unit
  const formatTemperature = (temp) => {
    return `${Math.round(temp)}°C`;
  };

  return (
    <View style={[styles.container, { backgroundColor: getBackgroundColor() }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Weather Forecast</Text>
      </View>
      
      <View style={styles.weatherContent}>
        <View style={styles.mainInfo}>
          <View style={styles.iconContainer}>
            {getWeatherIcon()}
          </View>
          <View style={styles.temperatureContainer}>
            <Text style={styles.temperature}>{formatTemperature(temperature)}</Text>
            <Text style={styles.feelsLike}>Feels like {formatTemperature(feelsLike)}</Text>
            <Text style={styles.conditionText}>{weatherDescription}</Text>
          </View>
        </View>
        
        <View style={styles.detailsContainer}>
          <View style={styles.detailItem}>
            <Ionicons name="water-outline" size={16} color="#666" />
            <Text style={styles.detailText}>{humidity}% humidity</Text>
          </View>
          
          {wind && (
            <View style={styles.detailItem}>
              <Ionicons name="speedometer-outline" size={16} color="#666" />
              <Text style={styles.detailText}>{Math.round(wind.speed)} m/s wind</Text>
            </View>
          )}
        </View>
        
        {weatherData.advice && (
          <View style={styles.adviceContainer}>
            <Ionicons name="information-circle-outline" size={18} color="#1a1a1a" />
            <Text style={styles.adviceText}>{weatherData.advice}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  weatherContent: {
    alignItems: 'flex-start',
  },
  mainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    width: '100%',
  },
  iconContainer: {
    marginRight: 16,
  },
  temperatureContainer: {
    flex: 1,
  },
  temperature: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  feelsLike: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  conditionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#444',
    textTransform: 'capitalize',
  },
  detailsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 15,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 5,
  },
  adviceContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    padding: 10,
    borderRadius: 8,
    marginTop: 5,
    width: '100%',
  },
  adviceText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  errorContainer: {
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#999',
    marginLeft: 8,
  },
});

export default WeatherInfo;