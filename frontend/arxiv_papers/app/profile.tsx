import { View, Text, Button } from "react-native";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from "react";

export default function Profile() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      try {
        const res = await fetch("http://192.168.1.91:8000/users/me", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();
        setUser(data);
      } catch (error) {
        console.error("Failed to fetch user", error);
      }
    };

    fetchUser();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 20 }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>User Profile</Text>
      {user ? (
        <>
          <Text>Email: {user.email}</Text>
          <Text>Username: {user.username}</Text>
          <Button title="Logout" onPress={async () => {
            await AsyncStorage.removeItem('token'); 
            router.replace('/');
          }} />
        </>
      ) : (
        <Text>Loading...</Text>
      )}
    </View>
  );
}