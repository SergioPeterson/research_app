import { icons } from "@/constants";
import { useClerk, useUser } from "@clerk/clerk-expo";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Image, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from "react-native";

const Profile = () => {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch(`/(api)/user/${user?.id}`);
        const result = await response.json();
        if (response.ok) {
          setUserData(result.data);
        } else {
          console.error("Error fetching user data:", result.error);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };
    if (user?.id) fetchUserData();
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut();
      router.replace("/(auth)/sign-in");
    } catch (err) {
      console.error(JSON.stringify(err, null, 2));
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-general-500">
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="px-4 pt-6 pb-4 flex-row items-center justify-between">
          <Text className="text-2xl font-JakartaBold">Profile</Text>
          <TouchableOpacity
            onPress={handleLogout}
            className="justify-center items-center w-10 h-10 rounded-full bg-white"
          >
            <Image source={icons.out} className="w-5 h-5" />
          </TouchableOpacity>
        </View>

        {/* Profile Content */}
        <View className="px-4">
          {/* Profile Image and Name */}
          <View className="items-center mb-6">
            <View className="w-24 h-24 rounded-full bg-gray-200 mb-3 items-center justify-center">
              {user?.imageUrl ? (
                <Image
                  source={{ uri: user.imageUrl }}
                  className="w-24 h-24 rounded-full"
                />
              ) : (
                <Text className="text-4xl text-gray-500">
                  {userData?.name?.[0] || user?.firstName?.[0] || "?"}
                </Text>
              )}
            </View>
            <Text className="text-xl font-JakartaBold text-gray-900">
              {userData?.name || user?.fullName || "User"}
            </Text>
            <Text className="text-gray-500">{user?.primaryEmailAddress?.emailAddress}</Text>
          </View>

          {/* User Information Cards */}
          <View className="space-y-4">
            {/* Research Interests */}
            <View className="bg-white rounded-2xl p-4 shadow-sm mb-4">
              <Text className="text-lg font-JakartaBold text-gray-900 mb-2">Research Interests</Text>
              <View className="flex-row flex-wrap">
                {userData?.interests?.map((interest: string, index: number) => (
                  <View key={index} className="bg-blue-100 px-3 py-1 rounded-full mr-2 mb-2">
                    <Text className="text-sm text-blue-800">{interest}</Text>
                  </View>
                )) || (
                  <Text className="text-gray-500">No research interests specified</Text>
                )}
              </View>
            </View>

            {/* Affiliations */}
            <View className="bg-white rounded-2xl p-4 shadow-sm mb-4">
              <Text className="text-lg font-JakartaBold text-gray-900 mb-2">Affiliations</Text>
              <View className="flex-row flex-wrap">
                {userData?.affiliations?.map((interest: string, index: number) => (
                  <View key={index} className="bg-blue-100 px-3 py-1 rounded-full mr-2 mb-2">
                    <Text className="text-sm text-blue-800">{interest}</Text>
                  </View>
                )) || (
                  <Text className="text-gray-500">No affiliations specified</Text>
                )}
              </View>
            </View>

            {/* Role */}
            <View className="bg-white rounded-2xl p-4 shadow-sm mb-4">
              <Text className="text-lg font-JakartaBold text-gray-900 mb-2">Role</Text>
              <Text className="text-gray-700">
                {userData?.role || "No role specified"}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Profile;
