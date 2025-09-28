import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
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
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Theme Context
type ThemeMode = 'light' | 'dark';

interface Theme {
  mode: ThemeMode;
  colors: {
    background: string;
    surface: string;
    card: string;
    primary: string;
    secondary: string;
    text: string;
    textSecondary: string;
    border: string;
    success: string;
    warning: string;
    error: string;
    accent: string;
  };
}

const lightTheme: Theme = {
  mode: 'light',
  colors: {
    background: '#f8f9fa',
    surface: '#ffffff',
    card: '#ffffff',
    primary: '#007AFF',
    secondary: '#6c757d',
    text: '#1a1a1a',
    textSecondary: '#666666',
    border: '#e1e5e9',
    success: '#34C759',
    warning: '#FF6B35',
    error: '#FF3B30',
    accent: '#0ea5e9',
  },
};

const darkTheme: Theme = {
  mode: 'dark',
  colors: {
    background: '#000000',
    surface: '#1c1c1e',
    card: '#2c2c2e',
    primary: '#007AFF',
    secondary: '#8e8e93',
    text: '#ffffff',
    textSecondary: '#8e8e93',
    border: '#38383a',
    success: '#34C759',
    warning: '#FF9F0A',
    error: '#FF453A',
    accent: '#0ea5e9',
  },
};

interface ThemeContextType {
  theme: Theme;
  isDarkMode: boolean;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Theme Provider Component
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<Theme>(lightTheme);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem('theme_mode');
        if (storedTheme === 'dark') {
          setCurrentTheme(darkTheme);
          setIsDarkMode(true);
        } else {
          setCurrentTheme(lightTheme);
          setIsDarkMode(false);
        }
      } catch (error) {
        console.log('Error loading theme preference:', error);
      }
    };
    loadThemePreference();
  }, []);

  const toggleTheme = async () => {
    const newMode = isDarkMode ? 'light' : 'dark';
    const newTheme = newMode === 'dark' ? darkTheme : lightTheme;
    
    setCurrentTheme(newTheme);
    setIsDarkMode(!isDarkMode);
    
    try {
      await AsyncStorage.setItem('theme_mode', newMode);
    } catch (error) {
      console.log('Error saving theme preference:', error);
    }
  };

  const setTheme = async (mode: ThemeMode) => {
    const newTheme = mode === 'dark' ? darkTheme : lightTheme;
    setCurrentTheme(newTheme);
    setIsDarkMode(mode === 'dark');
    
    try {
      await AsyncStorage.setItem('theme_mode', mode);
    } catch (error) {
      console.log('Error saving theme preference:', error);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme: currentTheme, isDarkMode, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use theme
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

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
  const { theme } = useTheme();
  
  return (
    <SafeAreaView style={[styles.modernContainer, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.modernWelcomeContainer}>
        {/* Header Section */}
        <View style={styles.modernHeaderSection}>
          <View style={styles.modernTitleContainer}>
            <Text style={[styles.modernTitle, { color: theme.colors.text }]}>
              AI Canvas Studio
            </Text>
            <Text style={[styles.modernSubtitle, { color: theme.colors.textSecondary }]}>
              Transform your photos with professional AI artistry
            </Text>
          </View>

          {/* Feature Cards */}
          <View style={styles.modernFeatureContainer}>
            <View style={[styles.modernFeatureCard, { backgroundColor: theme.colors.card }]}>
              <View style={styles.modernFeatureRow}>
                <View style={[styles.modernIconContainer, { backgroundColor: '#eff6ff' }]}>
                  <Ionicons name="brush" size={24} color="#0ea5e9" />
                </View>
                <View style={styles.modernFeatureContent}>
                  <Text style={[styles.modernFeatureTitle, { color: theme.colors.text }]}>AI-Powered</Text>
                  <Text style={[styles.modernFeatureText, { color: theme.colors.textSecondary }]}>Advanced Gemini 2.5 Flash technology</Text>
                </View>
              </View>
            </View>

            <View style={[styles.modernFeatureCard, { backgroundColor: theme.colors.card }]}>
              <View style={styles.modernFeatureRow}>
                <View style={[styles.modernIconContainer, { backgroundColor: '#f0fdf4' }]}>
                  <Ionicons name="flash" size={24} color="#10b981" />
                </View>
                <View style={styles.modernFeatureContent}>
                  <Text style={[styles.modernFeatureTitle, { color: theme.colors.text }]}>Instant Results</Text>
                  <Text style={[styles.modernFeatureText, { color: theme.colors.textSecondary }]}>Professional quality in seconds</Text>
                </View>
              </View>
            </View>

            <View style={[styles.modernFeatureCard, { backgroundColor: theme.colors.card }]}>
              <View style={styles.modernFeatureRow}>
                <View style={[styles.modernIconContainer, { backgroundColor: '#faf5ff' }]}>
                  <Ionicons name="gift" size={24} color="#8b5cf6" />
                </View>
                <View style={styles.modernFeatureContent}>
                  <Text style={[styles.modernFeatureTitle, { color: theme.colors.text }]}>Free to Start</Text>
                  <Text style={[styles.modernFeatureText, { color: theme.colors.textSecondary }]}>100 free generations, no signup required</Text>
                </View>
              </View>
            </View>
          </View>

          {/* CTA Section */}
          <View style={styles.modernCtaContainer}>
            <Text style={[styles.modernCtaText, { color: theme.colors.success }]}>
              ✨ Start with 100 free image generations
            </Text>

            <TouchableOpacity 
              style={[styles.modernCtaButton, { backgroundColor: theme.colors.primary }]}
              onPress={onGetStarted}
              activeOpacity={0.9}
            >
              <View style={styles.modernCtaButtonContent}>
                <Text style={styles.modernCtaButtonText}>Get Started Free</Text>
                <Ionicons name="arrow-forward" size={20} color="white" />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// Dark Mode Context
interface DarkModeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  colors: {
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    primary: string;
  };
}

const DarkModeContext = createContext<DarkModeContextType | undefined>(undefined);

const useDarkMode = () => {
  const context = useContext(DarkModeContext);
  if (!context) {
    throw new Error('useDarkMode must be used within a DarkModeProvider');
  }
  return context;
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

// Full-Screen Photo Viewer Component  
const PhotoViewerModal: React.FC<{
  visible: boolean;
  images: any[];
  initialIndex: number;
  onClose: () => void;
}> = ({ visible, images, initialIndex, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const scrollViewRef = useRef<ScrollView>(null);
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  const goToNext = () => {
    if (currentIndex < images.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      scrollViewRef.current?.scrollTo({ x: newIndex * screenWidth, animated: true });
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      scrollViewRef.current?.scrollTo({ x: newIndex * screenWidth, animated: true });
    }
  };

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / screenWidth);
    console.log(`📱 Scroll detected: offsetX=${offsetX}, newIndex=${newIndex}, currentIndex=${currentIndex}`);
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < images.length) {
      setCurrentIndex(newIndex);
    }
  };

  return (
    <Modal visible={visible} transparent={true} animationType="fade">
      <View style={styles.photoViewerContainer}>
        {/* Header */}
        <SafeAreaView style={styles.photoViewerHeader}>
          <View style={styles.photoViewerHeaderRow}>
            <TouchableOpacity 
              style={styles.photoViewerCloseButton} 
              onPress={() => {
                console.log('🔥 Close button pressed!');
                onClose();
              }}
              activeOpacity={0.7}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>
            <View style={styles.photoViewerHeaderContent}>
              <Text style={styles.photoViewerTitle}>
                {images[currentIndex]?.prompt_title || 'AI Generated'}
              </Text>
              <Text style={styles.photoViewerCounter}>
                {currentIndex + 1} of {images.length}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.photoViewerActionButton} 
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="share" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {/* Photo Carousel - Simplified for better functionality */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          style={styles.photoViewerScrollView}
          decelerationRate="fast"
        >
          {images.map((image, index) => (
            <View key={image.id || index} style={[styles.photoViewerImageContainer, { width: screenWidth }]}>
              {/* Simplified - no nested ScrollView to avoid conflicts */}
              <Image
                source={{ uri: `data:image/png;base64,${image.generated_image}` }}
                style={[
                  styles.photoViewerImage,
                  {
                    width: screenWidth * 0.9,
                    height: screenHeight * 0.6,
                  }
                ]}
                resizeMode="contain"
              />
            </View>
          ))}
        </ScrollView>

        {/* Navigation indicators - Outside to avoid conflicts */}
        {images.length > 1 && (
          <View style={styles.photoViewerIndicators}>
            {images.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.photoViewerDot,
                  currentIndex === i && styles.photoViewerDotActive
                ]}
              />
            ))}
          </View>
        )}

        {/* Manual Navigation Buttons for testing */}
        {images.length > 1 && (
          <>
            {currentIndex > 0 && (
              <TouchableOpacity
                style={styles.photoViewerPrevButton}
                onPress={() => {
                  console.log('⬅️ Previous button pressed');
                  goToPrevious();
                }}
                activeOpacity={0.7}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              >
                <Ionicons name="chevron-back" size={32} color="white" />
              </TouchableOpacity>
            )}
            
            {currentIndex < images.length - 1 && (
              <TouchableOpacity
                style={styles.photoViewerNextButton}
                onPress={() => {
                  console.log('➡️ Next button pressed');
                  goToNext();
                }}
                activeOpacity={0.7}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              >
                <Ionicons name="chevron-forward" size={32} color="white" />
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Footer with metadata */}
        <View style={styles.photoViewerFooter}>
          <Text style={styles.photoViewerDate}>
            Created: {new Date(images[currentIndex]?.created_at).toLocaleDateString()}
          </Text>
          <Text style={styles.photoViewerCategory}>
            {images[currentIndex]?.prompt_category || 'AI Generated'}
          </Text>
        </View>
      </View>
    </Modal>
  );
};

// Gallery Screen Component - iPhone Photos Style
const GalleryScreen: React.FC<{ freeTier: FreeTier }> = ({ freeTier }) => {
  const { theme } = useTheme();
  const [generatedImages, setGeneratedImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);

  useEffect(() => {
    const loadGeneratedImages = async () => {
      try {
        console.log('📸 Loading generated images from backend...');
        const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001'}/api/images`);
        
        if (!response.ok) {
          throw new Error(`Failed to load images: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`✅ Loaded ${data.images?.length || 0} generated images`);
        setGeneratedImages(data.images || []);
      } catch (error) {
        console.error('❌ Failed to load generated images:', error);
        Alert.alert('Error', 'Failed to load generated images. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    loadGeneratedImages();
  }, []);

  const openPhotoViewer = (index: number) => {
    setSelectedImageIndex(index);
    setShowPhotoViewer(true);
  };

  const closePhotoViewer = () => {
    setShowPhotoViewer(false);
    setSelectedImageIndex(null);
  };

  if (loading) {
    return (
      <View style={[styles.modernLoadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.modernLoadingText, { color: theme.colors.textSecondary }]}>Loading your gallery...</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView style={[styles.iPhoneGalleryContainer, { backgroundColor: theme.colors.background }]}>
        {generatedImages.length === 0 ? (
          <View style={[styles.modernEmptyStateContainer, { backgroundColor: theme.colors.background }]}>
            <View style={styles.modernEmptyStateIcon}>
              <Ionicons name="images-outline" size={64} color={theme.colors.textSecondary} />
            </View>
            <Text style={[styles.modernEmptyStateTitle, { color: theme.colors.text }]}>No Images Yet</Text>
            <Text style={[styles.modernEmptyStateText, { color: theme.colors.textSecondary }]}>
              Your generated images will appear here. Start creating to build your gallery!
            </Text>
          </View>
        ) : (
          <View style={styles.iPhoneGalleryGrid}>
            {generatedImages.map((image, index) => (
              <TouchableOpacity 
                key={image.id || index} 
                style={styles.iPhoneGalleryThumbnail}
                activeOpacity={0.8}
                onPress={() => openPhotoViewer(index)}
              >
                <Image 
                  source={{ uri: `data:image/png;base64,${image.generated_image}` }}
                  style={styles.iPhoneGalleryImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
      
      {/* Photo Viewer Modal */}
      {showPhotoViewer && selectedImageIndex !== null && (
        <PhotoViewerModal
          visible={showPhotoViewer}
          images={generatedImages}
          initialIndex={selectedImageIndex}
          onClose={closePhotoViewer}
        />
      )}
    </>
  );
};

// Profile Screen Component  
const ProfileScreen: React.FC<{ freeTier: FreeTier }> = ({ freeTier }) => {
  const { theme, isDarkMode, toggleTheme } = useTheme();
  
  return (
    <ScrollView style={[styles.modernScrollView, { backgroundColor: theme.colors.background }]}>
      {/* Usage Stats Card */}
      <View style={[styles.modernCard, { backgroundColor: theme.colors.card }]}>
        <View style={styles.modernCardHeader}>
          <View style={styles.modernCardIcon}>
            <Ionicons name="flash" size={20} color="#0ea5e9" />
          </View>
          <Text style={[styles.modernCardTitle, { color: theme.colors.text }]}>Free Tier</Text>
        </View>
        
        <Text style={[styles.modernCardDescription, { color: theme.colors.textSecondary }]}>Anonymous user</Text>
        
        <View style={styles.modernProgressSection}>
          <View style={styles.modernProgressHeader}>
            <Text style={[styles.modernProgressLabel, { color: theme.colors.text }]}>Generations used</Text>
            <Text style={[styles.modernProgressValue, { color: theme.colors.text }]}>
              {freeTier.usageCount} / {freeTier.FREE_LIMIT}
            </Text>
          </View>
          <View style={[styles.modernProgressBarBackground, { backgroundColor: theme.colors.border }]}>
            <View 
              style={[
                styles.modernProgressBarFill,
                { width: `${(freeTier.usageCount / freeTier.FREE_LIMIT) * 100}%` }
              ]}
            />
          </View>
          <Text style={[styles.modernProgressRemainingText, { color: theme.colors.textSecondary }]}>
            {freeTier.remainingUses} generations remaining
          </Text>
        </View>
      </View>

      {/* Settings Options */}
      <View style={[styles.modernCard, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.modernCardTitle, { color: theme.colors.text }]}>Settings</Text>
        
        {/* Dark Mode Toggle */}
        <TouchableOpacity 
          style={styles.modernSettingsOption} 
          activeOpacity={0.7}
          onPress={toggleTheme}
        >
          <View style={[styles.modernSettingsIcon, { backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6' }]}>
            <Ionicons 
              name={isDarkMode ? "moon" : "sunny"} 
              size={20} 
              color={isDarkMode ? "#fbbf24" : "#f59e0b"} 
            />
          </View>
          <View style={styles.modernSettingsContent}>
            <Text style={[styles.modernSettingsTitle, { color: theme.colors.text }]}>
              {isDarkMode ? 'Dark Mode' : 'Light Mode'}
            </Text>
            <Text style={[styles.modernSettingsDescription, { color: theme.colors.textSecondary }]}>
              {isDarkMode ? 'Switch to light theme' : 'Switch to dark theme'}
            </Text>
          </View>
          <View style={[styles.themeToggleSwitch, { backgroundColor: isDarkMode ? theme.colors.primary : theme.colors.border }]}>
            <View style={[
              styles.themeToggleSwitchButton, 
              { 
                transform: [{ translateX: isDarkMode ? 22 : 2 }],
                backgroundColor: theme.colors.surface
              }
            ]} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.modernSettingsOption} activeOpacity={0.7}>
          <View style={[styles.modernSettingsIcon, { backgroundColor: '#dcfce7' }]}>
            <Ionicons name="star" size={20} color="#10b981" />
          </View>
          <View style={styles.modernSettingsContent}>
            <Text style={[styles.modernSettingsTitle, { color: theme.colors.text }]}>Upgrade to Pro</Text>
            <Text style={[styles.modernSettingsDescription, { color: theme.colors.textSecondary }]}>Unlimited generations</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.modernSettingsOption} activeOpacity={0.7}>
          <View style={[styles.modernSettingsIcon, { backgroundColor: '#f3e8ff' }]}>
            <Ionicons name="help-circle" size={20} color="#8b5cf6" />
          </View>
          <View style={styles.modernSettingsContent}>
            <Text style={[styles.modernSettingsTitle, { color: theme.colors.text }]}>Help & Support</Text>
            <Text style={[styles.modernSettingsDescription, { color: theme.colors.textSecondary }]}>Get assistance</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.modernSettingsOption} activeOpacity={0.7}>
          <View style={[styles.modernSettingsIcon, { backgroundColor: '#fef3c7' }]}>
            <Ionicons name="information-circle" size={20} color="#d97706" />
          </View>
          <View style={styles.modernSettingsContent}>
            <Text style={[styles.modernSettingsTitle, { color: theme.colors.text }]}>About</Text>
            <Text style={[styles.modernSettingsDescription, { color: theme.colors.textSecondary }]}>App information</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

// Free Tier Generate Screen with Curated Prompts
const FreeGenerateScreen: React.FC<{
  onBack: () => void;
  freeTier: FreeTier;
  onSignupPrompt: () => void;
}> = ({ onBack, freeTier, onSignupPrompt }) => {
  const { theme } = useTheme();
  const [selectedPromptId, setSelectedPromptId] = useState<number | null>(null);
  const [curatedPrompts, setCuratedPrompts] = useState<CuratedPrompt[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [loadingPrompts, setLoadingPrompts] = useState(true);
  const [showFullscreenPreview, setShowFullscreenPreview] = useState(false);
  const [savingImage, setSavingImage] = useState(false);
  const horizontalScrollRef = useRef<ScrollView>(null);
  const [activeTab, setActiveTab] = useState<'generate' | 'gallery' | 'profile'>('generate');

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

  // Snap card to center function
  const snapCardToCenter = (index: number) => {
    const cardWidth = 280; // Width of each card
    const gap = 16; // Gap between cards
    const containerPadding = 16; // Padding on sides
    const screenWidth = Dimensions.get('window').width;
    
    // Calculate the x position to center the selected card
    const cardPosition = index * (cardWidth + gap) + containerPadding;
    const centerOffset = (screenWidth - cardWidth) / 2;
    const scrollToX = cardPosition - centerOffset;
    
    // Scroll to center the selected card with more obvious animation
    console.log(`📍 Snapping card to center: scrollToX=${scrollToX}, cardPosition=${cardPosition}`);
    horizontalScrollRef.current?.scrollTo({
      x: Math.max(0, scrollToX),
      animated: true,
      duration: 500 // Add explicit duration for more noticeable animation
    });
  };

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
    <SafeAreaView style={[styles.modernContainer, { backgroundColor: theme.colors.background }]}>
      {/* Modern Header */}
      <View style={[styles.modernHeader, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.modernHeaderContent}>
          <TouchableOpacity 
            style={styles.modernBackButton}
            onPress={onBack}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
          </TouchableOpacity>
          
          <Text style={[styles.modernHeaderTitle, { color: theme.colors.text }]}>
            {activeTab === 'generate' ? 'Generate Image' : 
             activeTab === 'gallery' ? 'My Gallery' : 'Profile'}
          </Text>
          
          {/* Empty space for balance */}
          <View style={styles.modernBackButton} />
        </View>
      </View>

      {/* Tab Content */}
      {activeTab === 'generate' && (
        <ScrollView style={[styles.cleanScrollView, { backgroundColor: theme.colors.background }]}>
          {/* Free Tier Card */}
          <View style={[styles.modernCard, { backgroundColor: theme.colors.card }]}>
          <View style={styles.modernCardHeader}>
            <View style={styles.modernCardIcon}>
              <Ionicons name="flash" size={20} color="#0ea5e9" />
            </View>
            <Text style={[styles.modernCardTitle, { color: theme.colors.text }]}>Free Tier</Text>
          </View>
          
          <View style={styles.modernProgressSection}>
            <View style={styles.modernProgressHeader}>
              <Text style={[styles.modernProgressLabel, { color: theme.colors.text }]}>Generations remaining</Text>
              <Text style={[styles.modernProgressValue, { color: theme.colors.text }]}>
                {freeTier.remainingUses} / {freeTier.FREE_LIMIT}
              </Text>
            </View>
            <View style={[styles.modernProgressBarBackground, { backgroundColor: theme.colors.border }]}>
              <View 
                style={[
                  styles.modernProgressBarFill,
                  { width: `${(freeTier.usageCount / freeTier.FREE_LIMIT) * 100}%` }
                ]}
              />
            </View>
          </View>
        </View>

        {/* Reference Image Section */}
        <View style={styles.directSection}>
          <Text style={[styles.directSectionTitle, { color: theme.colors.text }]}>Reference Image</Text>
          <Text style={[styles.directSectionDescription, { color: theme.colors.textSecondary }]}>
            Upload or take a photo to use as reference for AI generation (required)
          </Text>
          
          {referenceImage ? (
            <View style={styles.modernReferenceImageContainer}>
              <View style={styles.modernReferenceImageWrapper}>
                <Image 
                  source={{ uri: `data:image/jpeg;base64,${referenceImage}` }}
                  style={styles.modernReferenceImage}
                  resizeMode="cover"
                />
                <TouchableOpacity 
                  style={styles.modernRemoveImageButton}
                  onPress={removeReferenceImage}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={16} color="white" />
                </TouchableOpacity>
              </View>
              <Text style={[styles.modernSuccessText, { color: theme.colors.success }]}>
                ✨ Perfect! Your reference image is ready
              </Text>
            </View>
          ) : (
            <View style={styles.modernUploadOptionsContainer}>
              <TouchableOpacity 
                style={[styles.modernUploadOption, { backgroundColor: theme.colors.card }]}
                onPress={pickReferenceImage}
                activeOpacity={0.7}
              >
                <View style={[styles.modernUploadIcon, { backgroundColor: '#eff6ff' }]}>
                  <Ionicons name="images" size={24} color="#0ea5e9" />
                </View>
                <Text style={[styles.modernUploadText, { color: theme.colors.text }]}>Choose from Gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.modernUploadOption, { backgroundColor: theme.colors.card }]}
                onPress={takeReferencePhoto}
                activeOpacity={0.7}
              >
                <View style={[styles.modernUploadIcon, { backgroundColor: '#f0fdf4' }]}>
                  <Ionicons name="camera" size={24} color="#10b981" />
                </View>
                <Text style={[styles.modernUploadText, { color: theme.colors.text }]}>Take Photo</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {loadingPrompts ? (
          <View style={styles.loadingPromptsContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingPromptsText}>Loading curated prompts...</Text>
          </View>
        ) : (
          <>
            {/* Category Selection */}
            <View style={styles.directSection}>
              <Text style={styles.directSectionTitle}>Choose Style Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.modernCategoryContainer}>
                  {categories.map((category) => (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.modernCategoryButton,
                        selectedCategory === category 
                          ? styles.modernCategoryButtonSelected 
                          : styles.modernCategoryButtonUnselected
                      ]}
                      onPress={() => setSelectedCategory(category)}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.modernCategoryText,
                        selectedCategory === category 
                          ? styles.modernCategoryTextSelected 
                          : styles.modernCategoryTextUnselected
                      ]}>
                        {category}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Horizontal Prompt Selection */}
            <View style={styles.directSection}>
              <Text style={styles.directSectionTitle}>
                Select Professional Style ({filteredPrompts.length} available)
              </Text>
              <Text style={styles.directSectionDescription}>
                Swipe horizontally to browse curated AI prompts with haptic feedback.
              </Text>
              
              <ScrollView 
                ref={horizontalScrollRef}
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.horizontalPromptScrollView}
                contentContainerStyle={styles.horizontalPromptContainer}
                snapToInterval={280} // Width of each card + margin
                decelerationRate="fast"
                pagingEnabled={false}
              >
                {filteredPrompts.map((prompt, index) => (
                  <TouchableOpacity
                    key={prompt.id}
                    style={[
                      styles.horizontalPromptCard,
                      selectedPromptId === prompt.id 
                        ? styles.horizontalPromptCardSelected 
                        : styles.horizontalPromptCardUnselected
                    ]}
                    onPress={() => {
                      console.log(`🎯 Selected prompt: ${prompt.title}`);
                      console.log(`📍 Snapping card ${index + 1} to center`);
                      
                      // Haptic feedback on selection
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      
                      // Set selected prompt
                      setSelectedPromptId(prompt.id);
                      
                      // Snap card to center with smooth animation
                      snapCardToCenter(index);
                    }}
                    activeOpacity={0.8}
                  >
                    {/* Category Badge */}
                    <View style={[
                      styles.horizontalPromptBadge,
                      { backgroundColor: 
                        prompt.category === 'Professional' 
                          ? '#3b82f6' 
                          : prompt.category === 'Artistic' 
                          ? '#f59e0b' 
                          : '#10b981'
                      }
                    ]}>
                      <Text style={styles.horizontalPromptBadgeText}>
                        {prompt.category}
                      </Text>
                    </View>

                    {/* Prompt Content */}
                    <View style={styles.horizontalPromptContent}>
                      <Text style={[
                        styles.horizontalPromptTitle,
                        selectedPromptId === prompt.id && styles.horizontalPromptTitleSelected
                      ]}>
                        {prompt.title}
                      </Text>
                      
                      <Text style={styles.horizontalPromptDescription} numberOfLines={3}>
                        {prompt.description}
                      </Text>
                    </View>

                    {/* Selection Indicator */}
                    {selectedPromptId === prompt.id && (
                      <View style={styles.horizontalPromptSelected}>
                        <Ionicons name="checkmark-circle" size={24} color="#3b82f6" />
                      </View>
                    )}
                    
                    {/* Card Number */}
                    <View style={styles.horizontalPromptNumber}>
                      <Text style={styles.horizontalPromptNumberText}>
                        {index + 1}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </>
        )}

        {/* Generate Button */}
        <View style={styles.modernButtonContainer}>
          <TouchableOpacity
            style={[
              styles.modernGenerateButton,
              (!freeTier.hasUsesLeft() || generating || !selectedPromptId || !referenceImage)
                ? styles.modernGenerateButtonDisabled
                : styles.modernGenerateButtonEnabled
            ]}
            onPress={handleGenerate}
            disabled={!freeTier.hasUsesLeft() || generating || !selectedPromptId || !referenceImage}
            activeOpacity={0.8}
          >
            {generating ? (
              <View style={styles.modernButtonContent}>
                <ActivityIndicator size="small" color="white" />
                <Text style={styles.modernButtonText}>Generating...</Text>
              </View>
            ) : (
              <View style={styles.modernButtonContent}>
                <Ionicons name="sparkles" size={20} color="white" />
                <Text style={styles.modernButtonText}>
                  {!freeTier.hasUsesLeft() 
                    ? 'Limit Reached (100/100)' 
                    : !selectedPromptId
                    ? 'Select a Style First'
                    : !referenceImage
                    ? 'Add Reference Photo'
                    : 'Generate Image'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

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
      )}
      
      {/* Gallery Tab */}
      {activeTab === 'gallery' && (
        <GalleryScreen freeTier={freeTier} />
      )}
      
      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <ProfileScreen freeTier={freeTier} />
      )}
      
      {/* Bottom Tab Navigation */}
      <View style={[styles.tabBarContainer, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'generate' && styles.tabButtonActive]}
          onPress={() => setActiveTab('generate')}
          activeOpacity={0.7}
        >
          <Ionicons 
            name={activeTab === 'generate' ? 'sparkles' : 'sparkles-outline'} 
            size={24} 
            color={activeTab === 'generate' ? theme.colors.primary : theme.colors.textSecondary} 
          />
          <Text style={[
            styles.tabLabel, 
            { color: theme.colors.textSecondary },
            activeTab === 'generate' && { color: theme.colors.primary }
          ]}>
            Generate
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'gallery' && styles.tabButtonActive]}
          onPress={() => setActiveTab('gallery')}
          activeOpacity={0.7}
        >
          <Ionicons 
            name={activeTab === 'gallery' ? 'images' : 'images-outline'} 
            size={24} 
            color={activeTab === 'gallery' ? theme.colors.primary : theme.colors.textSecondary} 
          />
          <Text style={[
            styles.tabLabel, 
            { color: theme.colors.textSecondary },
            activeTab === 'gallery' && { color: theme.colors.primary }
          ]}>
            Gallery
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'profile' && styles.tabButtonActive]}
          onPress={() => setActiveTab('profile')}
          activeOpacity={0.7}
        >
          <Ionicons 
            name={activeTab === 'profile' ? 'person' : 'person-outline'} 
            size={24} 
            color={activeTab === 'profile' ? theme.colors.primary : theme.colors.textSecondary} 
          />
          <Text style={[
            styles.tabLabel, 
            { color: theme.colors.textSecondary },
            activeTab === 'profile' && { color: theme.colors.primary }
          ]}>
            Profile
          </Text>
        </TouchableOpacity>
      </View>
      
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
function App() {
  const { user, loading, signIn, signOut } = useAuth();
  const freeTier = useFreeTier();
  const [appState, setAppState] = useState('welcome'); // welcome, generate, signup_prompt, authenticated
  const { theme, isDarkMode } = useTheme();

  if (loading || freeTier.isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading...</Text>
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
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      {renderCurrentView()}
    </View>
  );
}

// App wrapped with Theme Provider
export default function AppWithTheme() {
  return (
    <ThemeProvider>
      <App />
    </ThemeProvider>
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
  // Modern Welcome Screen Styles
  modernContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modernWelcomeContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  modernHeaderSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modernTitleContainer: {
    marginBottom: 48,
    alignItems: 'center',
  },
  modernTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  modernSubtitle: {
    fontSize: 18,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: 320,
  },
  modernFeatureContainer: {
    width: '100%',
    maxWidth: 400,
    marginBottom: 32,
  },
  modernFeatureCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  modernFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modernIconContainer: {
    padding: 12,
    borderRadius: 12,
    marginRight: 16,
  },
  modernFeatureContent: {
    flex: 1,
  },
  modernFeatureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  modernFeatureText: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  modernCtaContainer: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modernCtaText: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 24,
    textAlign: 'center',
    fontWeight: '500',
  },
  modernCtaButton: {
    backgroundColor: '#3b82f6',
    width: '100%',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    shadowColor: '#3b82f6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  modernCtaButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernCtaButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  // Modern Header Styles
  modernHeader: {
    backgroundColor: 'white',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  modernHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modernBackButton: {
    backgroundColor: '#f1f5f9',
    padding: 8,
    borderRadius: 12,
  },
  modernHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  modernProfileButton: {
    backgroundColor: '#eff6ff',
    padding: 8,
    borderRadius: 12,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  modalCloseButton: {
    backgroundColor: '#f1f5f9',
    padding: 8,
    borderRadius: 12,
  },
  usageStatsContainer: {
    backgroundColor: '#eff6ff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  usageStatsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  usageStatsIcon: {
    backgroundColor: '#dbeafe',
    padding: 8,
    borderRadius: 12,
    marginRight: 12,
  },
  usageStatsContent: {
    flex: 1,
  },
  usageStatsTier: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  usageStatsUser: {
    fontSize: 14,
    color: '#64748b',
  },
  usageProgress: {
    marginBottom: 12,
  },
  usageProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  usageProgressLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  usageProgressValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  usageProgressBar: {
    backgroundColor: '#e2e8f0',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  usageProgressFill: {
    backgroundColor: '#3b82f6',
    height: '100%',
    borderRadius: 4,
  },
  usageRemainingText: {
    fontSize: 12,
    color: '#64748b',
  },
  actionButton: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionIcon: {
    padding: 8,
    borderRadius: 12,
    marginRight: 12,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontWeight: '600',
    color: '#1e293b',
  },
  actionDescription: {
    fontSize: 14,
    color: '#64748b',
  },
  // Generate Screen Styles
  modernScrollView: {
    flex: 1,
    paddingHorizontal: 24,
  },
  modernCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  modernCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  modernCardIcon: {
    backgroundColor: '#eff6ff',
    padding: 8,
    borderRadius: 12,
    marginRight: 12,
  },
  modernCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  modernCardDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 16,
  },
  modernProgressSection: {
    marginBottom: 12,
  },
  modernProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modernProgressLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  modernProgressValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  modernProgressBarBackground: {
    backgroundColor: '#e2e8f0',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  modernProgressBarFill: {
    backgroundColor: '#3b82f6',
    height: '100%',
    borderRadius: 4,
  },
  modernReferenceImageContainer: {
    alignItems: 'center',
  },
  modernReferenceImageWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  modernReferenceImage: {
    width: 96,
    height: 96,
    borderRadius: 12,
  },
  modernRemoveImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    padding: 4,
  },
  modernSuccessText: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '500',
  },
  modernUploadOptionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  modernUploadOption: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  modernUploadIcon: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  modernUploadText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  // Category Selection Styles
  modernCategoryContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  modernCategoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
  },
  modernCategoryButtonSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  modernCategoryButtonUnselected: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  modernCategoryText: {
    fontWeight: '500',
  },
  modernCategoryTextSelected: {
    color: '#2563eb',
  },
  modernCategoryTextUnselected: {
    color: '#64748b',
  },
  // Prompt Selection Styles
  modernPromptScrollView: {
    maxHeight: 320,
  },
  modernPromptContainer: {
    gap: 12,
  },
  modernPromptCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    marginBottom: 12,
  },
  modernPromptCardSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  modernPromptCardUnselected: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  modernPromptHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modernPromptTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  modernPromptTitleSelected: {
    color: '#1d4ed8',
  },
  modernPromptTitleUnselected: {
    color: '#1e293b',
  },
  modernPromptBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 70,
  },
  modernPromptBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modernPromptDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 8,
  },
  modernPromptSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  modernPromptSelectedText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#0ea5e9',
    fontWeight: '500',
  },
  // Generate Button Styles
  modernButtonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  modernGenerateButton: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    shadowColor: '#3b82f6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  modernGenerateButtonEnabled: {
    backgroundColor: '#3b82f6',
  },
  modernGenerateButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  modernButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Bottom Tab Navigation Styles
  tabBarContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 8,
    paddingBottom: 32, // Extra padding for safe area
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  tabButtonActive: {
    // No additional styling needed - color handled by icon and text
  },
  tabLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  // Gallery Screen Styles
  modernLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  modernLoadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  modernEmptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  modernEmptyStateIcon: {
    marginBottom: 24,
  },
  modernEmptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  modernEmptyStateText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
  },
  modernGalleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    padding: 24,
  },
  modernGalleryItem: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f8fafc',
  },
  modernGalleryImage: {
    width: '100%',
    height: '100%',
  },
  modernGalleryOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
  },
  modernGalleryTitle: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  modernGalleryDate: {
    color: '#d1d5db',
    fontSize: 10,
  },
  // Profile Screen Styles
  modernProgressRemainingText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 8,
  },
  modernSettingsOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modernSettingsIcon: {
    padding: 8,
    borderRadius: 8,
    marginRight: 12,
  },
  modernSettingsContent: {
    flex: 1,
  },
  modernSettingsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  modernSettingsDescription: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  // iPhone Photos Style Gallery
  iPhoneGalleryContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  iPhoneGalleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 2,
    paddingTop: 2,
  },
  iPhoneGalleryThumbnail: {
    width: '33.333%',
    aspectRatio: 1,
    padding: 2,
  },
  iPhoneGalleryImage: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
  },
  // Photo Viewer Modal Styles
  photoViewerContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  photoViewerHeader: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  photoViewerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  photoViewerHeaderContent: {
    flex: 1,
    alignItems: 'center',
  },
  photoViewerCloseButton: {
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoViewerActionButton: {
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoViewerTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  photoViewerCounter: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textAlign: 'center',
  },
  photoViewerScrollView: {
    flex: 1,
  },
  photoViewerImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoViewerZoomContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoViewerImage: {
    borderRadius: 0,
  },
  photoViewerFooter: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  photoViewerDate: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  photoViewerCategory: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
  },
  // Photo viewer indicators
  photoViewerIndicators: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoViewerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 4,
  },
  photoViewerDotActive: {
    backgroundColor: 'white',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  // Manual navigation buttons
  photoViewerPrevButton: {
    position: 'absolute',
    left: 20,
    top: '50%',
    marginTop: -25,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 25,
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  photoViewerNextButton: {
    position: 'absolute',
    right: 20,
    top: '50%',
    marginTop: -25,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 25,
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  // Horizontal Prompt Styles
  horizontalPromptScrollView: {
    marginTop: 16,
    height: 240, // Fixed height to ensure visibility
  },
  horizontalPromptContainer: {
    paddingHorizontal: 16,
    gap: 16,
  },
  horizontalPromptCard: {
    width: 280,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  horizontalPromptCardSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#f8faff',
    shadowColor: '#3b82f6',
    shadowOpacity: 0.2,
  },
  horizontalPromptCardUnselected: {
    borderColor: '#e5e7eb',
    backgroundColor: 'white',
  },
  horizontalPromptBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
  },
  horizontalPromptBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  horizontalPromptContent: {
    flex: 1,
    marginBottom: 12,
  },
  horizontalPromptTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
    lineHeight: 22,
  },
  horizontalPromptTitleSelected: {
    color: '#3b82f6',
  },
  horizontalPromptDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  horizontalPromptSelected: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 2,
    shadowColor: '#3b82f6',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  horizontalPromptNumber: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  horizontalPromptNumberText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748b',
  },
  // Direct Section Styles (no card background)
  directSection: {
    marginBottom: 32,
    paddingHorizontal: 24,
  },
  directSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  directSectionDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 16,
  },
  // Clean background scroll view
  cleanScrollView: {
    flex: 1,
    backgroundColor: '#f8fafc', // Light gray background
  },
  // Dark Mode Toggle Switch Styles
  themeToggleSwitch: {
    width: 48,
    height: 24,
    borderRadius: 12,
    padding: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  themeToggleSwitchButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
});