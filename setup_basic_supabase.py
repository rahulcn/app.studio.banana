#!/usr/bin/env python3
"""
Basic Supabase Setup - Create essential tables only
"""
import requests
import json
import sys

# Supabase credentials (hardcoded for this setup)
SUPABASE_URL = "https://qzktwaenunvyucehoqif.supabase.co"
SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6a3R3YWVudW52eXVjZWhvcWlmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTA2NDM4OSwiZXhwIjoyMDc0NjQwMzg5fQ.wO7zyKAupHJaxmy9ATpWa1rbGqKJWoAUDbcE4yV5ACc"

def execute_sql_query(sql):
    """Execute SQL using Supabase PostgREST API"""
    url = f"{SUPABASE_URL}/rest/v1/rpc/exec_sql"
    headers = {
        'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json'
    }
    
    payload = {
        'query': sql
    }
    
    response = requests.post(url, json=payload, headers=headers)
    return response

def test_connection():
    """Test basic connection to Supabase"""
    url = f"{SUPABASE_URL}/rest/v1/"
    headers = {
        'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}',
        'apikey': SUPABASE_SERVICE_ROLE_KEY
    }
    
    response = requests.get(url, headers=headers)
    return response.status_code == 200

def create_basic_tables():
    """Create the minimal tables required by the app"""
    
    # First, let's try a different approach using the SQL editor endpoint
    sql_commands = [
        # 1. Enable UUID extension
        "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";",
        
        # 2. Create profiles table
        """
        CREATE TABLE IF NOT EXISTS public.profiles (
            id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
            email TEXT,
            username TEXT,
            full_name TEXT,
            avatar_url TEXT,
            bio TEXT,
            website TEXT,
            is_public BOOLEAN DEFAULT TRUE
        );
        """,
        
        # 3. Create generations table (simplified)
        """
        CREATE TABLE IF NOT EXISTS public.generations (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
            prompt_title TEXT,
            prompt_category TEXT,
            reference_image_url TEXT,
            generated_image_url TEXT,
            generation_status TEXT DEFAULT 'completed',
            is_public BOOLEAN DEFAULT FALSE
        );
        """,
        
        # 4. Create user_stats table
        """
        CREATE TABLE IF NOT EXISTS public.user_stats (
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
            total_generations INTEGER DEFAULT 0,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
        );
        """,
        
        # 5. Create payment_subscriptions table
        """
        CREATE TABLE IF NOT EXISTS public.payment_subscriptions (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
            status TEXT DEFAULT 'active',
            generations_used INTEGER DEFAULT 0,
            generations_limit INTEGER DEFAULT 100
        );
        """,
        
        # 6. Enable RLS
        "ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;",
        "ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;",
        "ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;",
        "ALTER TABLE public.payment_subscriptions ENABLE ROW LEVEL SECURITY;",
        
        # 7. Create basic policies
        """
        CREATE POLICY IF NOT EXISTS "Users can view own profile" ON public.profiles
            FOR SELECT USING (auth.uid() = id);
        """,
        """
        CREATE POLICY IF NOT EXISTS "Users can update own profile" ON public.profiles
            FOR UPDATE USING (auth.uid() = id);
        """,
        """
        CREATE POLICY IF NOT EXISTS "Users can view own generations" ON public.generations
            FOR SELECT USING (auth.uid() = user_id);
        """,
        """
        CREATE POLICY IF NOT EXISTS "Users can insert own generations" ON public.generations
            FOR INSERT WITH CHECK (auth.uid() = user_id);
        """,
        """
        CREATE POLICY IF NOT EXISTS "Users can view own stats" ON public.user_stats
            FOR SELECT USING (auth.uid() = user_id);
        """,
        """
        CREATE POLICY IF NOT EXISTS "Users can view own subscriptions" ON public.payment_subscriptions
            FOR SELECT USING (auth.uid() = user_id);
        """,
        
        # 8. Create trigger function
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
        
        # 9. Create trigger
        "DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;",
        """
        CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
        """
    ]
    
    print("📝 Creating SQL commands to execute manually...")
    print("=" * 80)
    
    for i, cmd in enumerate(sql_commands, 1):
        print(f"\n-- Command {i}")
        print(cmd.strip())
    
    print("\n" + "=" * 80)
    print("🎯 COPY THESE COMMANDS TO YOUR SUPABASE SQL EDITOR")
    print("=" * 80)
    print("1. Go to https://supabase.com/dashboard")
    print("2. Navigate to project: qzktwaenunvyucehoqif") 
    print("3. Go to 'SQL Editor' tab")
    print("4. Copy and paste each command above")
    print("5. Run them one by one")
    print("=" * 80)
    
    return True

def main():
    print("🚀 Basic Supabase Setup Starting...")
    
    if not test_connection():
        print("❌ Cannot connect to Supabase")
        return False
        
    print("✅ Connected to Supabase")
    
    # Since direct SQL execution is challenging via REST API,
    # we'll generate the commands for manual execution
    create_basic_tables()
    
    print("\n✅ Setup commands generated!")
    print("Please execute these in your Supabase Dashboard SQL Editor")
    
    return True

if __name__ == "__main__":
    main()