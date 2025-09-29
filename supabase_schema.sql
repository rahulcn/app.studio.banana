-- AI Image Generator Supabase Schema
-- This script creates the complete database schema for migrating from MongoDB to Supabase

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret-here';

-- Create profiles table (extends auth.users)
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
  is_public BOOLEAN DEFAULT TRUE,
  
  -- Constraint for username length
  CONSTRAINT username_length CHECK (char_length(username) >= 3)
);

-- Create generations table (tracks all AI image generation requests)
CREATE TABLE public.generations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  
  -- Prompt information
  prompt_id INTEGER,
  prompt_title TEXT,
  prompt_description TEXT,
  prompt_category TEXT,
  custom_prompt TEXT,
  
  -- Reference image
  reference_image_url TEXT,
  reference_image_filename TEXT,
  
  -- Generated image
  generated_image_url TEXT,
  generated_image_filename TEXT,
  
  -- Metadata
  generation_status TEXT DEFAULT 'pending' CHECK (generation_status IN ('pending', 'processing', 'completed', 'failed')),
  processing_time_ms INTEGER,
  model_version TEXT DEFAULT 'gemini-2.5-flash',
  generation_params JSONB DEFAULT '{}',
  error_message TEXT,
  
  -- Social features
  is_public BOOLEAN DEFAULT FALSE,
  likes_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0
);

-- Create collections table (user-organized groups of generations)
CREATE TABLE public.collections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  cover_image_url TEXT,
  
  -- Constraint for collection name length
  CONSTRAINT collection_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 100)
);

-- Create collection_generations junction table
CREATE TABLE public.collection_generations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  collection_id UUID REFERENCES public.collections(id) ON DELETE CASCADE NOT NULL,
  generation_id UUID REFERENCES public.generations(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  position INTEGER DEFAULT 0,
  
  -- Unique constraint to prevent duplicate entries
  UNIQUE(collection_id, generation_id)
);

-- Create likes table (social engagement)
CREATE TABLE public.likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  generation_id UUID REFERENCES public.generations(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  
  -- Unique constraint to prevent duplicate likes
  UNIQUE(user_id, generation_id)
);

-- Create comments table
CREATE TABLE public.comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  generation_id UUID REFERENCES public.generations(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  
  content TEXT NOT NULL,
  is_edited BOOLEAN DEFAULT FALSE,
  
  -- Constraint for comment length
  CONSTRAINT comment_length CHECK (char_length(content) >= 1 AND char_length(content) <= 1000)
);

-- Create follows table (social connections)
CREATE TABLE public.follows (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  
  -- Unique constraint and self-follow prevention
  UNIQUE(follower_id, following_id),
  CHECK(follower_id != following_id)
);

-- Create payment_subscriptions table (Stripe integration)
CREATE TABLE public.payment_subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
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
  
  -- Plan details
  plan_name TEXT,
  plan_price DECIMAL(10,2),
  plan_interval TEXT, -- 'month' or 'year'
  
  -- Usage tracking
  generations_used INTEGER DEFAULT 0,
  generations_limit INTEGER DEFAULT 100 -- Default free tier limit
);

-- Create user_stats table (aggregated user statistics)
CREATE TABLE public.user_stats (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  
  total_generations INTEGER DEFAULT 0,
  public_generations INTEGER DEFAULT 0,
  total_likes_received INTEGER DEFAULT 0,
  total_comments_received INTEGER DEFAULT 0,
  total_followers INTEGER DEFAULT 0,
  total_following INTEGER DEFAULT 0,
  
  -- Streak tracking
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_generation_date DATE
);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Generations policies
CREATE POLICY "Public generations are viewable by everyone" ON public.generations
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view own generations" ON public.generations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own generations" ON public.generations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own generations" ON public.generations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own generations" ON public.generations
  FOR DELETE USING (auth.uid() = user_id);

-- Collections policies
CREATE POLICY "Public collections are viewable by everyone" ON public.collections
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view own collections" ON public.collections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own collections" ON public.collections
  FOR ALL USING (auth.uid() = user_id);

-- Collection generations policies
CREATE POLICY "Collection generations follow collection visibility" ON public.collection_generations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.collections 
      WHERE id = collection_id 
      AND (is_public = true OR user_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage own collection generations" ON public.collection_generations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.collections 
      WHERE id = collection_id AND user_id = auth.uid()
    )
  );

-- Likes policies
CREATE POLICY "Likes are viewable by everyone" ON public.likes
  FOR SELECT USING (true);

CREATE POLICY "Users can manage own likes" ON public.likes
  FOR ALL USING (auth.uid() = user_id);

-- Comments policies  
CREATE POLICY "Comments on public generations are viewable by everyone" ON public.comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.generations 
      WHERE id = generation_id AND is_public = true
    )
  );

CREATE POLICY "Users can view comments on own generations" ON public.comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.generations 
      WHERE id = generation_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own comments" ON public.comments
  FOR ALL USING (auth.uid() = user_id);

-- Follows policies
CREATE POLICY "Follows are viewable by everyone" ON public.follows
  FOR SELECT USING (true);

CREATE POLICY "Users can manage own follows" ON public.follows
  FOR ALL USING (auth.uid() = follower_id);

-- Payment subscriptions policies
CREATE POLICY "Users can view own subscriptions" ON public.payment_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own subscriptions" ON public.payment_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- User stats policies
CREATE POLICY "Public user stats are viewable by everyone" ON public.user_stats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = user_id AND is_public = true
    )
  );

CREATE POLICY "Users can view own stats" ON public.user_stats
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.raw_user_meta_data->>'user_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  
  -- Initialize user stats
  INSERT INTO public.user_stats (user_id) VALUES (NEW.id);
  
  -- Initialize payment subscription (free tier)
  INSERT INTO public.payment_subscriptions (user_id, status, generations_limit) 
  VALUES (NEW.id, 'active', 100);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Function to update user stats when generations are created
CREATE OR REPLACE FUNCTION public.update_user_stats_on_generation()
RETURNS TRIGGER AS $$
BEGIN
  -- Update total generations
  INSERT INTO public.user_stats (user_id, total_generations, last_generation_date)
  VALUES (NEW.user_id, 1, CURRENT_DATE)
  ON CONFLICT (user_id) DO UPDATE SET
    total_generations = user_stats.total_generations + 1,
    last_generation_date = CURRENT_DATE,
    public_generations = CASE 
      WHEN NEW.is_public THEN user_stats.public_generations + 1 
      ELSE user_stats.public_generations 
    END;
    
  -- Update subscription usage
  UPDATE public.payment_subscriptions 
  SET generations_used = generations_used + 1
  WHERE user_id = NEW.user_id AND status = 'active';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for generation stats
CREATE TRIGGER on_generation_created
  AFTER INSERT ON public.generations
  FOR EACH ROW EXECUTE PROCEDURE public.update_user_stats_on_generation();

-- Function to update like counts
CREATE OR REPLACE FUNCTION public.update_like_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment like count
    UPDATE public.generations 
    SET likes_count = likes_count + 1 
    WHERE id = NEW.generation_id;
    
    -- Update user stats for the generation owner
    UPDATE public.user_stats 
    SET total_likes_received = total_likes_received + 1
    WHERE user_id = (SELECT user_id FROM public.generations WHERE id = NEW.generation_id);
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement like count
    UPDATE public.generations 
    SET likes_count = likes_count - 1 
    WHERE id = OLD.generation_id;
    
    -- Update user stats for the generation owner
    UPDATE public.user_stats 
    SET total_likes_received = total_likes_received - 1
    WHERE user_id = (SELECT user_id FROM public.generations WHERE id = OLD.generation_id);
    
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for like counts
CREATE TRIGGER on_like_created
  AFTER INSERT ON public.likes
  FOR EACH ROW EXECUTE PROCEDURE public.update_like_counts();

CREATE TRIGGER on_like_deleted
  AFTER DELETE ON public.likes
  FOR EACH ROW EXECUTE PROCEDURE public.update_like_counts();

-- Function to update follow counts
CREATE OR REPLACE FUNCTION public.update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update follower stats
    UPDATE public.user_stats 
    SET total_following = total_following + 1
    WHERE user_id = NEW.follower_id;
    
    -- Update following stats  
    UPDATE public.user_stats 
    SET total_followers = total_followers + 1
    WHERE user_id = NEW.following_id;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Update follower stats
    UPDATE public.user_stats 
    SET total_following = total_following - 1
    WHERE user_id = OLD.follower_id;
    
    -- Update following stats
    UPDATE public.user_stats 
    SET total_followers = total_followers - 1
    WHERE user_id = OLD.following_id;
    
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for follow counts
CREATE TRIGGER on_follow_created
  AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE PROCEDURE public.update_follow_counts();

CREATE TRIGGER on_follow_deleted  
  AFTER DELETE ON public.follows
  FOR EACH ROW EXECUTE PROCEDURE public.update_follow_counts();

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================

-- Create storage buckets for images
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('reference-images', 'reference-images', false),
  ('generated-images', 'generated-images', false),
  ('profile-avatars', 'profile-avatars', false),
  ('public-gallery', 'public-gallery', true);

-- Storage policies for reference images
CREATE POLICY "Users can upload own reference images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'reference-images' AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own reference images" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'reference-images' AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policies for generated images  
CREATE POLICY "Users can upload own generated images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'generated-images' AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own generated images" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'generated-images' AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policies for profile avatars
CREATE POLICY "Users can upload own avatars" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'profile-avatars' AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Anyone can view profile avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'profile-avatars');

-- Storage policies for public gallery
CREATE POLICY "Authenticated users can upload to public gallery" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'public-gallery' AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Anyone can view public gallery" ON storage.objects
  FOR SELECT USING (bucket_id = 'public-gallery');

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Indexes for common queries
CREATE INDEX idx_generations_user_id ON public.generations(user_id);
CREATE INDEX idx_generations_created_at ON public.generations(created_at DESC);
CREATE INDEX idx_generations_is_public ON public.generations(is_public) WHERE is_public = true;
CREATE INDEX idx_generations_category ON public.generations(prompt_category);
CREATE INDEX idx_generations_likes_count ON public.generations(likes_count DESC) WHERE is_public = true;
CREATE INDEX idx_generations_status ON public.generations(generation_status);

CREATE INDEX idx_likes_generation_id ON public.likes(generation_id);
CREATE INDEX idx_likes_user_generation ON public.likes(user_id, generation_id);

CREATE INDEX idx_comments_generation_id ON public.comments(generation_id);
CREATE INDEX idx_comments_created_at ON public.comments(created_at DESC);

CREATE INDEX idx_follows_follower_id ON public.follows(follower_id);
CREATE INDEX idx_follows_following_id ON public.follows(following_id);

CREATE INDEX idx_collections_user_id ON public.collections(user_id);
CREATE INDEX idx_collections_is_public ON public.collections(is_public) WHERE is_public = true;

CREATE INDEX idx_profiles_username ON public.profiles(username) WHERE username IS NOT NULL;
CREATE INDEX idx_profiles_is_public ON public.profiles(is_public) WHERE is_public = true;

-- Composite indexes for social feed queries
CREATE INDEX idx_generations_public_recent ON public.generations(is_public, created_at DESC) WHERE is_public = true;
CREATE INDEX idx_generations_user_recent ON public.generations(user_id, created_at DESC);

-- Full text search indexes (for future search functionality)
CREATE INDEX idx_generations_search ON public.generations USING GIN(to_tsvector('english', prompt_title || ' ' || prompt_description)) WHERE is_public = true;
CREATE INDEX idx_profiles_search ON public.profiles USING GIN(to_tsvector('english', username || ' ' || COALESCE(full_name, '') || ' ' || COALESCE(bio, ''))) WHERE is_public = true;

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View for public gallery with user information
CREATE VIEW public.public_gallery AS
SELECT 
  g.*,
  p.username,
  p.full_name,
  p.avatar_url,
  us.total_followers
FROM public.generations g
JOIN public.profiles p ON g.user_id = p.id
LEFT JOIN public.user_stats us ON g.user_id = us.user_id
WHERE g.is_public = true AND p.is_public = true
ORDER BY g.created_at DESC;

-- View for user generation history with stats
CREATE VIEW public.user_generations_with_stats AS
SELECT 
  g.*,
  COALESCE(cc.comment_count, 0) as comment_count
FROM public.generations g
LEFT JOIN (
  SELECT generation_id, COUNT(*) as comment_count
  FROM public.comments
  GROUP BY generation_id
) cc ON g.id = cc.generation_id;

-- View for trending generations (based on recent likes and views)
CREATE VIEW public.trending_generations AS
SELECT 
  g.*,
  p.username,
  p.avatar_url,
  (g.likes_count * 2 + g.views_count) / EXTRACT(EPOCH FROM (NOW() - g.created_at)) / 3600 as trend_score
FROM public.generations g
JOIN public.profiles p ON g.user_id = p.id
WHERE 
  g.is_public = true 
  AND p.is_public = true
  AND g.created_at > NOW() - INTERVAL '7 days'
ORDER BY trend_score DESC;

-- ============================================================================
-- SAMPLE DATA AND SETUP COMPLETE
-- ============================================================================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Grant storage permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated;
GRANT SELECT ON storage.buckets TO authenticated;

COMMENT ON SCHEMA public IS 'AI Image Generator - Complete database schema with user profiles, generations, social features, and payment integration';