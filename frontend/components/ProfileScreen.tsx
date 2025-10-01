import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { PaymentPackage } from '../lib/supabase';

interface ProfileScreenProps {
  onBack: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onBack }) => {
  const { user, userProfile, refreshProfile } = useAuth();
  const [packages, setPackages] = useState<Record<string, PaymentPackage>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPaymentPackages();
  }, []);

  const loadPaymentPackages = async () => {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/packages`);
      const data = await response.json();
      setPackages(data.packages || {});
    } catch (error) {
      console.error('Failed to load packages:', error);
    }
  };

  const handlePurchase = async (packageId: string) => {
    if (!user) return;

    setLoading(true);
    
    try {
      const originUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';
      
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/payments/checkout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          package_id: packageId,
          origin_url: originUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to create checkout session');
      }

      // In a real React Native app, you would use WebView or linking to open the checkout URL
      Alert.alert(
        'Payment',
        `This would redirect to Stripe checkout for ${packages[packageId]?.name}. In a real app, this would open a WebView or external browser.`,
        [
          { text: 'Cancel' },
          { text: 'Continue', onPress: () => console.log('Checkout URL:', data.checkout_url) },
        ]
      );
      
    } catch (error) {
      console.error('Purchase error:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Purchase failed');
    } finally {
      setLoading(false);
    }
  };

  const getUsagePercentage = () => {
    if (!userProfile || userProfile.subscription_tier === 'pro') return 0;
    return (userProfile.usage_count / userProfile.usage_quota) * 100;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Profile</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* User Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.userCard}>
            <View style={styles.avatarContainer}>
              <Ionicons name="person" size={32} color="#007AFF" />
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userEmail}>{user?.email}</Text>
              <Text style={styles.userPlan}>
                {userProfile?.subscription_tier === 'pro' ? 'Pro Member' : 'Free Member'}
              </Text>
            </View>
          </View>
        </View>

        {/* Usage Stats */}
        {userProfile && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Usage</Text>
            <View style={styles.usageCard}>
              {userProfile.subscription_tier === 'pro' ? (
                <View style={styles.unlimitedBadge}>
                  <Ionicons name="infinity" size={24} color="#007AFF" />
                  <Text style={styles.unlimitedText}>Unlimited Generations</Text>
                </View>
              ) : (
                <>
                  <View style={styles.usageHeader}>
                    <Text style={styles.usageTitle}>Free Tier Usage</Text>
                    <Text style={styles.usageCount}>
                      {userProfile.usage_count} / {userProfile.usage_quota}
                    </Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View 
                      style={[styles.progressFill, { width: `${getUsagePercentage()}%` }]} 
                    />
                  </View>
                </>
              )}
              
              {userProfile.credits_balance > 0 && (
                <View style={styles.creditsInfo}>
                  <Text style={styles.creditsLabel}>Paid Credits:</Text>
                  <Text style={styles.creditsValue}>{userProfile.credits_balance}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Upgrade Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upgrade Your Plan</Text>
          
          {Object.entries(packages).map(([packageId, pkg]) => (
            <View key={packageId} style={styles.packageCard}>
              <View style={styles.packageHeader}>
                <View>
                  <Text style={styles.packageName}>{pkg.name}</Text>
                  <Text style={styles.packageDescription}>{pkg.description}</Text>
                </View>
                <Text style={styles.packagePrice}>
                  ${pkg.price.toFixed(2)}
                </Text>
              </View>
              
              <TouchableOpacity
                style={[styles.purchaseButton, loading && styles.purchaseButtonDisabled]}
                onPress={() => handlePurchase(packageId)}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Ionicons name="card" size={16} color="white" />
                    <Text style={styles.purchaseButtonText}>
                      {packageId.includes('monthly') ? 'Subscribe' : 'Purchase'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Account Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => refreshProfile()}
          >
            <Ionicons name="refresh" size={20} color="#007AFF" />
            <Text style={styles.actionButtonText}>Refresh Account</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => Alert.alert('Coming Soon', 'Usage history will be available soon!')}
          >
            <Ionicons name="time" size={20} color="#007AFF" />
            <Text style={styles.actionButtonText}>Usage History</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => Alert.alert('Coming Soon', 'Billing management will be available soon!')}
          >
            <Ionicons name="card" size={20} color="#007AFF" />
            <Text style={styles.actionButtonText}>Billing</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  userCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e3f2fd',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  userEmail: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  userPlan: {
    fontSize: 14,
    color: '#666',
  },
  usageCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
  },
  unlimitedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  unlimitedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 8,
  },
  usageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  usageTitle: {
    fontSize: 14,
    color: '#666',
  },
  usageCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e1e5e9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  creditsInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e1e5e9',
  },
  creditsLabel: {
    fontSize: 14,
    color: '#666',
  },
  creditsValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  packageCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  packageName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  packageDescription: {
    fontSize: 14,
    color: '#666',
  },
  packagePrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  purchaseButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  purchaseButtonDisabled: {
    backgroundColor: '#ccc',
  },
  purchaseButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  actionButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
    marginLeft: 12,
  },
});