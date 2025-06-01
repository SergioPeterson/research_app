import CustomButton from "@/components/CustomButton";
import { fetchAPI } from "@/lib/fetch";
import { useUser } from "@clerk/clerk-expo";
import { Picker } from "@react-native-picker/picker"; // <-- Replace Select with Picker
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    SafeAreaView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";


const Setup = () => {
  const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME!;
  const CLOUDINARY_UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET!;
  const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
  const { user } = useUser();
  const [affiliations, setAffiliations] = useState<string[]>([]);
  const [newAffiliation, setNewAffiliation] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState("");
  const [role, setRole] = useState<string>("User");
  const [profileImageUrl, setProfileImageUrl] = useState<string>("");
  const [uploading, setUploading] = useState<boolean>(false);

  // Add / remove affiliations
  const addAffiliation = () => {
    const trimmed = newAffiliation.trim();
    if (trimmed && !affiliations.includes(trimmed)) {
      setAffiliations((prev) => [...prev, trimmed]);
      setNewAffiliation("");
    }
  };
  const removeAffiliation = (aff: string) => {
    setAffiliations((prev) => prev.filter((a) => a !== aff));
  };

  // Add / remove interests
  const addInterest = () => {
    const trimmed = newInterest.trim();
    if (trimmed && !interests.includes(trimmed)) {
      setInterests((prev) => [...prev, trimmed]);
      setNewInterest("");
    }
  };
  const removeInterest = (i: string) => {
    setInterests((prev) => prev.filter((x) => x !== i));
  };

  // Pick an image from the library and upload to Cloudinary
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
  
      // 3) Convert local URI to blob
      setUploading(true);
      const localUri = pickerResult.assets[0].uri;
      const response = await fetch(localUri);
      const blob = await response.blob();
  
      // 4) Upload to Cloudinary via unsigned preset
      const formData = new FormData();
      formData.append("file", blob);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  
      const cloudRes = await fetch(CLOUDINARY_UPLOAD_URL, {
        method: "POST",
        body: formData,
      });
      const cloudData = await cloudRes.json();
  
      if (!cloudRes.ok) {
        console.error("Cloudinary upload error:", cloudData);
        Alert.alert("Upload failed", "Could not upload image. Please try again.");
        setUploading(false);
        return;
      }
  
      // 5) Save the returned URL
      setProfileImageUrl(cloudData.secure_url);
    } catch (err) {
      console.error("Image upload error:", err);
      Alert.alert("Error", "There was an error uploading your image.");
    } finally {
      setUploading(false);
    }
  };

  // When "Continue" is pressed, PATCH profile data (including profileImageUrl)
  const handleContinue = async () => {
    if (!user?.id) return;

    try {
      await fetchAPI(`/(api)/user/${user.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          affiliations,
          interests,
          role,
          profileImage: profileImageUrl,
        }),
      });
      router.push("/(root)/(tabs)/home");
    } catch (err) {
      console.error("Failed to update user:", err);
      Alert.alert("Error", "Could not save profile. Please try again.");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 p-4">
        <Text className="text-2xl font-bold mb-6">Setup Your Profile</Text>

        {/* --- Affiliations Section --- */}
        <View className="mb-6">
          <Text className="text-lg font-semibold mb-2">Affiliations</Text>
          <View className="flex-row mb-2">
            <TextInput
              className="flex-1 border border-gray-300 rounded-lg p-3 mr-2"
              value={newAffiliation}
              onChangeText={setNewAffiliation}
              placeholder="Add an affiliation"
            />
            <TouchableOpacity
              onPress={addAffiliation}
              className="bg-blue-500 px-4 rounded-lg justify-center"
            >
              <Text className="text-white font-semibold">Add</Text>
            </TouchableOpacity>
          </View>
          <View className="flex-row flex-wrap">
            {affiliations.map((aff, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => removeAffiliation(aff)}
                className="bg-gray-200 rounded-full px-3 py-1 m-1"
              >
                <Text className="text-gray-700">{aff} ×</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* --- Interests Section --- */}
        <View className="mb-6">
          <Text className="text-lg font-semibold mb-2">Interests</Text>
          <View className="flex-row mb-2">
            <TextInput
              className="flex-1 border border-gray-300 rounded-lg p-3 mr-2"
              value={newInterest}
              onChangeText={setNewInterest}
              placeholder="Add an interest"
            />
            <TouchableOpacity
              onPress={addInterest}
              className="bg-blue-500 px-4 rounded-lg justify-center"
            >
              <Text className="text-white font-semibold">Add</Text>
            </TouchableOpacity>
          </View>
          <View className="flex-row flex-wrap">
            {interests.map((int, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => removeInterest(int)}
                className="bg-gray-200 rounded-full px-3 py-1 m-1"
              >
                <Text className="text-gray-700">{int} ×</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* --- Role Section using Picker --- */}
        <View className="mb-6">
          <Text className="text-lg font-semibold mb-2">Role</Text>
          <View className="border border-gray-300 rounded-lg p-1">
            <Picker
              selectedValue={role}
              onValueChange={(value) => setRole(value)}
            >
              <Picker.Item label="Student" value="Student" />
              <Picker.Item label="Researcher" value="Researcher" />
              <Picker.Item label="Professor" value="Professor" />
              <Picker.Item label="Industry" value="Industry" />
              <Picker.Item label="Other" value="Other" />
            </Picker>
          </View>
        </View>

        {/* --- Profile Image Section --- */}
        <View className="mb-6">
          <Text className="text-lg font-semibold mb-2">Profile Image</Text>

          {/* Show preview if already uploaded */}
          {profileImageUrl ? (
            <Image
              source={{ uri: profileImageUrl }}
              className="w-24 h-24 rounded-full mb-3"
            />
          ) : null}

          <TouchableOpacity
            onPress={pickImageAndUpload}
            className="bg-blue-500 rounded-lg px-4 py-3 flex-row items-center justify-center"
          >
            {uploading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold">Pick & Upload Image</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* --- Continue Button --- */}
        <CustomButton
          title="Continue"
          onPress={handleContinue}
          className="mt-6"
        />
      </View>
    </SafeAreaView>
  );
};

export default Setup;