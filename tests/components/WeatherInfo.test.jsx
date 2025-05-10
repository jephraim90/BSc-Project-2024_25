import React from 'react';
import { render } from '@testing-library/react-native';
import WeatherInfo from '../../components/WeatherInfo';

// Mock the icon components
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialCommunityIcons: 'MaterialCommunityIcons'
}));

describe('WeatherInfo Component', () => {
  // Sample weather data for testing different conditions
  const mockClearWeather = {
    main: {
      temp: 25.5,
      feels_like: 26.2,
      humidity: 45
    },
    weather: [
      {
        main: 'Clear',
        description: 'clear sky',
        icon: '01d'
      }
    ],
    wind: {
      speed: 3.6
    }
  };

  const mockRainyWeather = {
    main: {
      temp: 18.3,
      feels_like: 17.5,
      humidity: 85
    },
    weather: [
      {
        main: 'Rain',
        description: 'light rain',
        icon: '10d'
      }
    ],
    wind: {
      speed: 5.2
    },
    advice: 'Take an umbrella with you today'
  };

  const mockCloudyWeather = {
    main: {
      temp: 22.1,
      feels_like: 22.8,
      humidity: 60
    },
    weather: [
      {
        main: 'Clouds',
        description: 'scattered clouds',
        icon: '03d'
      }
    ],
    wind: {
      speed: 2.1
    }
  };

  test('renders loading state correctly', () => {
    const { getByText } = render(<WeatherInfo loading={true} />);
    expect(getByText('Loading weather forecast...')).toBeTruthy();
  });

  test('renders error state when error prop is true', () => {
    const { getByText } = render(<WeatherInfo error={true} />);
    expect(getByText('Weather info unavailable')).toBeTruthy();
  });

  test('renders error state when no weatherData is provided', () => {
    const { getByText } = render(<WeatherInfo />);
    expect(getByText('Weather info unavailable')).toBeTruthy();
  });

  test('renders clear weather data correctly', () => {
    const { getByText } = render(<WeatherInfo weatherData={mockClearWeather} />);
    
    // Check for main elements
    expect(getByText('Weather Forecast')).toBeTruthy();
    expect(getByText('26°C')).toBeTruthy(); // Rounds 25.5 to 26
    expect(getByText('Feels like 26°C')).toBeTruthy();
    expect(getByText('clear sky')).toBeTruthy();
    expect(getByText('45% humidity')).toBeTruthy();
    expect(getByText('4 m/s wind')).toBeTruthy(); // Rounds 3.6 to 4
  });

  test('renders rainy weather data with advice correctly', () => {
    const { getByText } = render(<WeatherInfo weatherData={mockRainyWeather} />);
    
    expect(getByText('18°C')).toBeTruthy();
    expect(getByText('light rain')).toBeTruthy();
    expect(getByText('85% humidity')).toBeTruthy();
    expect(getByText('5 m/s wind')).toBeTruthy();
    expect(getByText('Take an umbrella with you today')).toBeTruthy();
  });

  test('renders cloudy weather data correctly', () => {
    const { getByText } = render(<WeatherInfo weatherData={mockCloudyWeather} />);
    
    expect(getByText('22°C')).toBeTruthy();
    expect(getByText('scattered clouds')).toBeTruthy();
    expect(getByText('60% humidity')).toBeTruthy();
    expect(getByText('2 m/s wind')).toBeTruthy();
  });

  test('handles missing wind data gracefully', () => {
    // Create weather data without wind information
    const weatherWithoutWind = {
      ...mockClearWeather,
      wind: undefined
    };
    
    const { getByText, queryByText } = render(<WeatherInfo weatherData={weatherWithoutWind} />);
    
    // Should still render temperature and humidity
    expect(getByText('26°C')).toBeTruthy();
    expect(getByText('45% humidity')).toBeTruthy();
    
    // Should not render wind info
    expect(queryByText(/wind/)).toBeNull();
  });
  
  test('renders weather title correctly', () => {
    const { getByText } = render(<WeatherInfo weatherData={mockClearWeather} />);
    expect(getByText('Weather Forecast')).toBeTruthy();
  });
  
  test('formats temperatures as integers with degree symbol', () => {
    // Test with decimal temperature
    const { getByText } = render(<WeatherInfo weatherData={mockClearWeather} />);
    expect(getByText('26°C')).toBeTruthy(); // Should round 25.5 to 26
    expect(getByText('Feels like 26°C')).toBeTruthy(); // Should round 26.2 to 26
  });
});