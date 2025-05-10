import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  SafeAreaView,
  Share,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  Switch,
} from "react-native";
import React, { useState, useEffect, useCallback } from "react";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import RestaurantService from "@/services/restaurantService";
import RestaurantAPI from "@/services/RestaurantAPI";
import OpenWeatherService from "@/services/OpenWeatherService";
import GeocodingService from "@/services/GeocodingService";
import WeatherInfo from "@/components/WeatherInfo";
import { useAuth } from "@/contexts/AuthContext";
import databaseService from "@/services/databaseService";
import { debounce } from "lodash";
import notificationService from "@/services/notificationService";
import { handleReservationCreation } from "@/services/reservationHandler";

const ReservationCP = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams(); // Get restaurant ID from URL params
  const { user, expoPushToken } = useAuth(); // Get current user and push token from auth context
  // State for restaurant data
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Reservation state
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [guests, setGuests] = useState("2");
  const [specialRequests, setSpecialRequests] = useState("");
  const [availableTimes, setAvailableTimes] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [menuItems, setMenuItems] = useState({});
  const [selectedMenuItems, setSelectedMenuItems] = useState([]);
  const [availableTables, setAvailableTables] = useState([]);
  const [selectedTableIds, setSelectedTableIds] = useState([]);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [showSeatingModal, setShowSeatingModal] = useState(false);
  const [currentMenuCategory, setCurrentMenuCategory] = useState(null);
  const [restaurantStatus, setRestaurantStatus] = useState(null);
  const [menuCategories, setMenuCategories] = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [loadingSeating, setLoadingSeating] = useState(false);
  // Weather state
  const [weatherData, setWeatherData] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState(null);
  const [restaurantCoords, setRestaurantCoords] = useState(null);
  const [weatherFetchedForDateTime, setWeatherFetchedForDateTime] =
    useState("");
  const [selectedDateObject, setSelectedDateObject] = useState(null);
  const [loadingTimes, setLoadingTimes] = useState(false);
  // Notification preferences
  const [useServerNotifications, setUseServerNotifications] = useState(true); // Default to server notifications
  // Push token status
  const [pushTokenStatus, setPushTokenStatus] = useState({
    available: false,
    checking: true,
    error: null,
  });

  const handleDateChange = (newDate) => {
    setSelectedDateObject(newDate); // Store the Date object
    setDate(newDate ? newDate.toISOString().split("T")[0] : ""); // Format for API
  };

  // Check if push notifications are available
  useEffect(() => {
    const checkPushStatus = async () => {
      try {
        setPushTokenStatus((prev) => ({ ...prev, checking: true }));

        // If token is already available in auth context
        if (expoPushToken) {
          setPushTokenStatus({
            available: true,
            checking: false,
            error: null,
          });
          return;
        }

        // Try to register
        const result = await notificationService.registerForPushNotifications();

        setPushTokenStatus({
          available: result.success,
          checking: false,
          error: result.error || null,
        });
      } catch (error) {
        setPushTokenStatus({
          available: false,
          checking: false,
          error: error.message,
        });
      }
    };

    checkPushStatus();
  }, [expoPushToken]);

  // Set default notification preference based on push token availability
  useEffect(() => {
    if (!pushTokenStatus.checking) {
      setUseServerNotifications(!pushTokenStatus.available);
    }
  }, [pushTokenStatus]);

  const generateAvailableDates = () => {
    const dates = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set time to midnight
    
    // Get timezone offset in minutes
    const timezoneOffsetMinutes = today.getTimezoneOffset();
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      let label;
      if (i === 0) {
        label = "Today";
      } else if (i === 1) {
        label = "Tomorrow";
      } else {
        label = date.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        });
      }
      
      // Format date as ISO string but preserve the local date
      // by explicitly formatting year, month, day without timezone conversion
      const localYear = date.getFullYear();
      const localMonth = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
      const localDay = String(date.getDate()).padStart(2, '0');
      const localDateString = `${localYear}-${localMonth}-${localDay}`;
      
      dates.push({
        label,
        date,
        value: localDateString,
        timezoneOffset: timezoneOffsetMinutes // Include timezone offset for server
      });
      
    }
    return dates;
  };

  // Available dates
  const availableDates = generateAvailableDates();
  // Check if push notifications are available
  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 2;

    const checkPushStatus = async () => {
      try {
        if (!isMounted) return;
        setPushTokenStatus((prev) => ({ ...prev, checking: true }));

        // If token is already available in auth context
        if (expoPushToken) {
          console.log("Using existing token from auth context:", expoPushToken);
          if (isMounted) {
            setPushTokenStatus({
              available: true,
              checking: false,
              error: null,
            });
          }
          return;
        }

        // Clear any potential stuck global state
        if (global._expoPushTokenRegistrationInProgress && retryCount === 0) {
          console.log("Resetting any stuck registration state");
          global._expoPushTokenRegistrationInProgress = false;
          global._expoPushTokenRegistrationStartTime = null;
        }

        // Try to register
        console.log(
          `Attempting to register for push notifications (attempt ${
            retryCount + 1
          }/${maxRetries + 1})`
        );
        const result = await notificationService.registerForPushNotifications();
        console.log("Registration result:", result);

        if (!isMounted) return;

        if (result.success) {
          setPushTokenStatus({
            available: true,
            checking: false,
            error: null,
            token: result.token,
          });
        } else if (
          result.error === "Registration already in progress" &&
          retryCount < maxRetries
        ) {
          // Wait and retry if registration is in progress
          retryCount++;
          console.log(
            `Registration in progress, retrying in 2 seconds (attempt ${retryCount}/${maxRetries})`
          );
          setTimeout(checkPushStatus, 2000);
        } else {
          setPushTokenStatus({
            available: false,
            checking: false,
            error: result.error || "Failed to register for notifications",
          });
        }
      } catch (error) {
        console.error("Error in push token registration:", error);
        if (isMounted) {
          setPushTokenStatus({
            available: false,
            checking: false,
            error: error.message,
          });
        }
      }
    };

    checkPushStatus();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [expoPushToken]); // Only depend on expoPushToken
  // Fetch restaurant data and status
  const fetchRestaurantData = useCallback(async () => {
    // Use useCallback
    try {
      setLoading(true);
      if (!id) {
        throw new Error("Restaurant ID is required");
      }
      const restaurantData = await RestaurantService.getRestaurantById(id);
      if (!restaurantData || !restaurantData.data) {
        throw new Error("Restaurant not found");
      }
      setRestaurant(restaurantData.data); // Access the .data property
    } catch (err) {
      console.log("Error fetching restaurant:", err);
      setError(err.message || "Failed to load restaurant");
    } finally {
      setLoading(false);
    }
  }, [id]);
  useEffect(() => {
    fetchRestaurantData();
  }, [fetchRestaurantData]);

  const debouncedCheckAvailability = useCallback(
    debounce(async (restaurantId, selectedDate, partySize) => {
      if (!restaurantId || !selectedDate) return;
      try {
        setLoadingTimes(true);
        const dateObj = availableDates.find((d) => d.label === selectedDate);
        const formattedDate =
          dateObj?.value || new Date().toISOString().split("T")[0];

        const result = await RestaurantAPI.checkAvailability(
          restaurantId,
          formattedDate,
          parseInt(partySize)
        );

        if (result.success) {
          setAvailableTimes(result.data);
          if (time && !result.data.includes(time)) {
            setTime("");
          }
        } else {
          console.log("Error checking availability:", result.error);
          setAvailableTimes([]);
        }
      } catch (err) {
        console.log("Error in availability check:", err);
        setAvailableTimes([]);
      } finally {
        setLoadingTimes(false);
      }
    }, 500),
    [guests, availableDates, setAvailableTimes, setTime]
  );

  useEffect(() => {
    if (restaurant && selectedDateObject) {
      // Use selectedDateObject
      debouncedCheckAvailability(restaurant.id, date, parseInt(guests));
    }
  }, [restaurant, selectedDateObject, guests, debouncedCheckAvailability]);

  // Get restaurant coordinates when restaurant data is loaded
  useEffect(() => {
    const getRestaurantCoordinates = async () => {
      if (!restaurant) return;

      try {
        const result = await GeocodingService.getRestaurantCoordinates(
          restaurant
        );
        if (result.success) {
          setRestaurantCoords(result.data);
        } else {
          console.log("Failed to get restaurant coordinates:", result.error);
        }
      } catch (err) {
        console.log("Error getting restaurant coordinates:", err);
      }
    };

    getRestaurantCoordinates();
  }, [restaurant]);

  // Check availability when date or party size changes
  const checkAvailability = useCallback(
    debounce(async (restaurantData, selectedDate, partySize) => {
      if (!restaurantData || !selectedDate) return;
      try {
        setLoadingTimes(true);
        const dateObj = availableDates.find((d) => d.label === selectedDate);
        const formattedDate =
          dateObj?.value || new Date().toISOString().split("T")[0];

        const result = await RestaurantAPI.checkAvailability(
          restaurantData.id,
          formattedDate,
          parseInt(partySize)
        );

        if (result.success) {
          setAvailableTimes(result.data);
          // Clear selected time if it's no longer available
          if (time && !result.data.includes(time)) {
            setTime("");
          }
        } else {
          console.log("Error checking availability:", result.error);
          setAvailableTimes([]);
        }
      } catch (err) {
        console.log("Error in availability check:", err);
        setAvailableTimes([]);
      } finally {
        setLoadingTimes(false);
      }
    }, 500),
    [guests, setAvailableTimes, setTime, setLoadingTimes]
  );

  // Update availability when date or party size changes
  useEffect(() => {
    if (restaurant && date) {
      checkAvailability(restaurant, date, guests);
    }
  }, [date, guests, restaurant, checkAvailability]);

  // Fetch weather forecast when date and time are selected
  const fetchWeatherForecast = useCallback(async () => {
    if (!restaurantCoords || !date || !time) return;

    try {
      setWeatherLoading(true);
      setWeatherError(null);

      // Get date object from the selected date
      const dateObj = availableDates.find((d) => d.label === date)?.date;
      if (!dateObj) return;

      // Parse time (assuming format like "7:00 PM")
      const timeMatch = time.match(/(\d+):(\d+)\s*(AM|PM)?/i);
      if (!timeMatch) return;

      const [_, hourStr, minuteStr, ampm] = timeMatch;
      let hours = parseInt(hourStr);
      const minutes = parseInt(minuteStr);

      // Convert to 24-hour format if PM
      if (ampm && ampm.toUpperCase() === "PM" && hours < 12) {
        hours += 12;
      } else if (ampm && ampm.toUpperCase() === "AM" && hours === 12) {
        hours = 0;
      }

      // Create date object for forecast time
      const forecastDate = new Date(dateObj);
      forecastDate.setHours(hours, minutes, 0, 0);

      // Fetch weather forecast
      const { lat, lon } = restaurantCoords;
      const result = await OpenWeatherService.getWeatherForDateTime(
        lat,
        lon,
        forecastDate
      );

      if (result.success) {
        // Add weather advice
        const weatherWithAdvice = {
          ...result.data,
          advice: OpenWeatherService.getWeatherAdvice(result.data),
        };

        setWeatherData(weatherWithAdvice);
      } else {
        throw new Error(result.error || "Failed to fetch weather data");
      }
    } catch (err) {
      console.log("Error fetching weather forecast:", err);
      setWeatherError(err.message || "Failed to fetch weather data");
    } finally {
      setWeatherLoading(false);
    }
  }, [restaurantCoords, date, time]);

  // Update weather when date, time, or coordinates change
  useEffect(() => {
    if (restaurantCoords && date && time) {
      // Create a unique key for this date and time combination
      const dateTimeKey = `${date}-${time}`;

      // Only fetch if we haven't already fetched for this combination
      if (dateTimeKey !== weatherFetchedForDateTime) {
        fetchWeatherForecast();
        setWeatherFetchedForDateTime(dateTimeKey);
      }
    } else {
      // Clear weather data if required data is missing
      setWeatherData(null);
    }
  }, [
    date,
    time,
    restaurantCoords,
    fetchWeatherForecast,
    weatherFetchedForDateTime,
  ]);

  const fetchMenuItems = async () => {
    if (!restaurant) return;
    try {
      setLoadingMenu(true);
      const result = await RestaurantAPI.getRestaurantMenu(restaurant.id);

      if (result.success) {
        setMenuItems(result.data);
        setMenuCategories(Object.keys(result.data));
        if (Object.keys(result.data).length > 0) {
          setCurrentMenuCategory(Object.keys(result.data)[0]);
        }
      } else {
        console.log("Error fetching menu:", result.error);
      }
    } catch (err) {
      console.log("Error fetching menu items:", err);
    } finally {
      setLoadingMenu(false);
    }
  };
  // Fetch available tables when date and time are selected
  const fetchAvailableTables = async () => {
    if (!restaurant || !date || !time) return;
    try {
      setLoadingSeating(true);

      const dateObj = availableDates.find((d) => d.label === date);
      const formattedDate =
        dateObj?.value || new Date().toISOString().split("T")[0];

      const result = await RestaurantAPI.getSeatingAvailability(
        restaurant.id,
        formattedDate,
        time,
        parseInt(guests)
      );

      if (result.success) {
        setAvailableTables(result.data.availableTables);
      } else {
        setAvailableTables([]);
        console.log("Error fetching seating:", result.error);
      }
    } catch (err) {
      console.log("Error fetching available tables:", err);
      setAvailableTables([]);
    } finally {
      setLoadingSeating(false);
    }
  };
  // Toggle selection of a menu item
  const toggleMenuItem = (item) => {
    setSelectedMenuItems((prevItems) => {
      const exists = prevItems.find((i) => i.id === item.id);
      if (exists) {
        // Remove item
        return prevItems.filter((i) => i.id !== item.id);
      } else {
        // Add item
        return [...prevItems, { ...item, quantity: 1 }];
      }
    });
  };

  // Update quantity of a selected menu item
  const updateItemQuantity = (itemId, quantity) => {
    setSelectedMenuItems((prevItems) =>
      prevItems.map((item) =>
        item.id === itemId ? { ...item, quantity: Math.max(1, quantity) } : item
      )
    );
  };

  // Toggle selection of a table
  const toggleTable = (tableId) => {
    setSelectedTableIds((prevIds) => {
      if (prevIds.includes(tableId)) {
        return prevIds.filter((id) => id !== tableId);
      } else {
        return [...prevIds, tableId];
      }
    });
  };

  // Handle share reservation
  const handleShare = async () => {
    if (!restaurant) return;

    try {
      const result = await Share.share({
        message: `I'm going to ${restaurant.name} on ${date} at ${time} for ${guests} people! Join me!`,
        title: "My Reservation at " + restaurant.name,
      });

      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          console.log("Shared with activity type of: " + result.activityType);
        } else {
          console.log("Shared");
        }
      } else if (result.action === Share.dismissedAction) {
        console.log("Share dismissed");
      }
    } catch (error) {
      console.log(error.message);
    }
  };

  // Handle notification permission check
  const checkNotificationPermission = async () => {
    // Skip for web platform
    if (Platform.OS === "web") {
      return true;
    }

    // Check if we have a valid Expo push token
    if (!pushTokenStatus.available && !pushTokenStatus.checking) {
      // If no token and server notifications are disabled, show warning
      if (!useServerNotifications) {
        showPlatformAlert(
          "Notification Permission Required",
          "You've chosen to receive notifications on your device, but notification permissions haven't been granted. Would you like to use server-side notifications instead?",
          [
            {
              text: "Use Server Notifications",
              onPress: () => setUseServerNotifications(true),
            },
            {
              text: "Try Again",
              onPress: async () => {
                const result =
                  await notificationService.registerForPushNotifications();
                if (result.success) {
                  setPushTokenStatus({
                    available: true,
                    checking: false,
                    error: null,
                  });
                } else {
                  showPlatformAlert(
                    "Permission Denied",
                    "Notification permission was denied. Using server notifications instead.",
                    [
                      {
                        text: "OK",
                        onPress: () => setUseServerNotifications(true),
                      },
                    ]
                  );
                }
              },
            },
          ]
        );
        return false;
      }
    }

    return true;
  };

  // Handle reservation submission
  const handleReserve = async () => {
    console.log("handleReserve function called");
    console.log("The date is:", date);
    if (!restaurant || !date || !time || !user) {
      showPlatformAlert("Error", "Please fill in all required fields");
      return;
    }

    // Check notification permissions if using client-side notifications
    if (!useServerNotifications) {
      const permissionGranted = await checkNotificationPermission();
      if (!permissionGranted) {
        // Don't proceed - the permission check function will handle showing alerts
        return;
      }
    }

    try {
      setSubmitting(true);

      // Format date for storage
// First find the date object from availableDates
const selectedDateItem = availableDates.find((d) => d.label === date);
const selectedDateObj = selectedDateItem?.date;

// Make sure we have a valid date object
if (!selectedDateObj) {
  console.error("No valid date selected");
  return; // or handle this error appropriately
}

// Now format it with the local date
const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formattedDate = formatLocalDate(selectedDateObj);
console.log("Formatted local date:", formattedDate);

      // Create reservation data
      const reservationData = {
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        userId: user.uid,
        userName: user.displayName || "Guest",
        userEmail: user.email,
        date: formattedDate,
        time,
        guests: parseInt(guests),
        specialRequests: specialRequests.trim() || null,
        tableIds: selectedTableIds.length > 0 ? selectedTableIds : null,
        menuSelections:
          selectedMenuItems.length > 0
            ? selectedMenuItems.map((item) => ({
                id: item.id,
                name: item.name,
                quantity: item.quantity,
                specialInstructions: item.specialInstructions || null,
              }))
            : null,
        status: "confirmed",
        createdAt: new Date().toISOString(),
        reminderSent: false,
      };

      // Use the centralized handler
      const result = await handleReservationCreation(
        reservationData,
        useServerNotifications
      );

      if (result.success) {
        // Navigate to confirmation page
        router.push({
          pathname: "/reservation/confirmation",
          params: {
            reservationId: result.id,
            restaurantName: restaurant.name,
            date: date,
            time: time,
            guests: guests,
            useServerNotifications: useServerNotifications ? "true" : "false",
          },
        });
      } else {
        throw new Error(result.error || "Failed to create reservation");
      }
    } catch (err) {
      console.log("Error creating reservation:", err);
      showPlatformAlert(
        "Error",
        err.message || "Failed to create reservation. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Show menu modal and fetch menu items if not already loaded
  const handleShowMenuModal = () => {
    if (Object.keys(menuItems).length === 0) {
      fetchMenuItems();
    }
    setShowMenuModal(true);
  };

  const showPlatformAlert = (
    title,
    message,
    buttons = [], // Array of { text, onPress }
    options = {}
  ) => {
    if (Platform.OS === "web") {
      // Web implementation with confirm-based workaround
      const buttonLabels = buttons.map((b) => b.text).join(" / ");
      const confirmation = window.confirm(
        `${title}\n\n${message}\n\n${buttonLabels}`
      );

      if (buttons.length >= 1) {
        confirmation ? buttons[0]?.onPress?.() : buttons[1]?.onPress?.();
      }
    } else {
      // Native implementation
      Alert.alert(title, message, buttons, options);
    }
  };

  // Show notification preference explanation
  const showNotificationInfo = () => {
    showPlatformAlert(
      "Notification Options",
      "Server-side notifications are sent from our servers directly to your device and work even if the app is closed. Device notifications are scheduled locally on your device and may be more reliable for some devices, but require the app to have been opened at least once since booking.",
      [{ text: "OK" }]
    );
  };

  // Handle testing notifications
  const testNotification = async () => {
    try {
      if (!user) return;

      const notificationContent = {
        title: "Notification Test",
        body: `This is a test notification for your ${restaurant?.name} reservation.`,
        data: {
          type: "test",
          restaurantId: restaurant?.id,
        },
      };

      if (useServerNotifications) {
        // Test server notification
        const result = await notificationService.sendNotificationToUser(
          user.uid,
          notificationContent
        );

        if (result.success) {
          showPlatformAlert(
            "Server Notification Sent",
            "A test notification was sent from our server to your device. You should receive it shortly.",
            Platform.OS === "web"
              ? [] // Web will use simple alert with native OK
              : [{ text: "OK" }] // needs explicit OK button
          );
        } else {
          throw new Error(result.error || "Failed to send server notification");
        }
      } else {
        // Test local notification
        const result = await notificationService.scheduleLocalNotification(
          notificationContent.title,
          notificationContent.body,
          notificationContent.data,
          2 // 2 seconds delay
        );

        if (result.success) {
          showPlatformAlert(
            "Local Notification Scheduled",
            "A test notification was scheduled on your device. You should receive it in a few seconds."
          );
        } else {
          throw new Error(
            result.error || "Failed to schedule local notification"
          );
        }
      }
    } catch (error) {
      console.error("Error testing notification:", error);
      showPlatformAlert(
        "Notification Test Failed",
        `Failed to test notifications: ${error.message}`
      );
    }
  };

  // Show seating modal and fetch available tables if not already loaded
  const handleShowSeatingModal = () => {
    if (!date || !time) {
      showPlatformAlert("Error", "Please select a date and time first");
      return;
    }

    if (availableTables.length === 0) {
      fetchAvailableTables();
    }
    setShowSeatingModal(true);
  };

  // Render loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1a1a1a" />
          <Text style={styles.loadingText}>Loading restaurant details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render error state
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#e53935" />
          <Text style={styles.errorTitle}>Oops!</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // If user is not logged in, show login prompt
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="person-circle-outline" size={64} color="#1a1a1a" />
          <Text style={styles.errorTitle}>Login Required</Text>
          <Text style={styles.errorText}>
            You need to be logged in to make a reservation.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => router.push("/auth")}
          >
            <Text style={styles.retryButtonText}>Login / Sign Up</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Make a Reservation</Text>
            <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
              <Ionicons name="share-social-outline" size={24} color="#1a1a1a" />
            </TouchableOpacity>
          </View>

          {/* Restaurant Info */}
          <View style={styles.restaurantCard}>
            <Image
              source={{
                uri:
                  restaurant?.images?.[0] ||
                  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80",
              }}
              style={styles.restaurantImage}
            />
            <View style={styles.restaurantInfo}>
              <Text style={styles.restaurantName}>
                {typeof restaurant?.name === "string"
                  ? restaurant.name
                  : "Restaurant Name Unavailable"}
              </Text>
              <View style={styles.addressContainer}>
                <Ionicons name="location-outline" size={16} color="#666" />
                <Text style={styles.addressText}>
                  {typeof restaurant?.address === "string"
                    ? restaurant.address
                    : "Address Unavailable"}
                </Text>
              </View>
              {typeof restaurant?.rating === "number" && (
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={16} color="#FFD700" />
                  <Text style={styles.ratingText}>
                    {restaurant.rating.toFixed(1)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Restaurant Status */}
          {restaurantStatus && (
            <View style={styles.statusContainer}>
              <View style={styles.statusItem}>
                <View
                  style={[
                    styles.statusIndicator,
                    {
                      backgroundColor: restaurantStatus.isOpen
                        ? "#4CAF50"
                        : "#F44336",
                    },
                  ]}
                />
                <Text style={styles.statusText}>
                  {restaurantStatus.isOpen ? "Open Now" : "Closed"}
                </Text>
              </View>

              {restaurantStatus.isOpen && (
                <>
                  <View style={styles.statusItem}>
                    <Ionicons name="time-outline" size={16} color="#666" />
                    <Text style={styles.statusText}>
                      Wait: ~{restaurantStatus.estimatedWaitTime} min
                    </Text>
                  </View>

                  <View style={styles.statusItem}>
                    <Ionicons name="people-outline" size={16} color="#666" />
                    <Text style={styles.statusText}>
                      {restaurantStatus.currentCapacity}% Full
                    </Text>
                  </View>
                </>
              )}
            </View>
          )}

          {/* Date Selection */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Select Date</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dateScrollContainer}
            >
              {availableDates.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dateItem,
                    date === item.label && styles.selectedDateItem,
                  ]}
                  onPress={() => setDate(item.label)}
                >
                  <Text
                    style={[
                      styles.dateText,
                      date === item.label && styles.selectedDateText,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Time Selection */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Select Time</Text>
            <View style={styles.timeContainer}>
              {loadingTimes ? (
                <ActivityIndicator size="small" color="#0000ff" />
              ) : availableTimes.length > 0 ? (
                availableTimes.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.timeItem,
                      time === item && styles.selectedTimeItem,
                    ]}
                    onPress={() => setTime(item)}
                  >
                    <Text
                      style={[
                        styles.timeText,
                        time === item && styles.selectedTimeText,
                      ]}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.noTimesText}>
                  {date
                    ? "No available times for selected date"
                    : "Select a date to see available times"}
                </Text>
              )}
            </View>
          </View>

          {/* Weather Forecast */}
          {date && time && (
            <View style={styles.sectionContainer}>
              <WeatherInfo
                weatherData={weatherData}
                loading={weatherLoading}
                error={weatherError}
              />
            </View>
          )}

          {/* Party Size */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Number of Guests</Text>
            <View style={styles.guestsContainer}>
              <TouchableOpacity
                style={styles.guestButton}
                onPress={() =>
                  setGuests((prev) =>
                    Math.max(1, parseInt(prev) - 1).toString()
                  )
                }
              >
                <Ionicons name="remove" size={20} color="#1a1a1a" />
              </TouchableOpacity>

              <TextInput
                style={styles.guestsInput}
                value={guests}
                onChangeText={(text) => {
                  // Only allow numbers
                  const numericValue = text.replace(/[^0-9]/g, "");
                  // Limit to reasonable party size
                  if (numericValue === "" || parseInt(numericValue) === 0) {
                    setGuests("1");
                  } else if (parseInt(numericValue) > 20) {
                    setGuests("20");
                  } else {
                    setGuests(numericValue);
                  }
                }}
                keyboardType="number-pad"
                maxLength={2}
              />

              <TouchableOpacity
                style={styles.guestButton}
                onPress={() =>
                  setGuests((prev) => {
                    const newValue = parseInt(prev) + 1;
                    return newValue > 20 ? "20" : newValue.toString();
                  })
                }
              >
                <Ionicons name="add" size={20} color="#1a1a1a" />
              </TouchableOpacity>
            </View>
          </View>
          {/* Enhanced Features - Seating and Menu Pre-selection */}
          <View style={styles.enhancedFeaturesContainer}>
            <Text style={styles.sectionTitle}>Additional Options</Text>

            {/* Seating Selection Button */}
            <TouchableOpacity
              style={styles.enhancedFeatureButton}
              onPress={handleShowSeatingModal}
              disabled={!date || !time}
            >
              <View style={styles.enhancedFeatureIcon}>
                <Ionicons name="book-outline" size={24} color="#1a1a1a" />
              </View>
              <View style={styles.enhancedFeatureContent}>
                <Text style={styles.enhancedFeatureTitle}>
                  Select Seating Preference
                </Text>
                <Text style={styles.enhancedFeatureDescription}>
                  {selectedTableIds.length > 0
                    ? `${selectedTableIds.length} table(s) selected`
                    : "Choose your preferred table or section"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            {/* Menu Pre-Order Button */}
            <TouchableOpacity
              style={styles.enhancedFeatureButton}
              onPress={handleShowMenuModal}
            >
              <View style={styles.enhancedFeatureIcon}>
                <Ionicons name="restaurant-outline" size={24} color="#1a1a1a" />
              </View>
              <View style={styles.enhancedFeatureContent}>
                <Text style={styles.enhancedFeatureTitle}>
                  Pre-select Menu Items
                </Text>
                <Text style={styles.enhancedFeatureDescription}>
                  {selectedMenuItems.length > 0
                    ? `${selectedMenuItems.length} item(s) selected`
                    : "Browse the menu and pre-order your meal"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>
          </View>

          {/* Special Requests */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Special Requests (Optional)</Text>
            <TextInput
              style={styles.specialRequestsInput}
              placeholder="Enter any special requests or dietary requirements"
              placeholderTextColor="#999"
              multiline
              value={specialRequests}
              onChangeText={setSpecialRequests}
              maxLength={200}
            />
            <Text style={styles.characterCount}>
              {specialRequests.length}/200 characters
            </Text>
          </View>

          {/* Reservation Summary */}
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>Reservation Summary</Text>

            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Ionicons name="time-outline" size={18} color="#666" />
                <Text style={styles.summaryLabel}>Time</Text>
                <Text style={styles.summaryValue}>
                  {time || "Not selected"}
                </Text>
              </View>

              <View style={styles.summaryItem}>
                <Ionicons name="people-outline" size={18} color="#666" />
                <Text style={styles.summaryLabel}>Guests</Text>
                <Text style={styles.summaryValue}>{guests}</Text>
              </View>
            </View>

            {selectedTableIds.length > 0 && (
              <View style={styles.summaryDetail}>
                <Ionicons name="chair-outline" size={18} color="#666" />
                <Text style={styles.summaryDetailText}>
                  {selectedTableIds.length} table(s) selected
                </Text>
              </View>
            )}

            {selectedMenuItems.length > 0 && (
              <View style={styles.summaryDetail}>
                <Ionicons name="restaurant-outline" size={18} color="#666" />
                <Text style={styles.summaryDetailText}>
                  {selectedMenuItems.length} menu item(s) pre-selected
                </Text>
              </View>
            )}
{/* Server Selection*/ }
<View style={styles.notificationPreference}>
  <Text style={styles.sectionTitle}>Notification Preferences</Text>
  <View style={styles.notificationOption}>
    <Switch
      value={useServerNotifications}
      onValueChange={setUseServerNotifications}
    />
    <View style={styles.notificationContent}>
      <Text style={styles.notificationTitle}>
        Use Server Notifications
      </Text>
      <Text style={styles.notificationDescription}>
        More reliable but requires internet connection at time of notification
      </Text>
    </View>
  </View>
</View>
            {/* Display notification preference in summary */}
            <View style={styles.summaryDetail}>
              <Ionicons name="notifications-outline" size={18} color="#666" />
              <Text style={styles.summaryDetailText}>
                {useServerNotifications
                  ? "Using server notifications"
                  : "Using device notifications"}
              </Text>
            </View>
          </View>

          {/* Reserve Button */}
          <TouchableOpacity
            style={[
              styles.reserveButton,
              (!date || !time || submitting) && styles.disabledButton,
            ]}
            onPress={handleReserve}
            disabled={!date || !time || submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.reserveButtonText}>Confirm Reservation</Text>
            )}
          </TouchableOpacity>

          {/* Cancel Button */}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
            disabled={submitting}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          {/* Policy Note */}
          <Text style={styles.policyNote}>
            By confirming this reservation, you agree to our cancellation
            policy. You can cancel up to 2 hours before your reservation time
            without any charge.
          </Text>

          {/* Bottom spacing */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Menu Selection Modal */}
      <Modal
        visible={showMenuModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMenuModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Menu Items</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowMenuModal(false)}
              >
                <Ionicons name="close" size={24} color="#1a1a1a" />
              </TouchableOpacity>
            </View>

            {/* Menu Categories */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryContainer}
            >
              {menuCategories.map((category, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.categoryItem,
                    currentMenuCategory === category &&
                      styles.selectedCategoryItem,
                  ]}
                  onPress={() => setCurrentMenuCategory(category)}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      currentMenuCategory === category &&
                        styles.selectedCategoryText,
                    ]}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {loadingMenu ? (
              <View style={styles.menuLoadingContainer}>
                <ActivityIndicator size="large" color="#1a1a1a" />
                <Text style={styles.menuLoadingText}>
                  Loading menu items...
                </Text>
              </View>
            ) : (
              <FlatList
                data={
                  currentMenuCategory && menuItems[currentMenuCategory]
                    ? menuItems[currentMenuCategory]
                    : []
                }
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                  const isSelected = selectedMenuItems.some(
                    (menuItem) => menuItem.id === item.id
                  );
                  const selectedItem = selectedMenuItems.find(
                    (menuItem) => menuItem.id === item.id
                  );

                  return (
                    <View style={styles.menuItem}>
                      <View style={styles.menuItemContent}>
                        <View style={styles.menuItemHeader}>
                          <Text style={styles.menuItemName}>{item.name}</Text>
                          <Text style={styles.menuItemPrice}>
                            ${item.price}
                          </Text>
                        </View>
                        <Text
                          style={styles.menuItemDescription}
                          numberOfLines={2}
                        >
                          {item.description}
                        </Text>
                        {item.dietaryInfo && (
                          <View style={styles.dietaryContainer}>
                            {item.dietaryInfo.map((info, idx) => (
                              <View key={idx} style={styles.dietaryTag}>
                                <Text style={styles.dietaryText}>{info}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>

                      {!isSelected ? (
                        <TouchableOpacity
                          style={styles.addItemButton}
                          onPress={() => toggleMenuItem(item)}
                        >
                          <Text style={styles.addItemText}>Add</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.quantityControl}>
                          <TouchableOpacity
                            style={styles.quantityButton}
                            onPress={() => {
                              if (selectedItem.quantity <= 1) {
                                toggleMenuItem(item);
                              } else {
                                updateItemQuantity(
                                  item.id,
                                  selectedItem.quantity - 1
                                );
                              }
                            }}
                          >
                            <Ionicons
                              name={
                                selectedItem.quantity <= 1 ? "trash" : "remove"
                              }
                              size={18}
                              color="#1a1a1a"
                            />
                          </TouchableOpacity>

                          <Text style={styles.quantityText}>
                            {selectedItem.quantity}
                          </Text>

                          <TouchableOpacity
                            style={styles.quantityButton}
                            onPress={() =>
                              updateItemQuantity(
                                item.id,
                                selectedItem.quantity + 1
                              )
                            }
                          >
                            <Ionicons name="add" size={18} color="#1a1a1a" />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.emptyMenuContainer}>
                    <Ionicons
                      name="restaurant-outline"
                      size={48}
                      color="#ccc"
                    />
                    <Text style={styles.emptyMenuText}>
                      {currentMenuCategory
                        ? "No items found in this category"
                        : "Select a category to view menu items"}
                    </Text>
                  </View>
                }
              />
            )}

            {/* Selected Items Summary */}
            {selectedMenuItems.length > 0 && (
              <View style={styles.selectedItemsContainer}>
                <Text style={styles.selectedItemsTitle}>
                  {selectedMenuItems.length} item
                  {selectedMenuItems.length !== 1 ? "s" : ""} selected
                </Text>
                <Text style={styles.selectedItemsSubtitle}>
                  Total: $
                  {selectedMenuItems
                    .reduce((sum, item) => sum + item.price * item.quantity, 0)
                    .toFixed(2)}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.confirmButton}
              onPress={() => setShowMenuModal(false)}
            >
              <Text style={styles.confirmButtonText}>Confirm Selection</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Seating Selection Modal */}
      <Modal
        visible={showSeatingModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSeatingModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Seating</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowSeatingModal(false)}
              >
                <Ionicons name="close" size={24} color="#1a1a1a" />
              </TouchableOpacity>
            </View>

            <Text style={styles.seatingInstructions}>
              Select your preferred table or section:
            </Text>

            {loadingSeating ? (
              <View style={styles.menuLoadingContainer}>
                <ActivityIndicator size="large" color="#1a1a1a" />
                <Text style={styles.menuLoadingText}>
                  Loading available tables...
                </Text>
              </View>
            ) : (
              <>
                {/* Table Layout Visualization */}
                <View style={styles.seatingMapContainer}>
                  {availableTables.length > 0 ? (
                    <View style={styles.restaurantLayout}>
                      {/* Simplified visual representation of restaurant layout */}
                      <View style={styles.layoutSection}>
                        <Text style={styles.sectionLabel}>Window Section</Text>
                        <View style={styles.tablesRow}>
                          {availableTables
                            .filter((table) => table.section === "window")
                            .map((table) => (
                              <TouchableOpacity
                                key={table.id}
                                style={[
                                  styles.tableItem,
                                  selectedTableIds.includes(table.id) &&
                                    styles.selectedTableItem,
                                ]}
                                onPress={() => toggleTable(table.id)}
                              >
                                <Text style={styles.tableNumber}>
                                  {table.number}
                                </Text>
                                <Text style={styles.tableCapacity}>
                                  {table.maxCapacity}
                                </Text>
                              </TouchableOpacity>
                            ))}
                        </View>
                      </View>

                      <View style={styles.layoutSection}>
                        <Text style={styles.sectionLabel}>Main Section</Text>
                        <View style={styles.tablesRow}>
                          {availableTables
                            .filter((table) => table.section === "main")
                            .map((table) => (
                              <TouchableOpacity
                                key={table.id}
                                style={[
                                  styles.tableItem,
                                  selectedTableIds.includes(table.id) &&
                                    styles.selectedTableItem,
                                ]}
                                onPress={() => toggleTable(table.id)}
                              >
                                <Text style={styles.tableNumber}>
                                  {table.number}
                                </Text>
                                <Text style={styles.tableCapacity}>
                                  {table.maxCapacity}
                                </Text>
                              </TouchableOpacity>
                            ))}
                        </View>
                      </View>

                      <View style={styles.layoutSection}>
                        <Text style={styles.sectionLabel}>Bar Section</Text>
                        <View style={styles.tablesRow}>
                          {availableTables
                            .filter((table) => table.section === "bar")
                            .map((table) => (
                              <TouchableOpacity
                                key={table.id}
                                style={[
                                  styles.tableItem,
                                  selectedTableIds.includes(table.id) &&
                                    styles.selectedTableItem,
                                ]}
                                onPress={() => toggleTable(table.id)}
                              >
                                <Text style={styles.tableNumber}>
                                  {table.number}
                                </Text>
                                <Text style={styles.tableCapacity}>
                                  {table.maxCapacity}
                                </Text>
                              </TouchableOpacity>
                            ))}
                        </View>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.emptySeatingContainer}>
                      <Ionicons name="chair-outline" size={48} color="#ccc" />
                      <Text style={styles.emptySeatingText}>
                        No available tables found for the selected time slot.
                      </Text>
                      <Text style={styles.emptySeatingSubtext}>
                        Try selecting a different time or date.
                      </Text>
                    </View>
                  )}
                </View>

                {/* Selected Tables Summary */}
                {selectedTableIds.length > 0 && (
                  <View style={styles.selectedTablesContainer}>
                    <Text style={styles.selectedTablesTitle}>
                      {selectedTableIds.length} table
                      {selectedTableIds.length !== 1 ? "s" : ""} selected
                    </Text>
                  </View>
                )}
              </>
            )}
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={() => setShowSeatingModal(false)}
            >
              <Text style={styles.confirmButtonText}>Confirm Selection</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  backButton: {
    padding: 5,
  },
  shareButton: {
    padding: 5,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  infoButton: {
    padding: 5,
  },
  notificationWarning: {
    fontSize: 12,
    color: "#e53935",
    marginTop: 4,
  },
  tokenStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  tokenStatusText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 8,
  },
  testNotificationButton: {
    backgroundColor: "#f0f0f0",
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center",
    marginTop: 12,
  },
  testNotificationText: {
    fontSize: 14,
    color: "#1a1a1a",
  },
  restaurantCard: {
    margin: 15,
    backgroundColor: "#fff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  restaurantImage: {
    width: "100%",
    height: 180,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  restaurantInfo: {
    padding: 15,
  },
  restaurantName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  addressContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  addressText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 5,
    flex: 1,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginLeft: 4,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginHorizontal: 15,
    padding: 12,
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    marginBottom: 15,
  },
  statusItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 13,
    color: "#444",
  },
  sectionContainer: {
    marginHorizontal: 15,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 10,
  },
  dateScrollContainer: {
    paddingVertical: 5,
  },
  dateItem: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginRight: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 25,
  },
  selectedDateItem: {
    backgroundColor: "#1a1a1a",
  },
  dateText: {
    fontSize: 14,
    color: "#444",
  },
  selectedDateText: {
    color: "#fff",
  },
  timeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
  timeItem: {
    width: "23%",
    paddingVertical: 10,
    marginRight: "2%",
    marginBottom: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    alignItems: "center",
  },
  selectedTimeItem: {
    backgroundColor: "#1a1a1a",
  },
  timeText: {
    fontSize: 14,
    color: "#444",
  },
  selectedTimeText: {
    color: "#fff",
  },
  noTimesText: {
    fontSize: 14,
    color: "#999",
    fontStyle: "italic",
    padding: 10,
  },
  guestsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  guestButton: {
    width: 40,
    height: 40,
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  guestsInput: {
    minWidth: 50,
    marginHorizontal: 15,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "600",
  },
  specialRequestsInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    textAlignVertical: "top",
    fontSize: 14,
  },
  characterCount: {
    fontSize: 12,
    color: "#999",
    textAlign: "right",
    marginTop: 4,
  },
  notificationPreference: {
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    padding: 15,
  },
  notificationOption: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ebebeb",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 2,
  },
  notificationDescription: {
    fontSize: 13,
    color: "#666",
  },
  enhancedFeaturesContainer: {
    marginHorizontal: 15,
    marginBottom: 20,
  },
  enhancedFeatureButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    padding: 14,
    marginTop: 15,
    marginBottom: 0,
  },
  enhancedFeatureIcon: {
    marginRight: 12,
  },
  enhancedFeatureContent: {
    flex: 1,
  },
  enhancedFeatureTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 2,
  },
  enhancedFeatureDescription: {
    fontSize: 13,
    color: "#666",
  },
  summaryContainer: {
    marginHorizontal: 15,
    padding: 15,
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  summaryItem: {
    alignItems: "center",
    width: "30%",
  },
  summaryLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
    marginTop: 2,
  },
  summaryDetail: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  summaryDetailText: {
    fontSize: 14,
    color: "#444",
    marginLeft: 8,
  },
  reserveButton: {
    backgroundColor: "#1a1a1a",
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 15,
    marginBottom: 10,
  },
  disabledButton: {
    backgroundColor: "#999",
  },
  reserveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButton: {
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 15,
    marginBottom: 10,
  },
  cancelButtonText: {
    color: "#1a1a1a",
    fontSize: 16,
  },
  policyNote: {
    fontSize: 12,
    color: "#999",
    marginHorizontal: 15,
    textAlign: "center",
    lineHeight: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1a1a1a",
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: "#1a1a1a",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === "ios" ? 30 : 20,
    height: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  closeButton: {
    padding: 5,
  },

  // Menu Modal Styles
  categoryContainer: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  categoryItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
  },
  selectedCategoryItem: {
    backgroundColor: "#1a1a1a",
  },
  categoryText: {
    fontSize: 14,
    color: "#444",
  },
  selectedCategoryText: {
    color: "#fff",
  },
  menuLoadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  menuLoadingText: {
    fontSize: 16,
    color: "#666",
    marginTop: 12,
  },
  menuItem: {
    flexDirection: "row",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  menuItemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    flex: 1,
  },
  menuItemPrice: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    marginLeft: 8,
  },
  menuItemDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 6,
  },
  dietaryContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dietaryTag: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
    marginBottom: 4,
  },
  dietaryText: {
    fontSize: 10,
    color: "#666",
  },
  addItemButton: {
    backgroundColor: "#1a1a1a",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: "center",
  },
  addItemText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  quantityControl: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
  },
  quantityButton: {
    backgroundColor: "#f0f0f0",
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  quantityText: {
    fontSize: 16,
    fontWeight: "600",
    marginHorizontal: 12,
  },
  emptyMenuContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },
  emptyMenuText: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
    marginTop: 16,
  },
  selectedItemsContainer: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  selectedItemsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  selectedItemsSubtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  confirmButton: {
    backgroundColor: "#1a1a1a",
    borderRadius: 8,
    marginHorizontal: 15,
    marginTop: 10,
    padding: 15,
    alignItems: "center",
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  weatherContainer: {
    marginHorizontal: 15,
    marginTop: 10,
    marginBottom: 20,
  },

  // Seating Modal Styles
  seatingInstructions: {
    fontSize: 14,
    color: "#666",
    marginHorizontal: 15,
    marginVertical: 12,
  },
  seatingMapContainer: {
    flex: 1,
    padding: 15,
  },
  restaurantLayout: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 15,
  },
  layoutSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 10,
  },
  tablesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  tableItem: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    margin: 5,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  selectedTableItem: {
    backgroundColor: "#e0f7fa",
    borderColor: "#00acc1",
  },
  tableNumber: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  tableCapacity: {
    fontSize: 12,
    color: "#666",
  },
  emptySeatingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },
  emptySeatingText: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
    marginTop: 16,
  },
  emptySeatingSubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginTop: 8,
  },
  selectedTablesContainer: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  selectedTablesTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
  },
});

export default ReservationCP;
