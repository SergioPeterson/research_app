import * as React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

interface AuthorModalProps {
  visible: boolean;
  onClose: () => void;
  author: string;
}

const { width } = Dimensions.get('window');

const AuthorModal = ({
  visible,
  onClose,
  author,
}: AuthorModalProps) => {
  // console.log('AuthorModal props:', { visible, author }); // Debug log

  // Placeholder data - will be replaced with API data later
  const authorData = {
    name: author,
    organizations: ['Stanford University', 'Google Research'],
    labs: ['AI Lab', 'Machine Learning Research Group'],
    bio: 'Dr. Smith is a leading researcher in the field of artificial intelligence and machine learning. With over 10 years of experience, they have published numerous papers in top-tier conferences and journals.',
    recentPapers: [
      {
        title: 'Advances in Deep Learning',
        year: 2024,
        category: 'cs.AI'
      },
      {
        title: 'Neural Network Architectures',
        year: 2023,
        category: 'cs.LG'
      },
      {
        title: 'Machine Learning Applications',
        year: 2023,
        category: 'cs.CL'
      }
    ]
  };

  if (!visible) {
    // console.log('AuthorModal not visible, returning null'); // Debug log
    return null;
  }

  // console.log('AuthorModal rendering with data:', authorData); // Debug log

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={[styles.overlay]}>
        <View style={[styles.modalContainer]}>
          <ScrollView style={styles.scrollView}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.authorName}>{authorData.name}</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Icon name="times" size={24} color="#4b5563" />
              </TouchableOpacity>
            </View>

            {/* Organizations */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Organizations</Text>
              <View style={styles.tagContainer}>
                {authorData.organizations.map((org, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{org}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Labs */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Research Labs</Text>
              <View style={styles.tagContainer}>
                {authorData.labs.map((lab, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{lab}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Bio */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Biography</Text>
              <Text style={styles.bioText}>{authorData.bio}</Text>
            </View>

            {/* Recent Papers */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Papers</Text>
              {authorData.recentPapers.map((paper, index) => (
                <View key={index} style={styles.paperItem}>
                  <Text style={styles.paperTitle}>{paper.title}</Text>
                  <View style={styles.paperMeta}>
                    <Text style={styles.paperYear}>{paper.year}</Text>
                    <View style={styles.categoryTag}>
                      <Text style={styles.categoryText}>{paper.category}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    width: width * 0.9,
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  scrollView: {
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  authorName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
  },
  closeButton: {
    padding: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '500',
  },
  bioText: {
    fontSize: 16,
    color: '#4b5563',
    lineHeight: 24,
  },
  paperItem: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  paperTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 8,
  },
  paperMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paperYear: {
    fontSize: 14,
    color: '#6b7280',
  },
  categoryTag: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    color: '#4b5563',
  },
});

export default AuthorModal;
