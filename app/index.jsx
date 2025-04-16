import { Text, View, ScrollView, ImageBackground, TouchableOpacity, Image, SafeAreaView } from "react-native";
import { StyleSheet } from "react-native";
import { useRouter } from "expo-router";

export default function Index() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.headerContainer}>
          <Text style={styles.mainHeading}>
          Welcome to{'\n'}DineConnect{'\n'}
            
          </Text>
          <Text style={styles.subheading}>
            An unrivaled selection of restaurants{'\n'}for whatever you want
          </Text>
        </View>

        <View style={styles.imageContainer}>
          <View style={styles.foodImageWrapper}>
            <ImageBackground 
              source={{ uri: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80" }}
              style={styles.foodImage}
              imageStyle={{ borderRadius: 16 }}
            />
          </View>
          <View style={styles.restaurantImageWrapper}>
            <ImageBackground 
              source={{ uri: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80" }}
              style={styles.restaurantImage}
              imageStyle={{ borderRadius: 16 }}
            />
          </View>
        </View>

        <View style={styles.featuresContainer}>
          <Text style={styles.featureItem}>
            • Browse through a variety of restaurants and view their menus, photos, and reviews
          </Text>
          <Text style={styles.featureItem}>
            • Make reservations in just a few taps
          </Text>
          <Text style={styles.featureItem}>
            • Get notified of upcoming reservations and easily manage them
          </Text>
          <Text style={styles.featureItem}>
            • Earn rewards for frequent bookings
          </Text>
        </View>
        
        <View style={styles.ctaWrapper}>
        <TouchableOpacity onPress={() => router.push("/restaurants")} >
          <Text style={styles.callToAction}>
            Get started
          </Text>

          </TouchableOpacity>
        </View>
      </ScrollView>
      
    </SafeAreaView>
    
  );
}

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
  imageContainer: {
    flexDirection: "row",
    marginBottom: 30,
    height: 200,
    position: "relative",
  },
  foodImageWrapper: {
    position: "absolute",
    left: 0,
    top: 0,
    width: "65%",
    height: "90%",
    zIndex: 2,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  foodImage: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
  },
  restaurantImageWrapper: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: "55%",
    height: "80%",
    zIndex: 1,
  },
  restaurantImage: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
  },
  featuresContainer: {
    marginTop: 60,
    marginBottom: 30,
  },
  featureItem: {
    fontSize: 15,
    color: "#333333",
    marginBottom: 14,
    lineHeight: 22,
    fontFamily: "System",
  },
  ctaWrapper: {
    alignItems: "flex-start",
  },
  callToAction: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    backgroundColor: "#1a1a1a",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    overflow: "hidden",
  }
});