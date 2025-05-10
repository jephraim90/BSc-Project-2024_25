import axios from 'axios';
import { Platform } from 'react-native';
const API_KEY = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY;
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

class OpenWeatherService {
   async getCurrentWeather(lat, lon) {
    try {
      console.log('Fetching current weather for coordinates:', { lat, lon });
      const response = await axios.get(`${BASE_URL}/weather`, {
        params: {
          lat,
          lon,
          appid: API_KEY,
          units: 'metric', // Use metric units (Celsius)
        },
      });
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.log('Error fetching current weather:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch weather data',
      };
    }
  }

 
  async getForecast(lat, lon) {
    try {
      
      const response = await axios.get(`${BASE_URL}/forecast`, {
        params: {
          lat,
          lon,
          appid: API_KEY,
          units: 'metric', // Use metric units (Celsius)
        },
      });
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      
      return {
        success: false,
        error: error.message || 'Failed to fetch forecast data',
      };
    }
  }


  async getWeatherForDateTime(lat, lon, date) {
    try {
      
      
      // Check if the date is in the past (compared to now)
      const now = new Date();
      if (date < now) {
       
        return await this.getCurrentWeather(lat, lon);
      }
      
      // Check if the date is too far in the future (beyond 5-day forecast)
      const fiveDaysFromNow = new Date();
      fiveDaysFromNow.setDate(now.getDate() + 5);
      
      if (date > fiveDaysFromNow) {
        
        const currentWeather = await this.getCurrentWeather(lat, lon);
        
        if (currentWeather.success) {
          currentWeather.data.advice = 'This forecast is for the current conditions, as the requested date is too far in the future.';
        }
        
        return currentWeather;
      }
      
      // Date is within forecast range, get the 5-day forecast
      const forecastResponse = await this.getForecast(lat, lon);
      
      if (!forecastResponse.success) {
        throw new Error(forecastResponse.error);
      }
      
      const forecast = forecastResponse.data;
      const targetTimestamp = date.getTime();
      
      // Find the closest forecast time
      let closestForecast = null;
      let minTimeDiff = Infinity;
      
      
      
      for (const item of forecast.list) {
        const forecastTime = item.dt * 1000; // Convert to milliseconds
        const forecastDate = new Date(forecastTime);
        const timeDiff = Math.abs(forecastTime - targetTimestamp);
        
        
        
        if (timeDiff < minTimeDiff) {
          minTimeDiff = timeDiff;
          closestForecast = item;
        }
      }
      
      if (!closestForecast) {
       
        return await this.getCurrentWeather(lat, lon);
      }
      
      // If the closest time is more than 6 hours from the requested time, add a note
      const hoursAway = Math.round(minTimeDiff / (1000 * 60 * 60));
      if (hoursAway > 6) {
        closestForecast.advice = `This forecast is for a time ${hoursAway} hours from your requested time.`;
      }
      
      // Format the response
      return {
        success: true,
        data: {
          ...closestForecast,
          city: forecast.city,
        },
      };
    } catch (error) {
      
      return {
        success: false,
        error: error.message || 'Failed to get weather forecast',
      };
    }
  }


  getWeatherAdvice(weatherData) {
    if (!weatherData || !weatherData.main || !weatherData.weather || !weatherData.weather[0]) {
      return null;
    }
    
    const temp = weatherData.main.temp;
    const conditions = weatherData.weather[0].main.toLowerCase();
    const description = weatherData.weather[0].description.toLowerCase();
    const windSpeed = weatherData.wind?.speed || 0;
    const humidity = weatherData.main.humidity || 0;
    const time = weatherData.dt ? new Date(weatherData.dt * 1000) : new Date();
    const isNight = time.getHours() >= 20 || time.getHours() <= 6;
    
    // Generate appropriate advice based on conditions
    if (conditions.includes('thunderstorm')) {
      return 'Thunderstorms expected! Consider planning indoor activities at the restaurant.';
    } else if (conditions.includes('drizzle') || conditions.includes('rain')) {
      if (description.includes('light')) {
        return 'Light rain expected. You might want to bring an umbrella.';
      } else if (description.includes('heavy')) {
        return 'Heavy rain expected. Definitely bring an umbrella and consider waterproof footwear.';
      } else {
        return 'Rain is expected during your reservation. Don\'t forget your umbrella!';
      }
    } else if (conditions.includes('snow')) {
      if (description.includes('light')) {
        return 'Light snow expected. Dress warmly and wear appropriate footwear.';
      } else if (description.includes('heavy')) {
        return 'Heavy snow expected. Dress warmly, wear snow boots, and allow extra travel time.';
      } else {
        return 'Snow is expected. Dress warmly and wear appropriate footwear.';
      }
    } else if (conditions.includes('mist') || conditions.includes('fog') || conditions.includes('haze')) {
      return 'Foggy or misty conditions expected. Take care when traveling to the restaurant.';
    } else if (conditions.includes('clear')) {
      if (isNight) {
        return 'Clear night expected. It might be chilly, so consider bringing a jacket.';
      } else if (temp > 25) {
        return 'Clear and warm weather expected. Perfect for outdoor seating if available!';
      } else if (temp < 10) {
        return 'Clear but cool weather expected. Bring a jacket if you\'re planning to stay late.';
      } else {
        return 'Clear weather expected. Perfect conditions for your dining experience!';
      }
    } else if (conditions.includes('cloud')) {
      if (temp > 25) {
        return 'Cloudy but warm weather expected. Still nice for outdoor dining if available.';
      } else if (temp < 10) {
        return 'Cloudy and cool weather expected. Bring a jacket for your journey.';
      } else {
        return 'Partly cloudy weather expected for your reservation time.';
      }
    } else if (windSpeed > 10) {
      return 'Windy conditions expected. Might not be ideal for outdoor seating.';
    } else if (temp > 30) {
      return 'Very hot weather expected. Dress lightly and stay hydrated!';
    } else if (temp > 25) {
      return 'Warm weather expected. Great for a refreshing meal out!';
    } else if (temp < 0) {
      return 'Freezing temperatures expected. Dress very warmly with hat and gloves.';
    } else if (temp < 10) {
      return 'Cool weather expected. Bring a jacket or coat for your journey.';
    } else {
      return 'Weather conditions look moderate. Enjoy your dining experience!';
    }
  }

  
  getWeatherIconUrl(iconCode) {
    return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
  }

  
  convertToFahrenheit(celsius) {
    return (celsius * 9/5) + 32;
  }


  formatTemperature(celsius) {
    // Check if user is likely in the US
    const isUS = Platform.OS === 'ios' 
      ? NSLocale.currentLocale().countryCode === 'US' 
      : /^en[-_]US/.test(Intl.DateTimeFormat().resolvedOptions().locale);
    
    if (isUS) {
      const fahrenheit = this.convertToFahrenheit(celsius);
      return `${Math.round(fahrenheit)}°F`;
    }
    
    return `${Math.round(celsius)}°C`;
  }

 
  async testWeatherService(lat, lon) {
   
    
    try {
      // Test current weather
      const currentWeather = await this.getCurrentWeather(lat, lon);
      
      
      // Test forecast
      const forecast = await this.getForecast(lat, lon);
      console.log('Forecast available times:', 
        forecast.success ? forecast.data.list.map(item => new Date(item.dt * 1000)) : 'Failed');
      
      // Test for today
      const today = new Date();
      today.setHours(today.getHours() + 3); // 3 hours from now
      const todayForecast = await this.getWeatherForDateTime(lat, lon, today);
      console.log('Today forecast result:', todayForecast);
      
      // Test for future date
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 2); // 2 days from now
      futureDate.setHours(19, 0, 0, 0); // 7 PM
      const futureForecast = await this.getWeatherForDateTime(lat, lon, futureDate);
      console.log('Future forecast result:', futureForecast);
      
      return {
        currentWeather,
        todayForecast,
        futureForecast
      };
    } catch (error) {
      console.log('Error in weather service test:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new OpenWeatherService();