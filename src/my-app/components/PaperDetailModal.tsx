import { icons } from '@/constants';
import { useUser } from '@clerk/clerk-expo';
import * as React from 'react';
import { useEffect, useState } from 'react';
import {
  Image,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import CategoriesModal from './categoriesModel';
import AuthorModal from './authorModel';

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
  const [likeCount, setLikeCount] = useState(0);
  const [saveCount, setSaveCount] = useState(0);
  const [isFollowingCategory, setIsFollowingCategory] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showAuthorModal, setShowAuthorModal] = useState(false);
  const [selectedAuthor, setSelectedAuthor] = useState('');

  useEffect(() => {
    if (user?.id && paper?.paper_id) {
      checkLikeAndSaveStatus();
      fetchLikeAndSaveCounts();
      checkCategoryFollowStatus();
    }
  }, [user?.id, paper?.paper_id]);

  useEffect(() => {
    return () => {
      setShowCategoryModal(false);
      setShowAuthorModal(false);
      setSelectedAuthor('');
    };
  }, []);

  useEffect(() => {
    if (!visible) {
      setShowCategoryModal(false);
      setShowAuthorModal(false);
      setSelectedAuthor('');
    }
  }, [visible]);

  const fetchLikeAndSaveCounts = async () => {
    try {
      // Fetch total likes for the paper
      const likesResponse = await fetch(`/(api)/paper/likes?paperId=${paper.paper_id}`);
      const likesData = await likesResponse.json();
      setLikeCount(likesData?.data?.length || 0);

      const savesResponse = await fetch(`/(api)/paper/saves?paperId=${paper.paper_id}`);
      const savesData = await savesResponse.json();
      setSaveCount(savesData?.data?.length || 0);
    } catch (error) {
      console.error('Error fetching counts:', error);
    }
  };

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

  const checkCategoryFollowStatus = async () => {
    try {
      const response = await fetch(`/(api)/user/${user?.id}/categories`);
      const data = await response.json();
      setIsFollowingCategory(data?.data?.some((c: any) => c.category === paper.category) || false);
    } catch (error) {
      console.error('Error checking category follow status:', error);
    }
  };

  const handleCategoryPress = () => {
    if (!user?.id) return;
    setShowCategoryModal(true);
  };

  const handleCategoryConfirm = async () => {
    try {
      const method = isFollowingCategory ? 'DELETE' : 'POST';
      const response = await fetch(`/(api)/user/${user?.id}/categories`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: paper.category }),
      });
      
      if (response.ok) {
        setIsFollowingCategory(!isFollowingCategory);
      }
    } catch (error) {
      console.error('Error toggling category follow:', error);
    } finally {
      setShowCategoryModal(false);
    }
  };

  const handleAuthorPress = (author: string) => {
    console.log('Author pressed:', author);
    setSelectedAuthor(author);
    setShowAuthorModal(true);
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
        setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
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
        setSaveCount(prev => isSaved ? prev - 1 : prev + 1);
      }
    } catch (error) {
      console.error('Error toggling save:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!paper) return null;

  return (
    <>
      <CategoriesModal
        visible={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        category={paper.category}
        isFollowing={isFollowingCategory}
        onConfirm={handleCategoryConfirm}
      />
      
      <AuthorModal
        visible={showAuthorModal}
        onClose={() => {
          setShowAuthorModal(false);
          onClose();
        }}
        author={selectedAuthor}
      />

      <Modal
        visible={visible && !showCategoryModal && !showAuthorModal}
        animationType="slide"
        transparent={true}
        onRequestClose={onClose}
      >
        <View className="flex-1 bg-black/50">
          <View className="flex-1 mt-20 bg-white rounded-t-3xl">
            {/* Header */}
            <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
              <TouchableOpacity onPress={onClose} className="p-2">
                <Image source={icons.backArrow} className="w-6 h-6" tintColor="black" />
              </TouchableOpacity>
              <View className="flex-row space-x-4">
                <View className="items-center">
                  <TouchableOpacity onPress={handleLike} disabled={loading} className="p-2">
                    {isLiked ? <Icon name="heart" size={24} color="black" /> : <Icon name="heart-o" size={24} color="black" />}
                  </TouchableOpacity>
                  <Text className="text-xs text-gray-600">{likeCount}</Text>
                </View>
                <View className="items-center">
                  <TouchableOpacity onPress={handleSave} disabled={loading} className="p-2">
                    {isSaved ? <Icon name="bookmark" size={24} color="black" /> : <Icon name="bookmark-o" size={24} color="black" />}
                  </TouchableOpacity>
                  <Text className="text-xs text-gray-600">{saveCount}</Text>
                </View>
              </View>
            </View>

            {/* Content */}
            <ScrollView className="flex-1 p-4">
              <Text className="text-2xl font-JakartaBold text-gray-900 mb-2">
                {paper.title}
              </Text>

              {/* Authors and Date */}
              <View className="flex-row items-center mb-4">
                <TouchableOpacity 
                  onPress={handleCategoryPress}
                  className="bg-blue-200 px-2 py-1 rounded-full mr-2"
                >
                  <View className="flex-row items-center">
                    <Text className="text-xs text-blue-800">{paper.category}</Text>
                    {isFollowingCategory && (
                      <Icon name="check" size={12} color="#1e40af" style={{ marginLeft: 4 }} />
                    )}
                  </View>
                </TouchableOpacity>
                <Text className="text-xs text-gray-600">
                  {new Date(paper.published).toLocaleDateString()}
                </Text>
              </View>

              <View className="flex-row flex-wrap mb-4">
                {Array.isArray(paper.authors) ? (
                  paper.authors.map((author: string, index: number) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => handleAuthorPress(author)}
                      className="mr-2 mb-2"
                    >
                      <Text className="text-base text-blue-600">{author}{index < paper.authors.length - 1 ? ',' : ''}</Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <TouchableOpacity
                    onPress={() => handleAuthorPress(paper.authors)}
                    className="mr-2 mb-2"
                  >
                    <Text className="text-base text-blue-600">{paper.authors}</Text>
                  </TouchableOpacity>
                )}
              </View>

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
    </>
  );
};

export default PaperDetailModal; 