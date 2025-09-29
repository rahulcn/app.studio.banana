import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

// Check if we're in a React Native/Node.js environment
const isReactNative = typeof window === 'undefined';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''

// Create storage adapter that handles server-side rendering
const createStorage = () => {
  // For server-side rendering or React Native, use AsyncStorage or fallback
  if (isReactNative) {
    try {
      return AsyncStorage;
    } catch (error) {
      console.warn('AsyncStorage not available, using fallback');
      return {
        getItem: () => Promise.resolve(null),
        setItem: () => Promise.resolve(),
        removeItem: () => Promise.resolve(),
      };
    }
  }
  
  // For web environments, use localStorage if available
  return {
    getItem: (key: string) => {
      try {
        if (typeof localStorage !== 'undefined') {
          return Promise.resolve(localStorage.getItem(key));
        }
      } catch (error) {
        console.warn('localStorage not available');
      }
      return Promise.resolve(null);
    },
    setItem: (key: string, value: string) => {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(key, value);
        }
      } catch (error) {
        console.warn('localStorage not available');
      }
      return Promise.resolve();
    },
    removeItem: (key: string) => {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(key);
        }
      } catch (error) {
        console.warn('localStorage not available');
      }
      return Promise.resolve();
    },
  };
};

const storage = createStorage();

let supabaseClient: any = null;

// Export null initially, client will be created when needed
export let supabase = null;

// Function to get or create Supabase client safely
export const getSupabaseClient = () => {
  if (supabaseClient) {
    return supabaseClient;
  }
  
  // Only create in browser environment
  if (typeof window === 'undefined') {
    return null;
  }
  
  // Only create client if we have valid config
  if (supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('your-project') && !supabaseAnonKey.includes('your-anon-key')) {
    try {
      supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          storage: storage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      });
      return supabaseClient;
    } catch (error) {
      console.error('Failed to create Supabase client:', error);
      return null;
    }
  }
  
  return null;
};

// Initialize client when possible
if (typeof window !== 'undefined') {
  supabaseClient = getSupabaseClient();
  supabase = supabaseClient;
}

// Database types - Updated for migration schema
export interface Profile {
  id: string
  created_at: string
  updated_at: string
  email?: string
  username?: string
  full_name?: string
  avatar_url?: string
  bio?: string
  website?: string
  is_public: boolean
}

export interface Generation {
  id: string
  user_id: string
  created_at: string
  updated_at: string
  prompt_id?: number
  prompt_title?: string
  prompt_description?: string
  prompt_category?: string
  custom_prompt?: string
  reference_image_url?: string
  reference_image_filename?: string
  generated_image_url?: string
  generated_image_filename?: string
  generation_status: 'pending' | 'processing' | 'completed' | 'failed'
  processing_time_ms?: number
  model_version?: string
  generation_params?: any
  error_message?: string
  is_public: boolean
  likes_count: number
  views_count: number
  shares_count: number
}

export interface Collection {
  id: string
  user_id: string
  created_at: string
  updated_at: string
  name: string
  description?: string
  is_public: boolean
  cover_image_url?: string
}

export interface UserStats {
  user_id: string
  updated_at: string
  total_generations: number
  public_generations: number
  total_likes_received: number
  total_comments_received: number
  total_followers: number
  total_following: number
  current_streak: number
  longest_streak: number
  last_generation_date?: string
}

export interface PaymentSubscription {
  id: string
  user_id: string
  created_at: string
  updated_at: string
  stripe_customer_id?: string
  stripe_subscription_id?: string
  stripe_price_id?: string
  status: 'active' | 'inactive' | 'cancelled' | 'past_due' | 'trialing'
  current_period_start?: string
  current_period_end?: string
  cancel_at_period_end: boolean
  plan_name?: string
  plan_price?: number
  plan_interval?: string
  generations_used: number
  generations_limit: number
}

// Legacy types (keeping for backward compatibility during migration)
export interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  subscription_tier: 'free' | 'pro';
  usage_quota: number;
  usage_count: number;
  credits_balance: number;
  created_at: string;
  updated_at: string;
}

export interface GeneratedImage {
  id: string;
  user_id: string;
  original_filename: string;
  storage_path: string;
  generation_prompt: string;
  generation_model: string;
  generation_style?: string;
  usage_source: string;
  created_at: string;
}

export interface PaymentTransaction {
  id: string;
  session_id: string;
  user_id: string;
  user_email: string;
  package_id: string;
  amount: number;
  currency: string;
  credits: number;
  payment_status: 'pending' | 'paid' | 'failed' | 'expired';
  status: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentPackage {
  name: string;
  price: number;
  currency: string;
  credits: number;
  description: string;
}

// ============================================================================
// AUTH HELPERS
// ============================================================================

export class SupabaseHelpers {
  
  static async signUp(email: string, password: string, userData?: any) {
    try {
      if (!supabase) {
        throw new Error('Supabase client not available');
      }
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData || {}
        }
      })
      return { data, error }
    } catch (error) {
      console.error('Sign up error:', error)
      return { data: null, error }
    }
  }

  static async signIn(email: string, password: string) {
    try {
      if (!supabase) {
        throw new Error('Supabase client not available');
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      return { data, error }
    } catch (error) {
      console.error('Sign in error:', error)
      return { data: null, error }
    }
  }

  static async signOut() {
    try {
      if (!supabase) {
        throw new Error('Supabase client not available');
      }
      
      const { error } = await supabase.auth.signOut()
      return { error }
    } catch (error) {
      console.error('Sign out error:', error)
      return { error }
    }
  }

  static async getCurrentUser() {
    try {
      if (!supabase) return null;
      
      const { data: { user } } = await supabase.auth.getUser()
      return user
    } catch (error) {
      console.error('Get current user error:', error)
      return null
    }
  }

  static async getCurrentSession() {
    try {
      if (!supabase) return null;
      
      const { data: { session } } = await supabase.auth.getSession()
      return session
    } catch (error) {
      console.error('Get current session error:', error)
      return null
    }
  }

  // ============================================================================
  // PROFILE HELPERS
  // ============================================================================

  static async getProfile(userId: string): Promise<Profile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error) {
        console.error('Get profile error:', error)
        return null
      }
      return data
    } catch (error) {
      console.error('Get profile error:', error)
      return null
    }
  }

  static async updateProfile(userId: string, updates: Partial<Profile>) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single()
      
      return { data, error }
    } catch (error) {
      console.error('Update profile error:', error)
      return { data: null, error }
    }
  }

  // ============================================================================
  // GENERATION HELPERS
  // ============================================================================

  static async createGeneration(generationData: Partial<Generation>) {
    try {
      const { data, error } = await supabase
        .from('generations')
        .insert(generationData)
        .select()
        .single()
      
      return { data, error }
    } catch (error) {
      console.error('Create generation error:', error)
      return { data: null, error }
    }
  }

  static async updateGeneration(generationId: string, updates: Partial<Generation>) {
    try {
      const { data, error } = await supabase
        .from('generations')
        .update(updates)
        .eq('id', generationId)
        .select()
        .single()
      
      return { data, error }
    } catch (error) {
      console.error('Update generation error:', error)
      return { data: null, error }
    }
  }

  static async getUserGenerations(userId: string, limit = 50, offset = 0): Promise<Generation[]> {
    try {
      const { data, error } = await supabase
        .from('generations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)
        .range(offset, offset + limit - 1)
      
      if (error) {
        console.error('Get user generations error:', error)
        return []
      }
      return data || []
    } catch (error) {
      console.error('Get user generations error:', error)
      return []
    }
  }

  static async getPublicGenerations(limit = 50, offset = 0): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('public_gallery')
        .select('*')
        .limit(limit)
        .range(offset, offset + limit - 1)
      
      if (error) {
        console.error('Get public generations error:', error)
        return []
      }
      return data || []
    } catch (error) {
      console.error('Get public generations error:', error)
      return []
    }
  }

  // ============================================================================
  // SUBSCRIPTION HELPERS
  // ============================================================================

  static async getUserSubscription(userId: string): Promise<PaymentSubscription | null> {
    try {
      const { data, error } = await supabase
        .from('payment_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single()
      
      if (error) {
        console.error('Get user subscription error:', error)
        return null
      }
      return data
    } catch (error) {
      console.error('Get user subscription error:', error)
      return null
    }
  }

  static async getUserStats(userId: string): Promise<UserStats | null> {
    try {
      const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .single()
      
      if (error) {
        console.error('Get user stats error:', error)
        return null
      }
      return data
    } catch (error) {
      console.error('Get user stats error:', error)
      return null
    }
  }

  // ============================================================================
  // STORAGE HELPERS
  // ============================================================================

  static async uploadImage(bucket: string, filePath: string, file: File | Blob, contentType = 'image/jpeg') {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          contentType,
          upsert: false
        })
      
      if (error) {
        console.error('Upload image error:', error)
        return { data: null, error }
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath)
      
      return { data: { ...data, publicUrl: publicUrlData.publicUrl }, error: null }
    } catch (error) {
      console.error('Upload image error:', error)
      return { data: null, error }
    }
  }

  static getPublicUrl(bucket: string, filePath: string) {
    try {
      const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath)
      
      return data.publicUrl
    } catch (error) {
      console.error('Get public URL error:', error)
      return ''
    }
  }
}