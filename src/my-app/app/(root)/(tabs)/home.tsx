import PaperDetailModal from "@/components/PaperDetailModal";
import { icons } from "@/constants";
import { SignedIn, SignedOut, useClerk, useUser } from "@clerk/clerk-expo";
import { Link, router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  Image,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const Home = () => {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [userData, setUserData] = useState<any>(null);
  const [papers, setPapers] = useState<any[]>([]);
  const [selectedPaper, setSelectedPaper] = useState<any>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

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

  const fetchPapers = async () => {
    try {
      // First fetch specific papers
      const paper1 = await fetch(`/(api)/paper/2505.22947v1`);
      const paper2 = await fetch(`/(api)/paper/2505.22950v1`);
      
      const result1 = await paper1.json();
      const result2 = await paper2.json();
      // Then fetch all papers
      const response = await fetch(`/(api)/paper`);
      const result = await response.json();
      
      if (response.ok) {
        // Combine specific papers with the rest
        const combinedPapers = [
          result1.data,
          result2.data,
          ...result.data
        ];
        setPapers(combinedPapers);
      } else {
        console.error("Error fetching papers:", result.error);
      }
    } catch (error) {
      console.error("Error fetching papers:", error);
    }
  };

  useEffect(() => {
    fetchPapers();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
      router.replace("/(auth)/sign-in");
    } catch (err) {
      console.error(JSON.stringify(err, null, 2));
    }
  };

  const renderPaperCard = ({ item }: { item: any }) => {
    // Format the published date
    const publishedDate = item.published
      ? new Date(item.published).toLocaleDateString()
      : "Unknown date";

    // Join authors array into a comma-separated string
    const authors = Array.isArray(item.authors)
      ? item.authors.join(", ")
      : item.authors;

    // Truncate summary if too long
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
        className="bg-white rounded-2xl p-4 mb-4 shadow-md mx-4"
      >
        {/* Title */}
        <Text className="text-lg font-JakartaBold text-gray-900 mb-1">
          {item.title}
        </Text>

        {/* Subtitle row: category tag + published date */}
        <View className="flex-row items-center mb-2">
          <View className="bg-blue-200 px-2 py-1 rounded-full mr-2">
            <Text className="text-xs text-blue-800">{item.category}</Text>
          </View>
          <Text className="text-xs text-gray-600">{publishedDate}</Text>
        </View>

        {/* Authors */}
        <Text className="text-sm text-gray-700 mb-2">
          {authors || "Unknown authors"}
        </Text>

        {/* Summary preview (if available) */}
        {summaryPreview ? (
          <Text className="text-sm text-gray-800 mb-2">{summaryPreview}</Text>
        ) : null}

        {/* Keywords */}
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

        {/* Organizations */}
        {Array.isArray(item.organizations) && item.organizations.length > 0 ? (
          <View className="flex-wrap flex-row mt-1">
            {item.organizations.map((org: string, idx: number) => (
              <View
                key={idx}
                className="bg-green-200 px-2 py-0.5 rounded-xl mr-2 mb-1"
              >
                <Text className="text-xs text-green-800">{org}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-general-500">
      <SignedIn>
        <FlatList
          data={papers}
          keyExtractor={(item) => item.paper_id}
          renderItem={renderPaperCard}
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center">
              <Text className="text-gray-200">No papers found</Text>
            </View>
          }
          ListHeaderComponent={() => (
            <View className="px-4 pt-6 pb-4 flex-row items-center justify-between">
              <Text className="text-2xl font-JakartaBold">
                Welcome back, {userData?.name.split(" ")[0] || "Researcher"}
              </Text>
              <TouchableOpacity
                onPress={handleLogout}
                className="justify-center items-center w-10 h-10 rounded-full bg-white"
              >
                <Image source={icons.out} className="w-5 h-5" />
              </TouchableOpacity>
            </View>
          )}
        />
        <PaperDetailModal
          paper={selectedPaper}
          visible={isModalVisible}
          onClose={() => {
            setIsModalVisible(false);
            setSelectedPaper(null);
          }}
        />
      </SignedIn>

      <SignedOut>
        <View className="flex-1 justify-center items-center">
          <Link href="/sign-in">
            <Text className="text-blue-400 mb-4">Sign In</Text>
          </Link>
          <Link href="/sign-up">
            <Text className="text-blue-400">Sign Up</Text>
          </Link>
        </View>
      </SignedOut>
    </SafeAreaView>
  );
};

export default Home;