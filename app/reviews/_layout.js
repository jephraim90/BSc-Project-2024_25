import { Stack } from "expo-router";
import { View } from "react-native";

export default function ReviewsLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Stack>
        <Stack.Screen
          name="index"
          options={{
            headerTitle: "Reviews",
            headerTitleAlign: "center",
            headerShadowVisible: false,
            headerStyle: {
              backgroundColor: "#FFFFFF",
            },
            headerTitleStyle: {
              fontWeight: "700",
              color: "#1a1a1a",
            },
          }}
        />
      </Stack>
    </View>
  );
}