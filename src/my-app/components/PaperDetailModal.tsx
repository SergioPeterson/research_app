import { icons } from '@/constants';
import { useUser } from '@clerk/clerk-expo';
import React, { useEffect, useState } from 'react';
import {
  Image,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

interface PaperDetailModalProps {
  paper: any;
  visible: boolean;
  onClose: () => void;
}

const PaperDetailModal = ({ paper, visible, onClose }: PaperDetailModalProps) => {
  const { user } = useUser();
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.id && paper?.paper_id) {
      checkLikeAndSaveStatus();
    }
  }, [user?.id, paper?.paper_id]);

  const checkLikeAndSaveStatus = async () => {
    try {
      // Check if paper is liked
      const likedResponse = await fetch(`/(api)/user/${user?.id}/likes`);
      const likedData = await likedResponse.json();
      setIsLiked(likedData?.data?.some((p: any) => p.paper_id === paper.paper_id) || false);

      // Check if paper is saved
      const savedResponse = await fetch(`/(api)/user/${user?.id}/saves`);
      const savedData = await savedResponse.json();
      setIsSaved(savedData?.data?.some((p: any) => p.paper_id === paper.paper_id) || false);
    } catch (error) {
      console.error('Error checking paper status:', error);
      setIsLiked(false);
      setIsSaved(false);
    }
  };

  const handleLike = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const method = isLiked ? 'DELETE' : 'POST';
      const response = await fetch(`/(api)/user/${user.id}/likes`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paperId: paper.paper_id, clerkId: user.id }),
      });
      if (response.ok) {
        setIsLiked(!isLiked);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const method = isSaved ? 'DELETE' : 'POST';
      const response = await fetch(`/(api)/user/${user.id}/saves`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paperId: paper.paper_id, clerkId: user.id }),
      });
      if (response.ok) {
        setIsSaved(!isSaved);
      }
    } catch (error) {
      console.error('Error toggling save:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!paper) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50">
        <View className="flex-1 mt-20 bg-white rounded-t-3xl">
          {/* Header */}
          <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
            <TouchableOpacity onPress={onClose} className="p-2">
              <Image source={icons.backArrow} className="w-6 h-6" />
            </TouchableOpacity>
            <View className="flex-row space-x-4">
              <TouchableOpacity onPress={handleLike} disabled={loading} className="p-2">
                {isLiked ? <Icon name="heart" size={24} color="black" /> : <Icon name="heart-o" size={24} color="black" />}
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} disabled={loading} className="p-2">
                {isSaved ? <Icon name="bookmark" size={24} color="black" /> : <Icon name="bookmark-o" size={24} color="black" />}
              </TouchableOpacity>
            </View>
          </View>

          {/* Content */}
          <ScrollView className="flex-1 p-4">
            <Text className="text-2xl font-JakartaBold text-gray-900 mb-2">
              {paper.title}
            </Text>

            {/* Authors and Date */}
            <View className="flex-row items-center mb-4">
              <View className="bg-blue-200 px-2 py-1 rounded-full mr-2">
                <Text className="text-xs text-blue-800">{paper.category}</Text>
              </View>
              <Text className="text-xs text-gray-600">
                {new Date(paper.published).toLocaleDateString()}
              </Text>
            </View>

            <Text className="text-base text-gray-700 mb-4">
              {Array.isArray(paper.authors) ? paper.authors.join(', ') : paper.authors}
            </Text>

            {/* Abstract */}
            <View className="mb-6">
              <Text className="text-lg font-JakartaBold text-gray-900 mb-2">
                Abstract
              </Text>
              <Text className="text-base text-gray-700 leading-6">
                {paper.abstract}
              </Text>
            </View>

            {/* Summary */}
            {paper.summary && (
              <View className="mb-6">
                <Text className="text-lg font-JakartaBold text-gray-900 mb-2">
                  Summary
                </Text>
                <Text className="text-base text-gray-700 leading-6">
                  {paper.summary}
                </Text>
              </View>
            )}

            {/* Keywords */}
            {Array.isArray(paper.keywords) && paper.keywords.length > 0 && (
              <View className="mb-6">
                <Text className="text-lg font-JakartaBold text-gray-900 mb-2">
                  Keywords
                </Text>
                <View className="flex-row flex-wrap">
                  {paper.keywords.map((keyword: string, index: number) => (
                    <View
                      key={index}
                      className="bg-gray-200 px-3 py-1 rounded-full mr-2 mb-2"
                    >
                      <Text className="text-sm text-gray-700">{keyword}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Organizations */}
            {Array.isArray(paper.organizations) && paper.organizations.length > 0 && (
              <View className="mb-6">
                <Text className="text-lg font-JakartaBold text-gray-900 mb-2">
                  Organizations
                </Text>
                <View className="flex-row flex-wrap">
                  {paper.organizations.map((org: string, index: number) => (
                    <View
                      key={index}
                      className="bg-green-200 px-3 py-1 rounded-full mr-2 mb-2"
                    >
                      <Text className="text-sm text-green-800">{org}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Link to paper */}
            <TouchableOpacity
              onPress={() => {
                // Handle opening the paper link
                if (paper.link) {
                  // You might want to use Linking from react-native here
                  console.log('Opening link:', paper.link);
                }
              }}
              className="bg-blue-500 p-4 rounded-xl mb-6"
            >
              <Text className="text-white text-center font-JakartaBold">
                View Full Paper
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default PaperDetailModal; 