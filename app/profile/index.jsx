import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import React, { useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";

const Profile = () => {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [checkedAuth, setCheckedAuth] = React.useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace("/auth");
      }
      setCheckedAuth(true);
    }
    
  }, [user, authLoading]);
  if (authLoading || !checkedAuth) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }
  return (
    <View>
      <Text>Welcome {user?.email}</Text>
    </View>
  );
};
const styles = StyleSheet.create({
  centeredContainer: {
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  },
});
export default Profile;
