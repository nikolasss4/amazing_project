-- ============================================================================
-- Gamified Trading App - Initial Database Schema
-- ============================================================================
--
-- This migration creates all tables for the gamified trading application.
-- Run this in the Supabase SQL Editor or via migrations.
--
-- Tables:
--   - profiles: User profile information
--   - friends: Friend relationships and requests
--   - leagues: Trading competitions
--   - league_members: League membership
--   - league_scores: Competition scores
--   - tables: Leaderboard configurations
--   - challenges: Learning challenges
--   - user_challenges: User challenge progress
--
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================
-- Stores user profile information, linked to Supabase Auth users

CREATE TABLE IF NOT EXISTS profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(30) UNIQUE NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for username searches
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_username_search ON profiles(username varchar_pattern_ops);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can view profiles
CREATE POLICY "Profiles are viewable by everyone" ON profiles
    FOR SELECT USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- FRIENDS TABLE
-- ============================================================================
-- Stores friend relationships and friend requests

CREATE TABLE IF NOT EXISTS friends (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    addressee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Prevent duplicate relationships
    UNIQUE(requester_id, addressee_id),
    -- Prevent self-friending
    CHECK (requester_id != addressee_id)
);

-- Indexes for friend queries
CREATE INDEX IF NOT EXISTS idx_friends_requester ON friends(requester_id);
CREATE INDEX IF NOT EXISTS idx_friends_addressee ON friends(addressee_id);
CREATE INDEX IF NOT EXISTS idx_friends_status ON friends(status);

-- RLS Policies for friends
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;

-- Users can view friendships they're part of
CREATE POLICY "Users can view own friendships" ON friends
    FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Users can create friend requests
CREATE POLICY "Users can create friend requests" ON friends
    FOR INSERT WITH CHECK (auth.uid() = requester_id);

-- Users can update friendships they're part of
CREATE POLICY "Users can update own friendships" ON friends
    FOR UPDATE USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Users can delete friendships they're part of
CREATE POLICY "Users can delete own friendships" ON friends
    FOR DELETE USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- ============================================================================
-- LEAGUES TABLE
-- ============================================================================
-- Stores trading competition leagues

CREATE TABLE IF NOT EXISTS leagues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    season_start TIMESTAMPTZ NOT NULL,
    season_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (season_end > season_start)
);

-- Index for owner queries
CREATE INDEX IF NOT EXISTS idx_leagues_owner ON leagues(owner_id);

-- RLS Policies for leagues
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;

-- Anyone can view leagues
CREATE POLICY "Leagues are viewable by everyone" ON leagues
    FOR SELECT USING (true);

-- Authenticated users can create leagues
CREATE POLICY "Authenticated users can create leagues" ON leagues
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Owners can update their leagues
CREATE POLICY "Owners can update leagues" ON leagues
    FOR UPDATE USING (auth.uid() = owner_id);

-- Owners can delete their leagues
CREATE POLICY "Owners can delete leagues" ON leagues
    FOR DELETE USING (auth.uid() = owner_id);

-- ============================================================================
-- LEAGUE_MEMBERS TABLE
-- ============================================================================
-- Stores league membership

CREATE TABLE IF NOT EXISTS league_members (
    league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (league_id, user_id)
);

-- Index for user membership queries
CREATE INDEX IF NOT EXISTS idx_league_members_user ON league_members(user_id);

-- RLS Policies for league_members
ALTER TABLE league_members ENABLE ROW LEVEL SECURITY;

-- Anyone can view league members
CREATE POLICY "League members are viewable by everyone" ON league_members
    FOR SELECT USING (true);

-- Authenticated users can join leagues
CREATE POLICY "Users can join leagues" ON league_members
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can leave leagues (delete own membership)
CREATE POLICY "Users can leave leagues" ON league_members
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- LEAGUE_SCORES TABLE
-- ============================================================================
-- Stores competition scores for league members

CREATE TABLE IF NOT EXISTS league_scores (
    league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    score DECIMAL(20, 8) NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (league_id, user_id)
);

-- Index for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_league_scores_score ON league_scores(league_id, score DESC);

-- RLS Policies for league_scores
ALTER TABLE league_scores ENABLE ROW LEVEL SECURITY;

-- Anyone can view league scores
CREATE POLICY "League scores are viewable by everyone" ON league_scores
    FOR SELECT USING (true);

-- System can update scores (use service role key for this)
-- In production, scores should only be updated by a trusted backend service

-- ============================================================================
-- TABLES TABLE
-- ============================================================================
-- Stores leaderboard/table configurations

CREATE TABLE IF NOT EXISTS tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    config_json JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for league tables
CREATE INDEX IF NOT EXISTS idx_tables_league ON tables(league_id);

-- RLS Policies for tables
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;

-- Anyone can view tables
CREATE POLICY "Tables are viewable by everyone" ON tables
    FOR SELECT USING (true);

-- Authenticated users can create global tables
CREATE POLICY "Users can create tables" ON tables
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- CHALLENGES TABLE
-- ============================================================================
-- Stores learning challenges for the improve page

CREATE TABLE IF NOT EXISTS challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced', 'expert')),
    tags TEXT[] NOT NULL DEFAULT '{}',
    points INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for challenge queries
CREATE INDEX IF NOT EXISTS idx_challenges_difficulty ON challenges(difficulty);
CREATE INDEX IF NOT EXISTS idx_challenges_active ON challenges(is_active);
CREATE INDEX IF NOT EXISTS idx_challenges_tags ON challenges USING GIN(tags);

-- RLS Policies for challenges
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

-- Anyone can view active challenges
CREATE POLICY "Active challenges are viewable by everyone" ON challenges
    FOR SELECT USING (is_active = true);

-- ============================================================================
-- USER_CHALLENGES TABLE
-- ============================================================================
-- Stores user progress on challenges

CREATE TABLE IF NOT EXISTS user_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('not_started', 'in_progress', 'completed', 'failed')),
    progress_json JSONB NOT NULL DEFAULT '{}',
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One record per user per challenge
    UNIQUE(user_id, challenge_id)
);

-- Indexes for user challenge queries
CREATE INDEX IF NOT EXISTS idx_user_challenges_user ON user_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_challenges_status ON user_challenges(user_id, status);

-- RLS Policies for user_challenges
ALTER TABLE user_challenges ENABLE ROW LEVEL SECURITY;

-- Users can view their own challenges
CREATE POLICY "Users can view own challenges" ON user_challenges
    FOR SELECT USING (auth.uid() = user_id);

-- Users can start challenges
CREATE POLICY "Users can start challenges" ON user_challenges
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own challenge progress
CREATE POLICY "Users can update own challenges" ON user_challenges
    FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (user_id, username)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || LEFT(NEW.id::text, 8))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- SEED DATA (Optional - for development)
-- ============================================================================

-- Sample challenges for development
INSERT INTO challenges (title, description, difficulty, tags, points, is_active)
VALUES
    ('Understanding Market Orders', 'Learn how market orders work and when to use them.', 'beginner', ARRAY['orders', 'basics'], 10, true),
    ('Limit Order Mastery', 'Master the art of setting effective limit orders.', 'beginner', ARRAY['orders', 'basics'], 15, true),
    ('Risk Management 101', 'Learn the fundamentals of managing trading risk.', 'intermediate', ARRAY['risk', 'strategy'], 25, true),
    ('Pair Trading Basics', 'Introduction to pair trading with Pear Protocol.', 'intermediate', ARRAY['pear', 'strategy'], 30, true),
    ('Advanced Leverage', 'Understanding and using leverage responsibly.', 'advanced', ARRAY['leverage', 'risk'], 50, true),
    ('Building Your First Bucket', 'Create a diversified basket trading strategy.', 'advanced', ARRAY['pear', 'buckets', 'strategy'], 40, true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- NOTES
-- ============================================================================
--
-- Security Considerations:
-- 1. All tables have RLS enabled
-- 2. Score updates should use service role key (bypasses RLS)
-- 3. Admin operations should use service role key
--
-- Performance Considerations:
-- 1. Add indexes for common query patterns
-- 2. Consider partitioning league_scores by league_id if tables grow large
-- 3. Use JSONB indexes if querying config_json or progress_json frequently
--
-- Future Enhancements:
-- 1. Add audit logging for score changes
-- 2. Add notifications table for friend requests, achievements
-- 3. Add trading history table for analytics
-- 4. Add achievements/badges table
--
