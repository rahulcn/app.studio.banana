import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  Image,
  Modal,
  Dimensions,
} from 'react-native';
import '../global.css';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';

interface User {
  email: string;
}

interface FreeTier {
  usageCount: number;
  remainingUses: number;
  hasUsesLeft: () => boolean;
  incrementUsage: () => Promise<number>;
  isLoading: boolean;
  FREE_LIMIT: number;
}

// Simple auth state management
const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    // Mock sign in
    setTimeout(() => {
      setUser({ email });
      setLoading(false);
    }, 1000);
  };

  const signOut = () => {
    setUser(null);
  };

  return { user, loading, signIn, signOut };
};

// Free Tier Manager (local storage for anonymous users)
const useFreeTier = (): FreeTier => {
  const [usageCount, setUsageCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  const FREE_LIMIT = 100;

  useEffect(() => {
    // Load usage from local storage
    const loadUsage = async () => {
      try {
        // In a real app, you'd use AsyncStorage
        if (typeof localStorage !== 'undefined') {
          const stored = localStorage.getItem('free_usage_count');
          setUsageCount(stored ? parseInt(stored) : 0);
        }
      } catch (error) {
        console.log('Error loading usage:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadUsage();
  }, []);

  const incrementUsage = async (): Promise<number> => {
    const newCount = usageCount + 1;
    setUsageCount(newCount);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('free_usage_count', newCount.toString());
      }
    } catch (error) {
      console.log('Error saving usage:', error);
    }
    return newCount;
  };

  const getRemainingUses = () => Math.max(0, FREE_LIMIT - usageCount);
  const hasUsesLeft = () => usageCount < FREE_LIMIT;

  return {
    usageCount,
    remainingUses: getRemainingUses(),
    hasUsesLeft,
    incrementUsage,
    isLoading,
    FREE_LIMIT
  };
};

// Welcome/Onboarding Screen
const WelcomeScreen: React.FC<{ onGetStarted: () => void }> = ({ onGetStarted }) => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.welcomeContainer}>
        <View style={styles.welcomeHeader}>
          <View style={styles.iconContainer}>
            <Ionicons name="image" size={64} color="#007AFF" />
          </View>
          <Text style={styles.welcomeTitle}>AI Image Generator</Text>
          <Text style={styles.welcomeSubtitle}>
            Transform your ideas into stunning images with AI
          </Text>
        </View>

        <View style={styles.benefitsSection}>
          <View style={styles.benefit}>
            <Ionicons name="flash" size={32} color="#007AFF" />
            <Text style={styles.benefitTitle}>Instant Generation</Text>
            <Text style={styles.benefitText}>Create stunning images in seconds</Text>
          </View>
          
          <View style={styles.benefit}>
            <Ionicons name="color-palette" size={32} color="#FF6B35" />
            <Text style={styles.benefitTitle}>Multiple Styles</Text>
            <Text style={styles.benefitText}>Artistic, photorealistic, vintage & more</Text>
          </View>
          
          <View style={styles.benefit}>
            <Ionicons name="gift" size={32} color="#34C759" />
            <Text style={styles.benefitTitle}>Free to Start</Text>
            <Text style={styles.benefitText}>100 free generations, no signup required</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.getStartedButton} onPress={onGetStarted}>
          <Text style={styles.getStartedButtonText}>Get Started Free</Text>
          <Ionicons name="arrow-forward" size={20} color="white" />
        </TouchableOpacity>

        <Text style={styles.freeTrialText}>
          ✨ Start with 100 free image generations
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

// Curated prompt interface
interface CuratedPrompt {
  id: number;
  title: string;
  description: string;
  prompt: string;
  category: string;
}

// Full-screen Image Preview Component
const FullscreenImagePreview: React.FC<{
  visible: boolean;
  imageUri: string;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
}> = ({ visible, imageUri, onClose, onSave, saving }) => {
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  return (
    <Modal visible={visible} transparent={true} animationType="fade">
      <View style={styles.fullscreenModalContainer}>
        {/* Header with close and save buttons */}
        <SafeAreaView style={styles.fullscreenHeader}>
          <TouchableOpacity style={styles.fullscreenCloseButton} onPress={onClose}>
            <Ionicons name="close" size={28} color="white" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.fullscreenSaveButton, saving && styles.fullscreenSaveButtonDisabled]} 
            onPress={onSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="download" size={24} color="white" />
            )}
            <Text style={styles.fullscreenSaveButtonText}>
              {saving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </SafeAreaView>

        {/* Image container with zoom and pan capabilities */}
        <View style={styles.fullscreenImageContainer}>
          <ScrollView
            maximumZoomScale={3}
            minimumZoomScale={0.5}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.fullscreenScrollContent}
          >
            <Image
              source={{ uri: imageUri }}
              style={[
                styles.fullscreenImage,
                {
                  width: screenWidth,
                  height: screenHeight * 0.8, // Leave space for header
                }
              ]}
              resizeMode="contain"
            />
          </ScrollView>
        </View>

        {/* Bottom instructions */}
        <View style={styles.fullscreenFooter}>
          <Text style={styles.fullscreenInstructions}>
            📱 Pinch to zoom • Drag to pan • Tap close to exit
          </Text>
        </View>
      </View>
    </Modal>
  );
};

// Free Tier Generate Screen with Curated Prompts
const FreeGenerateScreen: React.FC<{
  onBack: () => void;
  freeTier: FreeTier;
  onSignupPrompt: () => void;
}> = ({ onBack, freeTier, onSignupPrompt }) => {
  const [selectedPromptId, setSelectedPromptId] = useState<number | null>(null);
  const [curatedPrompts, setCuratedPrompts] = useState<CuratedPrompt[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [loadingPrompts, setLoadingPrompts] = useState(true);
  const [showFullscreenPreview, setShowFullscreenPreview] = useState(false);
  const [savingImage, setSavingImage] = useState(false);

  const categories = ['All', 'Professional', 'Artistic', 'Lifestyle'];

  // Load curated prompts on component mount
  useEffect(() => {
    const loadCuratedPrompts = async () => {
      try {
        console.log('📋 Loading curated prompts from backend...');
        const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001'}/api/prompts`);
        
        if (!response.ok) {
          throw new Error(`Failed to load prompts: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`✅ Loaded ${data.prompts.length} curated prompts`);
        setCuratedPrompts(data.prompts);
      } catch (error) {
        console.error('❌ Failed to load curated prompts:', error);
        Alert.alert('Error', 'Failed to load prompts. Please try again.');
      } finally {
        setLoadingPrompts(false);
      }
    };
    
    loadCuratedPrompts();
  }, []);

  // Filter prompts by category
  const filteredPrompts = selectedCategory === 'All' 
    ? curatedPrompts 
    : curatedPrompts.filter(prompt => prompt.category === selectedCategory);

  // Save image to device gallery
  const saveImageToGallery = async () => {
    if (!generatedImage) return;
    
    setSavingImage(true);
    
    try {
      // Request media library permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'We need access to your photo library to save images.');
        return;
      }

      // Convert base64 to file
      const base64Data = generatedImage.replace('data:image/png;base64,', '');
      const filename = `ai_generated_${Date.now()}.png`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;
      
      // Write base64 data to file
      await FileSystem.writeAsStringAsync(fileUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Save to photo library
      const asset = await MediaLibrary.createAssetAsync(fileUri);
      
      // Get or create AI Images album
      let album = await MediaLibrary.getAlbumAsync('AI Generated Images');
      if (!album) {
        album = await MediaLibrary.createAlbumAsync('AI Generated Images', asset, false);
      } else {
        await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
      }

      // Clean up temporary file
      await FileSystem.deleteAsync(fileUri);

      Alert.alert(
        'Image Saved! 📸',
        'Your AI-generated image has been saved to your photo gallery in the "AI Generated Images" album.',
        [{ text: 'Great!', style: 'default' }]
      );

    } catch (error) {
      console.error('Error saving image:', error);
      Alert.alert(
        'Save Failed',
        'Unable to save image to gallery. Please try again.',
        [{ text: 'OK', style: 'default' }]
      );
    } finally {
      setSavingImage(false);
    }
  };

  const pickReferenceImage = async () => {
    try {
      // Request permission to access media library
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'We need access to your photos to select reference images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setReferenceImage(result.assets[0].base64);
      }
    } catch (error) {
      console.error('Error picking reference image:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const takeReferencePhoto = async () => {
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
        setReferenceImage(result.assets[0].base64);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const removeReferenceImage = () => {
    Alert.alert(
      'Remove Reference Image',
      'Are you sure you want to remove the reference image?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', onPress: () => setReferenceImage(null) },
      ]
    );
  };

  const handleGenerate = async () => {
    if (!selectedPromptId) {
      Alert.alert('Error', 'Please select a prompt style');
      return;
    }

    if (!referenceImage) {
      Alert.alert('Error', 'Please upload or take a reference photo first. All curated prompts require a reference image.');
      return;
    }

    if (!freeTier.hasUsesLeft()) {
      onSignupPrompt();
      return;
    }

    setGenerating(true);
    
    try {
      const selectedPrompt = curatedPrompts.find(p => p.id === selectedPromptId);
      if (!selectedPrompt) {
        throw new Error('Selected prompt not found');
      }

      const requestBody = {
        prompt_id: selectedPromptId,
        image_data: referenceImage,
      };

      console.log(`🎨 Generating image with curated prompt: ${selectedPrompt.title}`);
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001'}/api/generate-with-prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}: Failed to generate image`);
      }

      const result = await response.json();
      console.log('✅ Curated image generated successfully');

      // Set the generated image (base64 from backend)
      setGeneratedImage(`data:image/png;base64,${result.generated_image}`);
      
      // Update usage count
      await freeTier.incrementUsage();
      
      Alert.alert(
        'Success!', 
        `AI image generated with "${selectedPrompt.title}" style! You have ${freeTier.remainingUses - 1} free generations remaining.`
      );
      
    } catch (error) {
      console.error('❌ Image generation failed:', error);
      
      let errorMessage = 'Failed to generate image. Please try again.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      Alert.alert('Generation Failed', errorMessage);
      
    } finally {
      setGenerating(false);
    }
  };

  if (generatedImage) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => {
            setGeneratedImage(null);
            setSelectedPromptId(null);
            setReferenceImage(null);
          }}>
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Generated Image</Text>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.resultContainer}>
          <TouchableOpacity 
            style={styles.imagePreviewContainer}
            onPress={() => setShowFullscreenPreview(true)}
            activeOpacity={0.8}
          >
            <Image
              source={{ uri: generatedImage }}
              style={styles.generatedImage}
              resizeMode="cover"
            />
            <View style={styles.imageOverlay}>
              <Ionicons name="expand" size={24} color="white" />
              <Text style={styles.imageOverlayText}>Tap to view full screen</Text>
            </View>
          </TouchableOpacity>
          
          {/* Fullscreen Preview Modal */}
          <FullscreenImagePreview
            visible={showFullscreenPreview}
            imageUri={generatedImage}
            onClose={() => setShowFullscreenPreview(false)}
            onSave={saveImageToGallery}
            saving={savingImage}
          />
          
          <View style={styles.resultInfo}>
            {selectedPromptId && (
              <>
                <Text style={styles.promptTitle}>
                  {curatedPrompts.find(p => p.id === selectedPromptId)?.title}
                </Text>
                <Text style={styles.promptDescription}>
                  {curatedPrompts.find(p => p.id === selectedPromptId)?.description}
                </Text>
                <Text style={styles.categoryText}>
                  Category: {curatedPrompts.find(p => p.id === selectedPromptId)?.category}
                </Text>
              </>
            )}
          </View>

          <View style={styles.usageInfo}>
            <Text style={styles.usageText}>
              {freeTier.remainingUses > 0 
                ? `${freeTier.remainingUses} free generations remaining` 
                : 'Free tier exhausted'}
            </Text>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.saveButton, savingImage && styles.saveButtonDisabled]}
              onPress={saveImageToGallery}
              disabled={savingImage}
            >
              {savingImage ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="download" size={20} color="white" />
              )}
              <Text style={styles.saveButtonText}>
                {savingImage ? 'Saving...' : 'Save to Gallery'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                setGeneratedImage(null);
                setSelectedPromptId(null);
                setReferenceImage(null);
              }}
            >
              <Ionicons name="add" size={20} color="#007AFF" />
              <Text style={styles.secondaryButtonText}>Generate Another</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Generate Image</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.freeUsageCard}>
          <Text style={styles.freeUsageTitle}>Free Tier</Text>
          <Text style={styles.freeUsageText}>
            {freeTier.remainingUses} / {freeTier.FREE_LIMIT} free generations remaining
          </Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${(freeTier.usageCount / freeTier.FREE_LIMIT) * 100}%` }
              ]} 
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reference Image (Optional)</Text>
          
          {referenceImage ? (
            <View style={styles.referenceImageContainer}>
              <Image 
                source={{ uri: `data:image/jpeg;base64,${referenceImage}` }}
                style={styles.referenceImage}
                resizeMode="cover"
              />
              <TouchableOpacity 
                style={styles.removeReferenceButton}
                onPress={removeReferenceImage}
              >
                <Ionicons name="close-circle" size={24} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.referenceOptions}>
              <TouchableOpacity style={styles.referenceButton} onPress={pickReferenceImage}>
                <Ionicons name="images-outline" size={20} color="#007AFF" />
                <Text style={styles.referenceButtonText}>Choose from Gallery</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.referenceButton} onPress={takeReferencePhoto}>
                <Ionicons name="camera-outline" size={20} color="#007AFF" />
                <Text style={styles.referenceButtonText}>Take Photo</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {referenceImage && (
            <Text style={styles.referenceHint}>
              The AI will use this image as inspiration for style, composition, or subject matter.
            </Text>
          )}
        </View>

        {loadingPrompts ? (
          <View style={styles.loadingPromptsContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingPromptsText}>Loading curated prompts...</Text>
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Choose Style Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.stylesContainer}>
                  {categories.map((category) => (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.styleCard,
                        selectedCategory === category && styles.selectedStyleCard,
                      ]}
                      onPress={() => setSelectedCategory(category)}
                    >
                      <Text
                        style={[
                          styles.styleName,
                          selectedCategory === category && styles.selectedStyleName,
                        ]}
                      >
                        {category}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Select Professional Style ({filteredPrompts.length} available)
              </Text>
              <Text style={styles.promptHint}>
                Choose from our curated collection of professional AI prompts designed for high-quality image generation.
              </Text>
              
              <ScrollView style={styles.promptsScrollView} showsVerticalScrollIndicator={false}>
                {filteredPrompts.map((prompt) => (
                  <TouchableOpacity
                    key={prompt.id}
                    style={[
                      styles.promptCard,
                      selectedPromptId === prompt.id && styles.selectedPromptCard,
                    ]}
                    onPress={() => setSelectedPromptId(prompt.id)}
                  >
                    <View style={styles.promptCardHeader}>
                      <Text style={[
                        styles.promptTitle,
                        selectedPromptId === prompt.id && styles.selectedPromptTitle
                      ]}>
                        {prompt.title}
                      </Text>
                      <View style={[
                        styles.categoryBadge,
                        { backgroundColor: prompt.category === 'Professional' ? '#007AFF' : 
                                         prompt.category === 'Artistic' ? '#FF6B35' : '#34C759' }
                      ]}>
                        <Text style={styles.categoryBadgeText}>{prompt.category}</Text>
                      </View>
                    </View>
                    <Text style={styles.promptDescription}>{prompt.description}</Text>
                    {selectedPromptId === prompt.id && (
                      <View style={styles.selectedIndicator}>
                        <Ionicons name="checkmark-circle" size={20} color="#007AFF" />
                        <Text style={styles.selectedText}>Selected</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </>
        )}

        <TouchableOpacity
          style={[
            styles.generateButton,
            (!freeTier.hasUsesLeft() || generating || !selectedPromptId || !referenceImage) && styles.generateButtonDisabled,
          ]}
          onPress={handleGenerate}
          disabled={!freeTier.hasUsesLeft() || generating || !selectedPromptId || !referenceImage}
        >
          {generating ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="flash" size={20} color="white" />
              <Text style={styles.generateButtonText}>
                {!freeTier.hasUsesLeft() 
                  ? 'Limit Reached (100/100)' 
                  : !selectedPromptId
                  ? 'Select a Style First'
                  : !referenceImage
                  ? 'Add Reference Photo'
                  : 'Generate Image'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {generating && (
          <View style={styles.generatingInfo}>
            <Text style={styles.generatingText}>
              Creating your masterpiece... ✨
            </Text>
          </View>
        )}

        {!freeTier.hasUsesLeft() && (
          <View style={styles.upgradePrompt}>
            <Text style={styles.upgradeTitle}>Free tier limit reached!</Text>
            <Text style={styles.upgradeText}>
              You've used all 100 free image generations. The app is currently in testing mode.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// Signup Prompt Screen
const SignupPromptScreen: React.FC<{
  onSignup: () => void;
  onBack: () => void;
}> = ({ onSignup, onBack }) => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.signupPromptContainer}>
        <View style={styles.signupHeader}>
          <Ionicons name="star" size={64} color="#FF6B35" />
          <Text style={styles.signupTitle}>Unlock Unlimited Access</Text>
          <Text style={styles.signupSubtitle}>
            You've used all your free generations! Create an account to continue.
          </Text>
        </View>

        <View style={styles.premiumFeatures}>
          <View style={styles.premiumFeature}>
            <Ionicons name="infinite" size={24} color="#007AFF" />
            <Text style={styles.premiumFeatureText}>Unlimited generations</Text>
          </View>
          <View style={styles.premiumFeature}>
            <Ionicons name="cloud-upload" size={24} color="#007AFF" />
            <Text style={styles.premiumFeatureText}>Cloud storage & sync</Text>
          </View>
          <View style={styles.premiumFeature}>
            <Ionicons name="color-palette" size={24} color="#007AFF" />
            <Text style={styles.premiumFeatureText}>Premium styles & effects</Text>
          </View>
          <View style={styles.premiumFeature}>
            <Ionicons name="download" size={24} color="#007AFF" />
            <Text style={styles.premiumFeatureText}>High-res downloads</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.signupButton} onPress={onSignup}>
          <Text style={styles.signupButtonText}>Create Account</Text>
          <Ionicons name="arrow-forward" size={20} color="white" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.backToFreeButton} onPress={onBack}>
          <Text style={styles.backToFreeText}>Continue with free tier</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

// Auth Screen Component
const AuthScreen: React.FC<{
  onSignIn: (email: string, password: string) => void;
  onBack: () => void;
}> = ({ onSignIn, onBack }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    await onSignIn(email, password);
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.authHeader}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.authHeaderTitle}>Create Account</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.authContainer}>
        <View style={styles.authFormHeader}>
          <View style={styles.iconContainer}>
            <Ionicons name="image" size={48} color="#007AFF" />
          </View>
          <Text style={styles.title}>AI Image Generator SaaS</Text>
          <Text style={styles.subtitle}>
            Create stunning images with AI • Free tier: 5 generations
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.formTitle}>Welcome back</Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignIn}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.features}>
          <View style={styles.feature}>
            <Ionicons name="flash" size={20} color="#007AFF" />
            <Text style={styles.featureText}>Fast AI generation</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="images" size={20} color="#007AFF" />
            <Text style={styles.featureText}>Multiple styles</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="card" size={20} color="#007AFF" />
            <Text style={styles.featureText}>Secure payments</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// Home Screen Component
const HomeScreen: React.FC<{
  user: User;
  onSignOut: () => void;
}> = ({ user, onSignOut }) => {
  const [currentView, setCurrentView] = useState('home');

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', onPress: onSignOut },
      ]
    );
  };

  if (currentView === 'generate') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setCurrentView('home')}>
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Generate Image</Text>
        </View>
        <View style={styles.content}>
          <Text style={styles.comingSoon}>🎨 AI Image Generation</Text>
          <Text style={styles.comingSoonText}>
            Connected to NanoBanana API (Gemini 2.5 Flash Image)
          </Text>
          <TouchableOpacity style={styles.backButtonStyle} onPress={() => setCurrentView('home')}>
            <Text style={styles.backButtonText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.homeHeader}>
        <View>
          <Text style={styles.greeting}>Welcome!</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>
        <TouchableOpacity style={styles.signOutIcon} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.statsCard}>
          <Text style={styles.cardTitle}>Your Plan</Text>
          <View style={styles.planInfo}>
            <View style={styles.planBadge}>
              <Text style={styles.planText}>FREE</Text>
            </View>
            <Text style={styles.creditsText}>5 free generations available</Text>
          </View>
        </View>

        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => setCurrentView('generate')}
          >
            <Ionicons name="flash" size={32} color="#007AFF" />
            <Text style={styles.actionTitle}>Generate Image</Text>
            <Text style={styles.actionSubtitle}>Create AI images from text</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <Ionicons name="images" size={32} color="#007AFF" />
            <Text style={styles.actionTitle}>Gallery</Text>
            <Text style={styles.actionSubtitle}>View generated images</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <Ionicons name="person" size={32} color="#007AFF" />
            <Text style={styles.actionTitle}>Profile</Text>
            <Text style={styles.actionSubtitle}>Manage account</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <Ionicons name="star" size={32} color="#FF6B35" />
            <Text style={styles.actionTitle}>Upgrade</Text>
            <Text style={styles.actionSubtitle}>Get unlimited access</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Hybrid SaaS Architecture</Text>
          <Text style={styles.infoText}>
            ✅ Supabase Database & Auth{'\n'}
            ✅ Stripe Payment Integration{'\n'}
            ✅ NanoBanana AI Image Generation{'\n'}
            ✅ Zero Server Management{'\n'}
            ✅ Production Ready
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// Main App Component
export default function App() {
  const { user, loading, signIn, signOut } = useAuth();
  const freeTier = useFreeTier();
  const [appState, setAppState] = useState('welcome'); // welcome, generate, signup_prompt, authenticated

  if (loading || freeTier.isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleSignupPrompt = () => {
    setAppState('signup_prompt');
  };

  const handleSignup = () => {
    setAppState('auth');
  };

  const renderCurrentView = () => {
    if (user) {
      return <HomeScreen user={user} onSignOut={signOut} />;
    }

    switch (appState) {
      case 'welcome':
        return <WelcomeScreen onGetStarted={() => setAppState('generate')} />;
      
      case 'generate':
        return (
          <FreeGenerateScreen 
            onBack={() => setAppState('welcome')}
            freeTier={freeTier}
            onSignupPrompt={handleSignupPrompt}
          />
        );
      
      case 'signup_prompt':
        return (
          <SignupPromptScreen 
            onSignup={handleSignup}
            onBack={() => setAppState('generate')}
          />
        );
      
      case 'auth':
        return <AuthScreen onSignIn={signIn} onBack={() => setAppState('generate')} />;
      
      default:
        return <WelcomeScreen onGetStarted={() => setAppState('generate')} />;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      {renderCurrentView()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  authContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
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
  authFormHeader: {
    alignItems: 'center',
    marginBottom: 48,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e3f2fd',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e1e5e9',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#f8f9fa',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  features: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
  },
  feature: {
    alignItems: 'center',
    flex: 1,
  },
  featureText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
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
  homeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: 'white',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  signOutIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  statsCard: {
    backgroundColor: 'white',
    marginHorizontal: 24,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  planInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 12,
  },
  planText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  creditsText: {
    fontSize: 14,
    color: '#666',
  },
  actionsGrid: {
    paddingHorizontal: 24,
    paddingTop: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 12,
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  infoSection: {
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  comingSoon: {
    fontSize: 32,
    textAlign: 'center',
    marginBottom: 16,
  },
  comingSoonText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  backButtonStyle: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 24,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginLeft: 16,
  },
  // Welcome Screen Styles
  welcomeContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  welcomeHeader: {
    alignItems: 'center',
    marginBottom: 48,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  benefitsSection: {
    marginBottom: 48,
  },
  benefit: {
    alignItems: 'center',
    marginBottom: 32,
  },
  benefitTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 12,
    marginBottom: 8,
  },
  benefitText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  getStartedButton: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  getStartedButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  freeTrialText: {
    fontSize: 14,
    color: '#34C759',
    textAlign: 'center',
    fontWeight: '500',
  },
  // Free Usage Card
  freeUsageCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#34C759',
  },
  freeUsageTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  freeUsageText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e1e5e9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#34C759',
  },
  // Generate Screen Styles
  section: {
    marginHorizontal: 20,
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  promptInput: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  stylesContainer: {
    flexDirection: 'row',
    paddingHorizontal: 4,
  },
  styleCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    minWidth: 120,
    borderWidth: 2,
    borderColor: '#e1e5e9',
  },
  selectedStyleCard: {
    borderColor: '#007AFF',
  },
  styleName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  selectedStyleName: {
    color: '#007AFF',
  },
  generateButton: {
    backgroundColor: '#007AFF',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  generateButtonDisabled: {
    backgroundColor: '#ccc',
  },
  generateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  generatingInfo: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  generatingText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  // Result Screen Styles
  resultContainer: {
    padding: 20,
  },
  generatedImage: {
    width: '100%',
    height: 300,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  resultInfo: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
  },
  promptText: {
    fontSize: 14,
    color: '#1a1a1a',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  styleText: {
    fontSize: 12,
    color: '#666',
  },
  usageInfo: {
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  usageText: {
    fontSize: 12,
    color: '#007AFF',
    textAlign: 'center',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
    marginLeft: 6,
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Upgrade Prompt Styles
  upgradePrompt: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF6B35',
  },
  upgradeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginBottom: 8,
  },
  upgradeText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  upgradeButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  upgradeButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  // Signup Prompt Screen Styles
  signupPromptContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  signupHeader: {
    alignItems: 'center',
    marginBottom: 48,
  },
  signupTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  signupSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  premiumFeatures: {
    marginBottom: 32,
  },
  premiumFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  premiumFeatureText: {
    fontSize: 16,
    color: '#1a1a1a',
    marginLeft: 12,
    fontWeight: '500',
  },
  signupButton: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  signupButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  backToFreeButton: {
    alignItems: 'center',
    padding: 16,
  },
  backToFreeText: {
    fontSize: 14,
    color: '#666',
    textDecorationLine: 'underline',
  },
  // Auth Screen Header
  authHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  authHeaderTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginLeft: 16,
  },
  backButton: {
    padding: 4,
  },
  // Reference Image Styles
  referenceImageContainer: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 12,
  },
  referenceImage: {
    width: '100%',
    height: 150,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  removeReferenceButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 2,
  },
  referenceOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  referenceButton: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
  },
  referenceButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  referenceHint: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 16,
  },
  // New Curated Prompts Styles
  loadingPromptsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingPromptsText: {
    marginTop: 16,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  promptHint: {
    fontSize: 12,
    color: '#666',
    marginBottom: 16,
    lineHeight: 18,
  },
  promptsScrollView: {
    maxHeight: 300,
  },
  promptCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e1e5e9',
  },
  selectedPromptCard: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  promptCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  promptTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginRight: 8,
  },
  selectedPromptTitle: {
    color: '#007AFF',
  },
  promptDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 70,
  },
  categoryBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  selectedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e1e5e9',
  },
  selectedText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  categoryText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  // Image Preview and Save Styles
  imagePreviewContainer: {
    position: 'relative',
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageOverlayText: {
    color: 'white',
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#34C759',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  saveButtonDisabled: {
    backgroundColor: '#A8E6CF',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Fullscreen Preview Modal Styles
  fullscreenModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  fullscreenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  fullscreenCloseButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenSaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#34C759',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  fullscreenSaveButtonDisabled: {
    backgroundColor: '#A8E6CF',
  },
  fullscreenSaveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  fullscreenImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenScrollContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    borderRadius: 8,
  },
  fullscreenFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  fullscreenInstructions: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});