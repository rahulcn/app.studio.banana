import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { GeneratedImage } from '../lib/supabase';

interface GalleryScreenProps {
  onBack: () => void;
}

const { width } = Dimensions.get('window');
const imageSize = (width - 60) / 2; // 2 columns with padding

export const GalleryScreen: React.FC<GalleryScreenProps> = ({ onBack }) => {
  const { session } = useAuth();
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/images?limit=50`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setImages(data.images || []);
      } else {
        throw new Error('Failed to load images');
      }
    } catch (error) {
      console.error('Failed to load images:', error);
      Alert.alert('Error', 'Failed to load your images');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadImages(true);
  };

  const showImageDetails = (image: GeneratedImage) => {
    setSelectedImage(image);
  };

  const closeImageDetails = () => {
    setSelectedImage(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Gallery</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading your images...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Image Detail Modal
  if (selectedImage) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={closeImageDetails}>
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Image Details</Text>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.detailContainer}>
          <Image
            source={{ uri: `https://example.com/placeholder-${selectedImage.id}.png` }}
            style={styles.detailImage}
            resizeMode="contain"
          />
          
          <View style={styles.detailInfo}>
            <Text style={styles.detailPrompt}>"{selectedImage.generation_prompt}"</Text>
            
            <View style={styles.detailMetadata}>
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Style:</Text>
                <Text style={styles.metadataValue}>{selectedImage.generation_style || 'Default'}</Text>
              </View>
              
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Model:</Text>
                <Text style={styles.metadataValue}>{selectedImage.generation_model}</Text>
              </View>
              
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Created:</Text>
                <Text style={styles.metadataValue}>{formatDate(selectedImage.created_at)}</Text>
              </View>
              
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Source:</Text>
                <Text style={styles.metadataValue}>
                  {selectedImage.usage_source === 'free_quota' ? 'Free Tier' : 
                   selectedImage.usage_source === 'paid_credits' ? 'Paid Credits' : 'Pro Plan'}
                </Text>
              </View>
            </View>

            <View style={styles.detailActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => Alert.alert('Coming Soon', 'Download feature will be available soon!')}
              >
                <Ionicons name="download" size={20} color="#007AFF" />
                <Text style={styles.actionButtonText}>Download</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => Alert.alert('Coming Soon', 'Share feature will be available soon!')}
              >
                <Ionicons name="share" size={20} color="#007AFF" />
                <Text style={styles.actionButtonText}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Gallery</Text>
        <Text style={styles.imageCount}>{images.length} images</Text>
      </View>

      {images.length === 0 ? (
        <ScrollView
          style={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          contentContainerStyle={styles.emptyContainer}
        >
          <Ionicons name="images-outline" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>No Images Yet</Text>
          <Text style={styles.emptyText}>
            Generate your first AI image to start building your gallery
          </Text>
          <TouchableOpacity style={styles.generateButton} onPress={onBack}>
            <Text style={styles.generateButtonText}>Generate Image</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
          <View style={styles.gallery}>
            {images.map((image) => (
              <TouchableOpacity
                key={image.id}
                style={styles.imageItem}
                onPress={() => showImageDetails(image)}
              >
                <Image
                  source={{ uri: `https://example.com/placeholder-${image.id}.png` }}
                  style={styles.galleryImage}
                  resizeMode="cover"
                />
                <View style={styles.imageOverlay}>
                  <Text style={styles.imageDate} numberOfLines={1}>
                    {formatDate(image.created_at)}
                  </Text>
                  <View style={styles.usageSourceBadge}>
                    <Text style={styles.usageSourceText}>
                      {image.usage_source === 'free_quota' ? 'FREE' : 
                       image.usage_source === 'paid_credits' ? 'PAID' : 'PRO'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  imageCount: {
    fontSize: 14,
    color: '#666',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  generateButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  generateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  gallery: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    justifyContent: 'space-between',
  },
  imageItem: {
    width: imageSize,
    height: imageSize,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  imageDate: {
    color: 'white',
    fontSize: 10,
    flex: 1,
  },
  usageSourceBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  usageSourceText: {
    color: 'white',
    fontSize: 8,
    fontWeight: 'bold',
  },
  detailContainer: {
    padding: 20,
  },
  detailImage: {
    width: '100%',
    height: 300,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  detailInfo: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  detailPrompt: {
    fontSize: 16,
    color: '#1a1a1a',
    fontStyle: 'italic',
    marginBottom: 16,
    lineHeight: 22,
  },
  detailMetadata: {
    marginBottom: 20,
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metadataLabel: {
    fontSize: 14,
    color: '#666',
  },
  metadataValue: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  detailActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
});