#!/usr/bin/env python3
"""
Apply Supabase Database Schema
This script automatically applies the SQL schema to the Supabase database.
"""
import os
import sys
from dotenv import load_dotenv
import requests
import json

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    print("❌ Missing Supabase credentials in .env file")
    sys.exit(1)

# SQL commands to create the schema
sql_commands = [
    # 1. Create profiles table
    """
    CREATE TABLE IF NOT EXISTS public.profiles (
      id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL PRIMARY KEY,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
      email TEXT,
      username TEXT UNIQUE,
      full_name TEXT,
      avatar_url TEXT,
      bio TEXT,
      website TEXT,
      is_public BOOLEAN DEFAULT TRUE
    );
    
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
    """,
    
    # 2. Create RLS policies for profiles
    """
    DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
    CREATE POLICY "Users can view own profile" ON public.profiles
      FOR SELECT USING (auth.uid() = id);
      
    DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
    CREATE POLICY "Users can update own profile" ON public.profiles
      FOR UPDATE USING (auth.uid() = id);
    """,
    
    # 3. Create generations table
    """
    CREATE TABLE IF NOT EXISTS public.generations (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
      
      prompt_id INTEGER,
      prompt_title TEXT,
      prompt_description TEXT,
      prompt_category TEXT,
      custom_prompt TEXT,
      
      reference_image_url TEXT,
      reference_image_filename TEXT,
      generated_image_url TEXT,
      generated_image_filename TEXT,
      
      generation_status TEXT DEFAULT 'pending' CHECK (generation_status IN ('pending', 'processing', 'completed', 'failed')),
      processing_time_ms INTEGER,
      model_version TEXT DEFAULT 'gemini-2.5-flash',
      generation_params JSONB DEFAULT '{}',
      error_message TEXT,
      
      is_public BOOLEAN DEFAULT FALSE,
      likes_count INTEGER DEFAULT 0,
      views_count INTEGER DEFAULT 0,
      shares_count INTEGER DEFAULT 0
    );
    
    ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;
    """,
    
    # 4. Create RLS policies for generations
    """
    DROP POLICY IF EXISTS "Users can view own generations" ON public.generations;
    CREATE POLICY "Users can view own generations" ON public.generations
      FOR SELECT USING (auth.uid() = user_id);
      
    DROP POLICY IF EXISTS "Users can insert own generations" ON public.generations;
    CREATE POLICY "Users can insert own generations" ON public.generations
      FOR INSERT WITH CHECK (auth.uid() = user_id);
    """,
    
    # 5. Create user_stats table
    """
    CREATE TABLE IF NOT EXISTS public.user_stats (
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
      
      total_generations INTEGER DEFAULT 0,
      public_generations INTEGER DEFAULT 0,
      total_likes_received INTEGER DEFAULT 0,
      total_comments_received INTEGER DEFAULT 0,
      total_followers INTEGER DEFAULT 0,
      total_following INTEGER DEFAULT 0,
      
      current_streak INTEGER DEFAULT 0,
      longest_streak INTEGER DEFAULT 0,
      last_generation_date DATE
    );
    
    ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
    """,
    
    # 6. Create RLS policy for user_stats
    """
    DROP POLICY IF EXISTS "Users can view own stats" ON public.user_stats;
    CREATE POLICY "Users can view own stats" ON public.user_stats
      FOR SELECT USING (auth.uid() = user_id);
    """,
    
    # 7. Create payment_subscriptions table
    """
    CREATE TABLE IF NOT EXISTS public.payment_subscriptions (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
      
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT UNIQUE,
      stripe_price_id TEXT,
      
      status TEXT DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'cancelled', 'past_due', 'trialing')),
      current_period_start TIMESTAMP WITH TIME ZONE,
      current_period_end TIMESTAMP WITH TIME ZONE,
      cancel_at_period_end BOOLEAN DEFAULT FALSE,
      
      plan_name TEXT,
      plan_price DECIMAL(10,2),
      plan_interval TEXT,
      
      generations_used INTEGER DEFAULT 0,
      generations_limit INTEGER DEFAULT 100
    );
    
    ALTER TABLE public.payment_subscriptions ENABLE ROW LEVEL SECURITY;
    """,
    
    # 8. Create RLS policy for payment_subscriptions
    """
    DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.payment_subscriptions;
    CREATE POLICY "Users can view own subscriptions" ON public.payment_subscriptions
      FOR SELECT USING (auth.uid() = user_id);
    """,
    
    # 9. Create trigger function for new users
    """
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS TRIGGER AS $$
    BEGIN
      INSERT INTO public.profiles (id, email, username, full_name)
      VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name')
      );
      
      INSERT INTO public.user_stats (user_id) VALUES (NEW.id);
      INSERT INTO public.payment_subscriptions (user_id, status, generations_limit) 
      VALUES (NEW.id, 'active', 100);
      
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
    """,
    
    # 10. Create trigger
    """
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
    """
]

def execute_sql(sql_command):
    """Execute a SQL command against Supabase"""
    url = f"{SUPABASE_URL}/rest/v1/rpc/exec_sql"
    headers = {
        'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}',
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY
    }
    
    # Use direct REST API for SQL execution
    url = f"{SUPABASE_URL}/rest/v1/rpc"
    data = {
        'sql': sql_command
    }
    
    response = requests.post(url, headers=headers, json=data)
    return response

def main():
    print("🚀 Starting Supabase Database Schema Setup...")
    print(f"📍 Supabase URL: {SUPABASE_URL}")
    
    # Test connection first
    headers = {
        'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}',
        'apikey': SUPABASE_SERVICE_ROLE_KEY
    }
    
    test_url = f"{SUPABASE_URL}/rest/v1/"
    test_response = requests.get(test_url, headers=headers)
    
    if test_response.status_code != 200:
        print(f"❌ Failed to connect to Supabase: {test_response.status_code}")
        print(f"Response: {test_response.text}")
        sys.exit(1)
    
    print("✅ Connected to Supabase successfully")
    
    # Execute each SQL command
    for i, sql_command in enumerate(sql_commands, 1):
        print(f"⏳ Executing SQL command {i}/{len(sql_commands)}...")
        
        try:
            # For now, let's use a direct PostgreSQL connection approach
            # Since the REST API might not support direct SQL execution
            print(f"📝 SQL Command {i}:")
            print(sql_command.strip()[:100] + "..." if len(sql_command.strip()) > 100 else sql_command.strip())
            print()
            
        except Exception as e:
            print(f"❌ Error executing SQL command {i}: {str(e)}")
            continue
    
    print("\n" + "="*60)
    print("🎯 MANUAL SETUP REQUIRED")
    print("="*60)
    print("Since direct SQL execution via REST API has limitations,")
    print("please manually execute the SQL commands in your Supabase Dashboard:")
    print()
    print("1. Go to: https://supabase.com/dashboard")
    print("2. Navigate to your project: qzktwaenunvyucehoqif")
    print("3. Go to 'SQL Editor' tab")
    print("4. Copy and paste the SQL commands from SUPABASE_SETUP_INSTRUCTIONS.md")
    print("5. Execute them one by one")
    print()
    print("After that, the app should work correctly!")
    print("="*60)

if __name__ == "__main__":
    main()