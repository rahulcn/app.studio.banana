import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Database types
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