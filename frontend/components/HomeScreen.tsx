import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { GenerateScreen } from './GenerateScreen';
import { ProfileScreen } from './ProfileScreen';
import { GalleryScreen } from './GalleryScreen';

type Screen = 'home' | 'generate' | 'gallery' | 'profile';

export const HomeScreen: React.FC = () => {
  const { user, userProfile, signOut } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            const { error } = await signOut();
            if (error) {
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'generate':
        return <GenerateScreen onBack={() => setCurrentScreen('home')} />;
      case 'gallery':
        return <GalleryScreen onBack={() => setCurrentScreen('home')} />;
      case 'profile':
        return <ProfileScreen onBack={() => setCurrentScreen('home')} />;
      default:
        return renderHomeContent();
    }
  };

  const renderHomeContent = () => (
    <ScrollView style={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back!</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      {userProfile && (
        <View style={styles.statsCard}>
          <Text style={styles.cardTitle}>Your Plan</Text>
          <View style={styles.planInfo}>
            <View style={styles.planBadge}>
              <Text style={styles.planText}>
                {userProfile.subscription_tier === 'pro' ? 'PRO' : 'FREE'}
              </Text>
            </View>
            <View style={styles.creditsInfo}>
              <Text style={styles.creditsLabel}>Available Credits:</Text>
              <Text style={styles.creditsValue}>
                {userProfile.subscription_tier === 'pro' 
                  ? 'Unlimited' 
                  : `${Math.max(0, userProfile.usage_quota - userProfile.usage_count)} free + ${userProfile.credits_balance || 0} paid`
                }
              </Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.actionsGrid}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => setCurrentScreen('generate')}
        >
          <Ionicons name="flash" size={32} color="#007AFF" />
          <Text style={styles.actionTitle}>Generate Image</Text>
          <Text style={styles.actionSubtitle}>Create AI images from text</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => setCurrentScreen('gallery')}
        >
          <Ionicons name="images" size={32} color="#007AFF" />
          <Text style={styles.actionTitle}>My Gallery</Text>
          <Text style={styles.actionSubtitle}>View generated images</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => setCurrentScreen('profile')}
        >
          <Ionicons name="person" size={32} color="#007AFF" />
          <Text style={styles.actionTitle}>Profile</Text>
          <Text style={styles.actionSubtitle}>Manage account & billing</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => Alert.alert('Coming Soon', 'Premium features coming soon!')}
        >
          <Ionicons name="star" size={32} color="#FF6B35" />
          <Text style={styles.actionTitle}>Upgrade</Text>
          <Text style={styles.actionSubtitle}>Get unlimited access</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>How it works</Text>
        <View style={styles.step}>
          <Text style={styles.stepNumber}>1</Text>
          <Text style={styles.stepText}>Describe what you want to create</Text>
        </View>
        <View style={styles.step}>
          <Text style={styles.stepNumber}>2</Text>
          <Text style={styles.stepText}>Choose your preferred style</Text>
        </View>
        <View style={styles.step}>
          <Text style={styles.stepNumber}>3</Text>
          <Text style={styles.stepText}>Get your AI-generated image instantly</Text>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      {currentScreen === 'home' ? (
        renderScreen()
      ) : (
        renderScreen()
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  signOutButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statsCard: {
    backgroundColor: 'white',
    marginHorizontal: 24,
    marginBottom: 24,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
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
    justifyContent: 'space-between',
  },
  planBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  planText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  creditsInfo: {
    flex: 1,
    marginLeft: 16,
  },
  creditsLabel: {
    fontSize: 12,
    color: '#666',
  },
  creditsValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  actionsGrid: {
    paddingHorizontal: 24,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
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
    marginBottom: 20,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    color: 'white',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: 'bold',
    lineHeight: 24,
    marginRight: 12,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
  },
});