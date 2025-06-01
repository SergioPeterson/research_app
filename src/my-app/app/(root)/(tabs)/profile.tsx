import { icons } from "@/constants";
import { useClerk, useUser } from "@clerk/clerk-expo";
import Constants from "expo-constants";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from "react-native";


const Profile = () => {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [userData, setUserData] = useState<any>(null);
  const [uploading, setUploading] = useState<boolean>(false);

  const {
    CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_UPLOAD_PRESET,
  } = Constants.expoConfig!.extra as {
    CLOUDINARY_CLOUD_NAME: string;
    CLOUDINARY_UPLOAD_PRESET: string;
  };
  const CLOUDINARY_UPLOAD_URL = 
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

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

  const pickImageAndUpload = async () => {
    try {
      // 1) Ask for permissions
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert("Permission required", "We need permission to access your photos.");
        return;
      }

      // 2) Launch image picker
      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsEditing: true,
        aspect: [1, 1],
      });
      if (pickerResult.canceled) return;

      setUploading(true);
      const localUri = pickerResult.assets[0].uri;

      // 3) Build FormData using RN conventions:
      const formData = new FormData();
      formData.append("file", {
        uri: localUri,
        name: "upload.jpg",
        type: "image/jpeg",
      } as any);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

      // 4) POST to Cloudinary
      const cloudRes = await fetch(CLOUDINARY_UPLOAD_URL, {
        method: "POST",
        body: formData,
      });
      const cloudData = await cloudRes.json();

      if (!cloudRes.ok) {
        console.error("Cloudinary upload error:", cloudData);
        Alert.alert("Upload failed", "Could not upload image. Please try again.");
        return;
      }

      // 5) Update user profile in database
      if (user?.id) {
        const updateResponse = await fetch(`/(api)/user/${user.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...userData,
            profile_image_url: cloudData.secure_url,
          }),
        });
        if (!updateResponse.ok) {
          throw new Error("Failed to update profile in database");
        }
        // Update local state with new data
        const updatedUserData = await updateResponse.json();
        setUserData(updatedUserData.data);
      }
    } catch (err) {
      console.error("Image upload error:", err);
      Alert.alert("Error", "There was an error uploading your image.");
    } finally {
      setUploading(false);
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
          {/* Profile data */}
          <View className="items-center mb-6">
            <TouchableOpacity 
              onPress={pickImageAndUpload}
              className="w-24 h-24 rounded-full bg-gray-200 mb-3 items-center justify-center"
            >
              {uploading ? (
                <ActivityIndicator size="large" color="#0000ff" />
              ) : userData?.profile_image_url ? (
                <Image
                  source={{ uri: userData.profile_image_url }}
                  className="w-24 h-24 rounded-full"
                />
              ) : (
                <Text className="text-4xl text-gray-500">
                  {userData?.name?.[0] || user?.firstName?.[0] || "?"}
                </Text>
              )}
            </TouchableOpacity>
            <Text className="text-xl font-JakartaBold text-gray-900">
              {userData?.name || user?.fullName || "User"}
            </Text>
            <Text className="text-gray-500">{user?.primaryEmailAddress?.emailAddress}</Text>
            <Text className="text-blue-500 text-lg font-bold">{userData?.role}</Text>
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
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Profile;
