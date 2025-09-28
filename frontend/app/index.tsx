import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  SafeAreaView,
  Platform,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface PromptCategory {
  id: string;
  name: string;
  description: string;
  prompts: string[];
}

interface GeneratedImage {
  id: string;
  prompt: string;
  generated_image: string;
  original_image?: string;
  created_at: string;
  prompt_category?: string;
}

export default function ImageGeneratorApp() {
  const [promptCategories, setPromptCategories] = useState<PromptCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<PromptCategory | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [currentView, setCurrentView] = useState<'home' | 'prompts' | 'generate' | 'gallery'>('home');
  const [isGenerating, setIsGenerating] = useState(false);
  const [recentImage, setRecentImage] = useState<GeneratedImage | null>(null);

  const API_BASE = process.env.EXPO_BACKEND_URL || 'http://localhost:8001';

  useEffect(() => {
    loadPromptCategories();
    loadRecentImages();
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'We need camera roll permissions to select images.');
    }
  };

  const loadPromptCategories = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/prompts`);
      const data = await response.json();
      setPromptCategories(data.prompts || []);
    } catch (error) {
      console.error('Error loading prompt categories:', error);
      Alert.alert('Error', 'Failed to load prompt categories');
    }
  };

  const loadRecentImages = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/images?limit=10`);
      const data = await response.json();
      setGeneratedImages(data.images || []);
      if (data.images && data.images.length > 0) {
        setRecentImage(data.images[0]);
      }
    } catch (error) {
      console.error('Error loading images:', error);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setSelectedImage(result.assets[0].base64);
        setCurrentView('prompts');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'We need camera permissions to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setSelectedImage(result.assets[0].base64);
        setCurrentView('prompts');
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const generateImage = async () => {
    if (!selectedPrompt) {
      Alert.alert('Error', 'Please select a prompt first');
      return;
    }

    setIsGenerating(true);
    
    try {
      const requestBody = {
        prompt: selectedPrompt,
        image_data: selectedImage,
        prompt_category: selectedCategory?.id || null,
      };

      const response = await fetch(`${API_BASE}/api/generate-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Failed to generate image');
      }

      const newImage = await response.json();
      setRecentImage(newImage);
      setGeneratedImages([newImage, ...generatedImages]);
      setCurrentView('generate');
      
      // Reset selections
      setSelectedImage(null);
      setSelectedPrompt('');
      setSelectedCategory(null);
      
    } catch (error) {
      console.error('Error generating image:', error);
      Alert.alert('Error', 'Failed to generate image. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const renderHomeScreen = () => (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AI Image Generator</Text>
        <Text style={styles.subtitle}>Create stunning images with AI</Text>
      </View>

      {recentImage && (
        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>Recent Creation</Text>
          <TouchableOpacity 
            style={styles.recentImageContainer}
            onPress={() => setCurrentView('gallery')}
          >
            <Image 
              source={{ uri: `data:image/png;base64,${recentImage.generated_image}` }}
              style={styles.recentImage}
            />
            <View style={styles.recentImageOverlay}>
              <Text style={styles.recentImageText} numberOfLines={2}>
                {recentImage.prompt}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.actionsSection}>
        <TouchableOpacity style={styles.primaryButton} onPress={() => setCurrentView('prompts')}>
          <Ionicons name="create-outline" size={24} color="white" />
          <Text style={styles.primaryButtonText}>Generate from Text</Text>
        </TouchableOpacity>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.secondaryButton} onPress={pickImage}>
            <Ionicons name="images-outline" size={20} color="#007AFF" />
            <Text style={styles.secondaryButtonText}>Upload Photo</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.secondaryButton} onPress={takePhoto}>
            <Ionicons name="camera-outline" size={20} color="#007AFF" />
            <Text style={styles.secondaryButtonText}>Take Photo</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.galleryButton} 
          onPress={() => setCurrentView('gallery')}
        >
          <Ionicons name="grid-outline" size={20} color="#666" />
          <Text style={styles.galleryButtonText}>View Gallery ({generatedImages.length})</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPromptsScreen = () => (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => setCurrentView('home')}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Choose Style</Text>
      </View>

      {selectedImage && (
        <View style={styles.selectedImageContainer}>
          <Text style={styles.sectionTitle}>Your Image</Text>
          <Image 
            source={{ uri: `data:image/jpeg;base64,${selectedImage}` }}
            style={styles.selectedImage}
          />
        </View>
      )}

      <ScrollView style={styles.promptsContainer}>
        {promptCategories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryCard,
              selectedCategory?.id === category.id && styles.selectedCategoryCard
            ]}
            onPress={() => {
              setSelectedCategory(category);
              setSelectedPrompt(category.prompts[0]);
            }}
          >
            <Text style={styles.categoryName}>{category.name}</Text>
            <Text style={styles.categoryDescription}>{category.description}</Text>
            
            {selectedCategory?.id === category.id && (
              <View style={styles.promptsList}>
                {category.prompts.map((prompt, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.promptButton,
                      selectedPrompt === prompt && styles.selectedPromptButton
                    ]}
                    onPress={() => setSelectedPrompt(prompt)}
                  >
                    <Text style={[
                      styles.promptText,
                      selectedPrompt === prompt && styles.selectedPromptText
                    ]}>
                      {prompt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {selectedPrompt && (
        <TouchableOpacity 
          style={styles.generateButton}
          onPress={generateImage}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="flash" size={20} color="white" />
              <Text style={styles.generateButtonText}>Generate Image</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );

  const renderGenerateScreen = () => (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => setCurrentView('home')}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Generated Image</Text>
      </View>

      {recentImage && (
        <ScrollView style={styles.resultContainer}>
          <View style={styles.imageResult}>
            <Image 
              source={{ uri: `data:image/png;base64,${recentImage.generated_image}` }}
              style={styles.generatedImage}
            />
            <Text style={styles.promptUsed}>"{recentImage.prompt}"</Text>
          </View>

          <View style={styles.resultActions}>
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={() => {
                setSelectedImage(null);
                setCurrentView('prompts');
              }}
            >
              <Ionicons name="refresh" size={20} color="white" />
              <Text style={styles.primaryButtonText}>Generate Another</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={() => setCurrentView('gallery')}
            >
              <Ionicons name="grid-outline" size={20} color="#007AFF" />
              <Text style={styles.secondaryButtonText}>View Gallery</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );

  const renderGalleryScreen = () => (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => setCurrentView('home')}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Gallery</Text>
      </View>

      <ScrollView style={styles.gallery}>
        <View style={styles.galleryGrid}>
          {generatedImages.map((image) => (
            <TouchableOpacity
              key={image.id}
              style={styles.galleryItem}
              onPress={() => {
                setRecentImage(image);
                setCurrentView('generate');
              }}
            >
              <Image 
                source={{ uri: `data:image/png;base64,${image.generated_image}` }}
                style={styles.galleryImage}
              />
            </TouchableOpacity>
          ))}
        </View>
        
        {generatedImages.length === 0 && (
          <View style={styles.emptyGallery}>
            <Ionicons name="images-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No images generated yet</Text>
            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={() => setCurrentView('home')}
            >
              <Text style={styles.secondaryButtonText}>Start Creating</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      {currentView === 'home' && renderHomeScreen()}
      {currentView === 'prompts' && renderPromptsScreen()}
      {currentView === 'generate' && renderGenerateScreen()}
      {currentView === 'gallery' && renderGalleryScreen()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  recentSection: {
    padding: 20,
    backgroundColor: 'white',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  recentImageContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  recentImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  recentImageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 12,
  },
  recentImageText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  actionsSection: {
    padding: 20,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  secondaryButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  galleryButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  galleryButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  selectedImageContainer: {
    padding: 20,
    backgroundColor: 'white',
    marginBottom: 8,
  },
  selectedImage: {
    width: '100%',
    height: 150,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  promptsContainer: {
    flex: 1,
    padding: 20,
  },
  categoryCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedCategoryCard: {
    borderColor: '#007AFF',
  },
  categoryName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  promptsList: {
    marginTop: 12,
  },
  promptButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  selectedPromptButton: {
    backgroundColor: '#e3f2fd',
    borderColor: '#007AFF',
  },
  promptText: {
    fontSize: 14,
    color: '#333',
  },
  selectedPromptText: {
    color: '#007AFF',
    fontWeight: '500',
  },
  generateButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    margin: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  resultContainer: {
    flex: 1,
  },
  imageResult: {
    padding: 20,
    backgroundColor: 'white',
    marginBottom: 8,
  },
  generatedImage: {
    width: '100%',
    height: 300,
    borderRadius: 16,
    resizeMode: 'cover',
    marginBottom: 16,
  },
  promptUsed: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  resultActions: {
    padding: 20,
  },
  gallery: {
    flex: 1,
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
  },
  galleryItem: {
    width: (width - 48) / 2,
    height: (width - 48) / 2,
    margin: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  emptyGallery: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
    marginBottom: 24,
  },
});