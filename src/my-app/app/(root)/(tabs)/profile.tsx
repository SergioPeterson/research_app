import PaperDetailModal from "@/components/PaperDetailModal";
import { icons } from "@/constants";
import { useClerk, useUser } from "@clerk/clerk-expo";
import Constants from "expo-constants";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from "react-native";

type TabType = 'saved' | 'liked';

const Profile = () => {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [userData, setUserData] = useState<any>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<TabType>('saved');
  const [savedPapers, setSavedPapers] = useState<any[]>([]);
  const [likedPapers, setLikedPapers] = useState<any[]>([]);
  const [selectedPaper, setSelectedPaper] = useState<any>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [loadingPapers, setLoadingPapers] = useState(false);

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

  const fetchUserPapers = async () => {
    if (!user?.id) return;
    setLoadingPapers(true);
    try {
      // Fetch saved papers
      const savedResponse = await fetch(`/(api)/user/${user.id}/saves`);
      const savedResult = await savedResponse.json();
      if (savedResponse.ok) {
        setSavedPapers(savedResult.data);
      }

      // Fetch liked papers
      const likedResponse = await fetch(`/(api)/user/${user.id}/likes`);
      const likedResult = await likedResponse.json();
      if (likedResponse.ok) {
        setLikedPapers(likedResult.data);
      }
    } catch (error) {
      console.error("Error fetching user papers:", error);
    } finally {
      setLoadingPapers(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchUserPapers();
    }
  }, [user?.id]);

  const renderPaperCard = ({ item }: { item: any }) => {
    const publishedDate = item.published
      ? new Date(item.published).toLocaleDateString()
      : "Unknown date";

    const authors = Array.isArray(item.authors)
      ? item.authors.join(", ")
      : item.authors;

    const summaryPreview =
      item.summary && item.summary.length > 200
        ? item.summary.slice(0, 200) + "…"
        : item.summary;

    return (
      <TouchableOpacity
        onPress={() => {
          setSelectedPaper(item);
          setIsModalVisible(true);
        }}
        className="bg-white rounded-2xl p-4 mb-4 shadow-md"
      >
        <Text className="text-lg font-JakartaBold text-gray-900 mb-1">
          {item.title}
        </Text>

        <View className="flex-row items-center mb-2">
          <View className="bg-blue-200 px-2 py-1 rounded-full mr-2">
            <Text className="text-xs text-blue-800">{item.category}</Text>
          </View>
          <Text className="text-xs text-gray-600">{publishedDate}</Text>
        </View>

        <Text className="text-sm text-gray-700 mb-2">
          {authors || "Unknown authors"}
        </Text>

        {summaryPreview ? (
          <Text className="text-sm text-gray-800 mb-2">{summaryPreview}</Text>
        ) : null}

        {Array.isArray(item.keywords) && item.keywords.length > 0 ? (
          <View className="flex-wrap flex-row">
            {item.keywords.map((kw: string, idx: number) => (
              <View
                key={idx}
                className="bg-gray-200 px-2 py-0.5 rounded-xl mr-2 mb-2"
              >
                <Text className="text-xs text-gray-700">{kw}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </TouchableOpacity>
    );
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

            {/* Saved and Liked Papers */}
            <View className="bg-white rounded-2xl p-4 shadow-sm mb-4">
              <Text className="text-lg font-JakartaBold text-gray-900 mb-4">My Papers</Text>
              
              {/* Tab Buttons */}
              <View className="flex-row mb-4">
                <TouchableOpacity
                  onPress={() => setActiveTab('saved')}
                  className={`flex-1 mr-2 py-2 rounded-full ${
                    activeTab === 'saved' ? 'bg-blue-500' : 'bg-gray-200'
                  }`}
                >
                  <Text
                    className={`text-center ${
                      activeTab === 'saved' ? 'text-white' : 'text-gray-700'
                    }`}
                  >
                    Saved
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setActiveTab('liked')}
                  className={`flex-1 ml-2 py-2 rounded-full ${
                    activeTab === 'liked' ? 'bg-blue-500' : 'bg-gray-200'
                  }`}
                >
                  <Text
                    className={`text-center ${
                      activeTab === 'liked' ? 'text-white' : 'text-gray-700'
                    }`}
                  >
                    Liked
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Papers List */}
              {loadingPapers ? (
                <View className="py-4">
                  <ActivityIndicator size="large" color="#0000ff" />
                </View>
              ) : (
                <View>
                  {activeTab === 'saved' ? (
                    savedPapers.length > 0 ? (
                      savedPapers.map((paper, index) => (
                        <View key={paper.paper_id || index}>
                          {renderPaperCard({ item: paper })}
                        </View>
                      ))
                    ) : (
                      <Text className="text-gray-500 text-center py-4">No saved papers yet</Text>
                    )
                  ) : (
                    likedPapers.length > 0 ? (
                      likedPapers.map((paper, index) => (
                        <View key={paper.paper_id || index}>
                          {renderPaperCard({ item: paper })}
                        </View>
                      ))
                    ) : (
                      <Text className="text-gray-500 text-center py-4">No liked papers yet</Text>
                    )
                  )}
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      <PaperDetailModal
        paper={selectedPaper}
        visible={isModalVisible}
        onClose={() => {
          setIsModalVisible(false);
          setSelectedPaper(null);
        }}
      />
    </SafeAreaView>
  );
};

export default Profile;
