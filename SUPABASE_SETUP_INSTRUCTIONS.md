# Supabase Database Setup Instructions

## 🎯 Quick Setup Guide for Your Supabase Project

**Your Supabase Project:** https://qzktwaenunvyucehoqif.supabase.co

### Step 1: Access Supabase Dashboard
1. Go to: https://supabase.com/dashboard
2. Navigate to your project: `qzktwaenunvyucehoqif`
3. Go to the "SQL Editor" tab

### Step 2: Create Tables (Execute in SQL Editor)
Copy and paste each section below into the SQL Editor and run them:

#### A. Create profiles table:
```sql
CREATE TABLE public.profiles (
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

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
  
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
```

#### B. Create generations table:
```sql
CREATE TABLE public.generations (
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

CREATE POLICY "Users can view own generations" ON public.generations
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can insert own generations" ON public.generations
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

#### C. Create user_stats table:
```sql
CREATE TABLE public.user_stats (
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

CREATE POLICY "Users can view own stats" ON public.user_stats
  FOR SELECT USING (auth.uid() = user_id);
```

#### D. Create payment_subscriptions table:
```sql
CREATE TABLE public.payment_subscriptions (
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

CREATE POLICY "Users can view own subscriptions" ON public.payment_subscriptions
  FOR SELECT USING (auth.uid() = user_id);
```

#### E. Auto-create profiles trigger:
```sql
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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

### Step 3: Create Storage Buckets
1. Go to "Storage" in your Supabase dashboard
2. Create these buckets:

- **reference-images** (Private)
- **generated-images** (Private)  
- **profile-avatars** (Public)
- **public-gallery** (Public)

### Step 4: Test Your Setup
Run this test query in SQL Editor:
```sql
SELECT 
  table_name, 
  table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('profiles', 'generations', 'user_stats', 'payment_subscriptions')
ORDER BY table_name;
```

You should see 4 tables listed.

### Step 5: Verify Environment Variables
Your current config looks correct:
- SUPABASE_URL: https://qzktwaenunvyucehoqif.supabase.co ✅
- SUPABASE_ANON_KEY: eyJhbGci... ✅  
- SUPABASE_SERVICE_ROLE_KEY: eyJhbGci... ✅

## 🎉 Once Complete
After running these SQL commands, your Supabase database will have:
- ✅ User profiles with authentication
- ✅ Image generation tracking  
- ✅ User statistics and streaks
- ✅ Payment/subscription management
- ✅ Automatic profile creation on signup
- ✅ Storage buckets for images

Let me know once you've executed these and I'll help test the integration!