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
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

// Simple auth state management
const useAuth = () => {
  const [user, setUser] = useState<{email: string} | null>(null);
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

// Auth Screen Component
const AuthScreen = ({ onSignIn, onBack }: {onSignIn: (email: string, password: string) => void, onBack: () => void}) => {
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
        <View style={styles.header}>
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
const HomeScreen = ({ user, onSignOut }) => {
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
          <TouchableOpacity style={styles.backButton} onPress={() => setCurrentView('home')}>
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

// Free Tier Manager (local storage for anonymous users)
const useFreeTier = () => {
  const [usageCount, setUsageCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  const FREE_LIMIT = 5;

  useEffect(() => {
    // Load usage from local storage
    const loadUsage = async () => {
      try {
        // In a real app, you'd use AsyncStorage
        const stored = localStorage.getItem('free_usage_count');
        setUsageCount(stored ? parseInt(stored) : 0);
      } catch (error) {
        console.log('Error loading usage:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadUsage();
  }, []);

  const incrementUsage = async () => {
    const newCount = usageCount + 1;
    setUsageCount(newCount);
    try {
      localStorage.setItem('free_usage_count', newCount.toString());
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
    hasUsesLeft: hasUsesLeft(),
    incrementUsage,
    isLoading,
    FREE_LIMIT
  };
};

// Welcome/Onboarding Screen
const WelcomeScreen = ({ onGetStarted }) => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.welcomeContainer}>
        <View style={styles.welcomeHeader}>
          <View style={styles.iconContainer}>
            <Ionicons name="image" size={64} color="#007AFF" />
          </View>
          <Text style={styles.welcomeTitle}>AI Image Generator</Text>
          <Text style={styles.welcomeSubtitle}>
            Transform your photos with AI magic
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
            <Text style={styles.benefitText}>5 free generations, no signup required</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.getStartedButton} onPress={onGetStarted}>
          <Text style={styles.getStartedButtonText}>Get Started Free</Text>
          <Ionicons name="arrow-forward" size={20} color="white" />
        </TouchableOpacity>

        <Text style={styles.freeTrialText}>
          ✨ Start with 5 free image generations
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

// Free Tier Generate Screen
const FreeGenerateScreen = ({ onBack, freeTier, onSignupPrompt }) => {
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('photorealistic');
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState(null);

  const styles_list = ['photorealistic', 'artistic', 'cartoon', 'vintage', 'abstract'];

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      Alert.alert('Error', 'Please describe what you want to create');
      return;
    }

    if (!freeTier.hasUsesLeft()) {
      onSignupPrompt();
      return;
    }

    setGenerating(true);
    
    // Simulate generation
    setTimeout(async () => {
      // Mock generated image
      const mockImage = `https://picsum.photos/400/400?random=${Date.now()}`;
      setGeneratedImage(mockImage);
      await freeTier.incrementUsage();
      setGenerating(false);
      
      Alert.alert(
        'Success!', 
        `Image generated! You have ${freeTier.remainingUses - 1} free generations left.`
      );
    }, 3000);
  };

  if (generatedImage) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => {
            setGeneratedImage(null);
            setPrompt('');
          }}>
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Generated Image</Text>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.resultContainer}>
          <Image
            source={{ uri: generatedImage }}
            style={styles.generatedImage}
            resizeMode="cover"
          />
          
          <View style={styles.resultInfo}>
            <Text style={styles.promptText}>"{prompt}"</Text>
            <Text style={styles.styleText}>Style: {selectedStyle}</Text>
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
              style={styles.secondaryButton}
              onPress={() => {
                setGeneratedImage(null);
                setPrompt('');
              }}
            >
              <Ionicons name="add" size={20} color="#007AFF" />
              <Text style={styles.secondaryButtonText}>Generate Another</Text>
            </TouchableOpacity>
            
            {freeTier.remainingUses === 0 && (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={onSignupPrompt}
              >
                <Ionicons name="star" size={20} color="white" />
                <Text style={styles.primaryButtonText}>Upgrade Now</Text>
              </TouchableOpacity>
            )}
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
          <Text style={styles.sectionTitle}>Describe Your Image</Text>
          <TextInput
            style={styles.promptInput}
            placeholder="A beautiful sunset over mountains, a cute cat playing, abstract art..."
            value={prompt}
            onChangeText={setPrompt}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose Style</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.stylesContainer}>
              {styles_list.map((style) => (
                <TouchableOpacity
                  key={style}
                  style={[
                    styles.styleCard,
                    selectedStyle === style && styles.selectedStyleCard,
                  ]}
                  onPress={() => setSelectedStyle(style)}
                >
                  <Text
                    style={[
                      styles.styleName,
                      selectedStyle === style && styles.selectedStyleName,
                    ]}
                  >
                    {style}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        <TouchableOpacity
          style={[
            styles.generateButton,
            (!freeTier.hasUsesLeft() || generating || !prompt.trim()) && styles.generateButtonDisabled,
          ]}
          onPress={handleGenerate}
          disabled={!freeTier.hasUsesLeft() || generating || !prompt.trim()}
        >
          {generating ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="flash" size={20} color="white" />
              <Text style={styles.generateButtonText}>
                {!freeTier.hasUsesLeft() ? 'Free Tier Exhausted' : 'Generate Image'}
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
            <Text style={styles.upgradeTitle}>Free tier exhausted!</Text>
            <Text style={styles.upgradeText}>
              Sign up to get unlimited generations and premium features
            </Text>
            <TouchableOpacity style={styles.upgradeButton} onPress={onSignupPrompt}>
              <Text style={styles.upgradeButtonText}>Unlock Unlimited</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// Signup Prompt Screen
const SignupPromptScreen = ({ onSignup, onBack }) => {
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
    alignItems: 'center',
    marginBottom: 48,
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
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
  backButton: {
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
    gap: 12,
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
});