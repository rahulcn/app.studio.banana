import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

interface GenerateScreenProps {
  onBack: () => void;
}

const STYLES = [
  { id: 'photorealistic', name: 'Photorealistic', description: 'Lifelike and detailed' },
  { id: 'artistic', name: 'Artistic', description: 'Creative and expressive' },
  { id: 'cartoon', name: 'Cartoon', description: 'Fun and animated' },
  { id: 'abstract', name: 'Abstract', description: 'Modern and conceptual' },
  { id: 'vintage', name: 'Vintage', description: 'Classic and retro' },
];

export const GenerateScreen: React.FC<GenerateScreenProps> = ({ onBack }) => {
  const { session, userProfile, refreshProfile } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('photorealistic');
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const canGenerate = () => {
    if (!userProfile) return false;
    
    if (userProfile.subscription_tier === 'pro') return true;
    if (userProfile.usage_count < userProfile.usage_quota) return true;
    if (userProfile.credits_balance > 0) return true;
    
    return false;
  };

  const getRemainingCredits = () => {
    if (!userProfile) return 0;
    
    if (userProfile.subscription_tier === 'pro') return 'unlimited';
    
    const freeRemaining = Math.max(0, userProfile.usage_quota - userProfile.usage_count);
    const paidCredits = userProfile.credits_balance || 0;
    
    return `${freeRemaining} free + ${paidCredits} paid`;
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      Alert.alert('Error', 'Please enter a description for your image');
      return;
    }

    if (!canGenerate()) {
      Alert.alert(
        'No Credits Available',
        'You have no generation credits left. Please upgrade your plan or purchase additional credits.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => onBack() },
        ]
      );
      return;
    }

    setGenerating(true);
    
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/generate-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          style: selectedStyle,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Generation failed');
      }

      setGeneratedImage(data.image_url);
      await refreshProfile(); // Update user credits
      
      Alert.alert('Success!', 'Your image has been generated successfully');
      
    } catch (error) {
      console.error('Generation error:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to generate image');
    } finally {
      setGenerating(false);
    }
  };

  const startNewGeneration = () => {
    setGeneratedImage(null);
    setPrompt('');
  };

  if (generatedImage) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Generated Image</Text>
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

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={startNewGeneration}
            >
              <Ionicons name="add" size={20} color="#007AFF" />
              <Text style={styles.secondaryButtonText}>Generate Another</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={onBack}
            >
              <Ionicons name="checkmark" size={20} color="white" />
              <Text style={styles.primaryButtonText}>Done</Text>
            </TouchableOpacity>
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
        <Text style={styles.title}>Generate Image</Text>
      </View>

      <ScrollView style={styles.content}>
        {userProfile && (
          <View style={styles.creditsCard}>
            <Text style={styles.creditsTitle}>Available Credits</Text>
            <Text style={styles.creditsValue}>{getRemainingCredits()}</Text>
            {!canGenerate() && (
              <Text style={styles.noCreditsText}>
                No credits available. Upgrade your plan to continue.
              </Text>
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Describe Your Image</Text>
          <TextInput
            style={styles.promptInput}
            placeholder="A beautiful sunset over mountains, photorealistic..."
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
              {STYLES.map((style) => (
                <TouchableOpacity
                  key={style.id}
                  style={[
                    styles.styleCard,
                    selectedStyle === style.id && styles.selectedStyleCard,
                  ]}
                  onPress={() => setSelectedStyle(style.id)}
                >
                  <Text
                    style={[
                      styles.styleName,
                      selectedStyle === style.id && styles.selectedStyleName,
                    ]}
                  >
                    {style.name}
                  </Text>
                  <Text
                    style={[
                      styles.styleDescription,
                      selectedStyle === style.id && styles.selectedStyleDescription,
                    ]}
                  >
                    {style.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        <TouchableOpacity
          style={[
            styles.generateButton,
            (!canGenerate() || generating || !prompt.trim()) && styles.generateButtonDisabled,
          ]}
          onPress={handleGenerate}
          disabled={!canGenerate() || generating || !prompt.trim()}
        >
          {generating ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="flash" size={20} color="white" />
              <Text style={styles.generateButtonText}>
                {canGenerate() ? 'Generate Image' : 'No Credits Available'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {generating && (
          <View style={styles.generatingInfo}>
            <Text style={styles.generatingText}>
              Creating your image... This may take a few seconds.
            </Text>
          </View>
        )}
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
  creditsCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  creditsTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  creditsValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  noCreditsText: {
    fontSize: 12,
    color: '#FF6B35',
    marginTop: 4,
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 24,
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
    marginBottom: 4,
  },
  selectedStyleName: {
    color: '#007AFF',
  },
  styleDescription: {
    fontSize: 12,
    color: '#666',
  },
  selectedStyleDescription: {
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
    marginBottom: 16,
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
    paddingBottom: 20,
  },
  generatingText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
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
    marginVertical: 20,
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
});