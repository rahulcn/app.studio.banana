// Example: Direct Supabase Usage in React Native Component
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { supabase, SupabaseHelpers } from '../lib/supabase';

const DirectSupabaseExample = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [generations, setGenerations] = useState([]);
  const [loading, setLoading] = useState(true);

  // ============================================================================
  // AUTHENTICATION - Direct Supabase Auth
  // ============================================================================
  
  useEffect(() => {
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);
        
        if (session?.user) {
          setUser(session.user);
          await loadUserData(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
          setGenerations([]);
        }
        setLoading(false);
      }
    );

    // Check current session
    checkCurrentSession();

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const checkCurrentSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await loadUserData(session.user.id);
      }
    } catch (error) {
      console.error('Session check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (email: string, password: string) => {
    try {
      const { data, error } = await SupabaseHelpers.signUp(email, password, {
        username: email.split('@')[0] // Auto-generate username
      });

      if (error) {
        Alert.alert('Sign Up Error', error.message);
      } else {
        Alert.alert('Success', 'Check your email for verification link!');
      }
    } catch (error) {
      console.error('Sign up error:', error);
    }
  };

  const handleSignIn = async (email: string, password: string) => {
    try {
      const { data, error } = await SupabaseHelpers.signIn(email, password);
      
      if (error) {
        Alert.alert('Sign In Error', error.message);
      }
      // User state will be updated via onAuthStateChange listener
    } catch (error) {
      console.error('Sign in error:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await SupabaseHelpers.signOut();
      // User state will be cleared via onAuthStateChange listener
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // ============================================================================
  // DATA OPERATIONS - Direct Database Access
  // ============================================================================

  const loadUserData = async (userId: string) => {
    try {
      // Load user profile
      const userProfile = await SupabaseHelpers.getProfile(userId);
      setProfile(userProfile);

      // Load user's generations
      const userGenerations = await SupabaseHelpers.getUserGenerations(userId, 20);
      setGenerations(userGenerations);

    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  // ============================================================================
  // REAL-TIME SUBSCRIPTIONS - Live Updates
  // ============================================================================

  useEffect(() => {
    if (!user) return;

    // Subscribe to new generations
    const generationSubscription = supabase
      .channel('user_generations')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'generations',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('New generation:', payload);
          setGenerations(prev => [payload.new, ...prev]);
        }
      )
      .subscribe();

    // Subscribe to profile updates
    const profileSubscription = supabase
      .channel('user_profile')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Profile updated:', payload);
          setProfile(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(generationSubscription);
      supabase.removeChannel(profileSubscription);
    };
  }, [user]);

  // ============================================================================
  // FILE UPLOAD - Direct Storage Upload
  // ============================================================================

  const uploadReferenceImage = async (imageUri: string, userId: string) => {
    try {
      // Convert image to blob
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      // Generate unique filename
      const fileName = `${userId}/${Date.now()}.jpg`;
      
      // Upload directly to Supabase Storage
      const { data, error } = await supabase.storage
        .from('reference-images')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('reference-images')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  };

  // ============================================================================
  // AI GENERATION - Still needs backend
  // ============================================================================

  const generateImage = async (promptId: number, referenceImageUrl: string) => {
    try {
      // Create generation record first
      const { data: generation, error } = await SupabaseHelpers.createGeneration({
        user_id: user.id,
        prompt_id: promptId,
        reference_image_url: referenceImageUrl,
        generation_status: 'pending'
      });

      if (error) {
        throw error;
      }

      // Call backend API for actual AI generation
      const response = await fetch('/api/generate-with-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt_id: promptId,
          image_data: referenceImageUrl, // Use URL instead of base64
          generation_id: generation.id // Pass Supabase generation ID
        })
      });

      const result = await response.json();
      
      if (!result.success) {
        // Update generation with error
        await SupabaseHelpers.updateGeneration(generation.id, {
          generation_status: 'failed',
          error_message: result.error
        });
        throw new Error(result.error);
      }

      // Generation will be updated by backend and we'll get real-time update
      return result;
    } catch (error) {
      console.error('Generation error:', error);
      throw error;
    }
  };

  // ============================================================================
  // SOCIAL FEATURES - Direct Database Operations
  // ============================================================================

  const toggleLike = async (generationId: string) => {
    try {
      // Check if already liked
      const { data: existingLike } = await SupabaseHelpers.getUserLike(user.id, generationId);
      
      if (existingLike) {
        // Remove like
        await supabase
          .from('likes')
          .delete()
          .eq('user_id', user.id)
          .eq('generation_id', generationId);
      } else {
        // Add like
        await supabase
          .from('likes')
          .insert({
            user_id: user.id,
            generation_id: generationId
          });
      }
      
      // Like count will be updated automatically by database triggers
    } catch (error) {
      console.error('Like toggle error:', error);
    }
  };

  const addComment = async (generationId: string, content: string) => {
    try {
      await SupabaseHelpers.addComment(user.id, generationId, content);
      // Comments will be updated via real-time subscription
    } catch (error) {
      console.error('Comment error:', error);
    }
  };

  // ============================================================================
  // COMPONENT RENDER
  // ============================================================================

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={{ flex: 1, padding: 20 }}>
        <Text style={{ fontSize: 24, marginBottom: 20 }}>Welcome!</Text>
        <TouchableOpacity
          style={{ backgroundColor: '#007AFF', padding: 15, borderRadius: 8, marginBottom: 10 }}
          onPress={() => handleSignIn('test@example.com', 'password')}
        >
          <Text style={{ color: 'white', textAlign: 'center' }}>Sign In</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ backgroundColor: '#34C759', padding: 15, borderRadius: 8 }}
          onPress={() => handleSignUp('test@example.com', 'password')}
        >
          <Text style={{ color: 'white', textAlign: 'center' }}>Sign Up</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 20, marginBottom: 10 }}>
        Welcome, {profile?.username || user.email}!
      </Text>
      
      <Text style={{ marginBottom: 10 }}>
        Total Generations: {generations.length}
      </Text>
      
      <TouchableOpacity
        style={{ backgroundColor: '#FF3B30', padding: 15, borderRadius: 8, marginBottom: 20 }}
        onPress={handleSignOut}
      >
        <Text style={{ color: 'white', textAlign: 'center' }}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={{ fontSize: 18, marginBottom: 10 }}>Recent Generations:</Text>
      {generations.map((gen) => (
        <View key={gen.id} style={{ padding: 10, backgroundColor: '#f0f0f0', marginBottom: 5, borderRadius: 5 }}>
          <Text>{gen.prompt_title}</Text>
          <Text style={{ fontSize: 12, color: '#666' }}>{gen.created_at}</Text>
          <TouchableOpacity onPress={() => toggleLike(gen.id)}>
            <Text>❤️ {gen.likes_count || 0}</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
};

export default DirectSupabaseExample;