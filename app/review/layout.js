import { Stack } from "expo-router";
import { View } from "react-native";

export default function ReviewLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Stack>
        <Stack.Screen
          name="create"
          options={{
            headerTitle: "Write a Review",
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