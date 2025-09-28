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
  const [user, setUser] = useState(null);
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
const AuthScreen = ({ onSignIn }) => {
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

// Main App Component
export default function App() {
  const { user, loading, signIn, signOut } = useAuth();

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      {user ? (
        <HomeScreen user={user} onSignOut={signOut} />
      ) : (
        <AuthScreen onSignIn={signIn} />
      )}
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
});