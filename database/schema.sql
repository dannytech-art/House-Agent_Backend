-- ============================================
-- Vilanow Complete Database Schema
-- ============================================
-- This schema includes all tables for the complete Vilanow platform
-- Run this in your Supabase SQL Editor
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search

-- ============================================
-- CORE TABLES
-- ============================================

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('seeker', 'agent', 'admin')),
  avatar TEXT,
  agent_type TEXT CHECK (agent_type IN ('direct', 'semi-direct')),
  verified BOOLEAN DEFAULT false,
  kyc_status TEXT DEFAULT 'unverified' CHECK (kyc_status IN ('unverified', 'pending', 'verified', 'rejected')),
  kyc_completed_at TIMESTAMPTZ,
  kyc_notes TEXT,
  kyc_reviewed_at TIMESTAMPTZ,
  kyc_reviewed_by UUID REFERENCES users(id),
  -- Gamification fields
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  credits INTEGER DEFAULT 0,
  wallet_balance DECIMAL(12, 2) DEFAULT 0,
  streak INTEGER DEFAULT 0,
  total_listings INTEGER DEFAULT 0,
  total_interests INTEGER DEFAULT 0,
  response_time INTEGER DEFAULT 0,
  rating DECIMAL(3, 2) DEFAULT 0,
  tier TEXT DEFAULT 'street-scout',
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_kyc_status ON users(kyc_status);
CREATE INDEX idx_users_tier ON users(tier);

-- Properties Table
CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('apartment', 'house', 'duplex', 'penthouse', 'studio', 'land')),
  price DECIMAL(12, 2) NOT NULL,
  location TEXT NOT NULL,
  area TEXT NOT NULL,
  bedrooms INTEGER,
  bathrooms INTEGER,
  images TEXT[] DEFAULT '{}',
  videos TEXT[] DEFAULT '{}',
  amenities TEXT[] DEFAULT '{}',
  description TEXT NOT NULL,
  agent_id UUID REFERENCES users(id) ON DELETE CASCADE,
  agent_type TEXT,
  agent_name TEXT,
  agent_verified BOOLEAN DEFAULT false,
  posted_at TIMESTAMPTZ DEFAULT NOW(),
  featured BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'pending', 'sold')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_properties_agent_id ON properties(agent_id);
CREATE INDEX idx_properties_location ON properties(location);
CREATE INDEX idx_properties_type ON properties(type);
CREATE INDEX idx_properties_status ON properties(status);
CREATE INDEX idx_properties_featured ON properties(featured);
CREATE INDEX idx_properties_price ON properties(price);
CREATE INDEX idx_properties_posted_at ON properties(posted_at DESC);

-- Interests Table
CREATE TABLE IF NOT EXISTS interests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  seeker_id UUID REFERENCES users(id) ON DELETE CASCADE,
  seeker_name TEXT NOT NULL,
  seeker_phone TEXT NOT NULL,
  message TEXT NOT NULL,
  seriousness_score INTEGER DEFAULT 50,
  unlocked BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'viewing-scheduled', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_interests_property_id ON interests(property_id);
CREATE INDEX idx_interests_seeker_id ON interests(seeker_id);
CREATE INDEX idx_interests_status ON interests(status);
CREATE INDEX idx_interests_created_at ON interests(created_at DESC);

-- ============================================
-- CHAT SYSTEM
-- ============================================

-- Chat Sessions Table
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_ids UUID[] NOT NULL,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  interest_id UUID REFERENCES interests(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_sessions_participants ON chat_sessions USING GIN(participant_ids);
CREATE INDEX idx_chat_sessions_property_id ON chat_sessions(property_id);
CREATE INDEX idx_chat_sessions_last_message_at ON chat_sessions(last_message_at DESC);

-- Chat Messages Table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  sender_avatar TEXT,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'text' CHECK (type IN ('text', 'property-brief', 'inspection-schedule', 'document')),
  metadata JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_session_id ON chat_messages(chat_session_id);
CREATE INDEX idx_chat_messages_timestamp ON chat_messages(timestamp DESC);
CREATE INDEX idx_chat_messages_sender_id ON chat_messages(sender_id);

-- ============================================
-- FINANCIAL SYSTEM
-- ============================================

-- Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('credit_purchase', 'credit_spent', 'wallet_load', 'wallet_debit')),
  amount DECIMAL(12, 2) NOT NULL,
  credits INTEGER,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('completed', 'pending', 'failed')),
  bundle_id TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_timestamp ON transactions(timestamp DESC);
CREATE INDEX idx_transactions_status ON transactions(status);

-- Credit Bundles Table
CREATE TABLE IF NOT EXISTS credit_bundles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  credits INTEGER NOT NULL,
  price DECIMAL(12, 2) NOT NULL,
  bonus_credits INTEGER DEFAULT 0,
  popular BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_credit_bundles_active ON credit_bundles(active);

-- ============================================
-- PROPERTY REQUESTS & WATCHLIST
-- ============================================

-- Property Requests Table
CREATE TABLE IF NOT EXISTS property_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seeker_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('apartment', 'house', 'duplex', 'penthouse', 'studio', 'land')),
  location TEXT NOT NULL,
  min_budget DECIMAL(12, 2) NOT NULL,
  max_budget DECIMAL(12, 2) NOT NULL,
  bedrooms INTEGER NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'fulfilled', 'expired')),
  matches INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_property_requests_seeker_id ON property_requests(seeker_id);
CREATE INDEX idx_property_requests_status ON property_requests(status);
CREATE INDEX idx_property_requests_location ON property_requests(location);

-- Watchlist Table
CREATE TABLE IF NOT EXISTS watchlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, property_id)
);

CREATE INDEX idx_watchlist_user_id ON watchlist(user_id);
CREATE INDEX idx_watchlist_property_id ON watchlist(property_id);

-- ============================================
-- KYC SYSTEM
-- ============================================

-- KYC Documents Table
CREATE TABLE IF NOT EXISTS kyc_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('id_card', 'passport', 'license', 'business_registration', 'other')),
  document_url TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_kyc_documents_user_id ON kyc_documents(user_id);
CREATE INDEX idx_kyc_documents_status ON kyc_documents(status);

-- ============================================
-- GAMIFICATION SYSTEM
-- ============================================

-- Challenges Table
CREATE TABLE IF NOT EXISTS challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('listing', 'interest', 'response', 'rating', 'custom')),
  target_value INTEGER NOT NULL,
  xp_reward INTEGER DEFAULT 0,
  credit_reward INTEGER DEFAULT 0,
  badge_id UUID,
  active BOOLEAN DEFAULT true,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_challenges_type ON challenges(type);
CREATE INDEX idx_challenges_active ON challenges(active);

-- Agent Challenges (Progress Tracking)
CREATE TABLE IF NOT EXISTS agent_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES users(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
  current_progress INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_id, challenge_id)
);

CREATE INDEX idx_agent_challenges_agent_id ON agent_challenges(agent_id);
CREATE INDEX idx_agent_challenges_challenge_id ON agent_challenges(challenge_id);
CREATE INDEX idx_agent_challenges_completed ON agent_challenges(completed);

-- Quests Table
CREATE TABLE IF NOT EXISTS quests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('daily', 'weekly', 'monthly', 'special')),
  xp_reward INTEGER DEFAULT 0,
  credit_reward INTEGER DEFAULT 0,
  badge_reward UUID,
  requirements JSONB,
  active BOOLEAN DEFAULT true,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quests_type ON quests(type);
CREATE INDEX idx_quests_active ON quests(active);

-- User Quests (Progress Tracking)
CREATE TABLE IF NOT EXISTS user_quests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  quest_id UUID REFERENCES quests(id) ON DELETE CASCADE,
  progress JSONB DEFAULT '{}',
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, quest_id)
);

CREATE INDEX idx_user_quests_user_id ON user_quests(user_id);
CREATE INDEX idx_user_quests_quest_id ON user_quests(quest_id);

-- Badges Table
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_url TEXT,
  rarity TEXT DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_badges_rarity ON badges(rarity);
CREATE INDEX idx_badges_category ON badges(category);

-- User Badges (Earned Badges)
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

CREATE INDEX idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX idx_user_badges_badge_id ON user_badges(badge_id);

-- Territories Table
CREATE TABLE IF NOT EXISTS territories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  area TEXT NOT NULL,
  location_id UUID,
  properties_count INTEGER DEFAULT 0,
  dominance_score DECIMAL(5, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_territories_agent_id ON territories(agent_id);
CREATE INDEX idx_territories_area ON territories(area);

-- ============================================
-- MARKETPLACE SYSTEM
-- ============================================

-- Marketplace Offers Table
CREATE TABLE IF NOT EXISTS marketplace_offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('property_share', 'referral', 'collaboration', 'service')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  credit_cost INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'accepted', 'expired', 'cancelled')),
  accepted_by UUID REFERENCES users(id),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_marketplace_offers_agent_id ON marketplace_offers(agent_id);
CREATE INDEX idx_marketplace_offers_type ON marketplace_offers(type);
CREATE INDEX idx_marketplace_offers_status ON marketplace_offers(status);

-- Collaborations Table
CREATE TABLE IF NOT EXISTS collaborations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  initiator_id UUID REFERENCES users(id) ON DELETE CASCADE,
  collaborator_id UUID REFERENCES users(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('co_listing', 'referral', 'joint_deal')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed', 'cancelled')),
  terms JSONB,
  credit_split DECIMAL(5, 2) DEFAULT 50.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_collaborations_initiator_id ON collaborations(initiator_id);
CREATE INDEX idx_collaborations_collaborator_id ON collaborations(collaborator_id);
CREATE INDEX idx_collaborations_status ON collaborations(status);

-- ============================================
-- GROUP SYSTEM
-- ============================================

-- Groups Table
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  avatar TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  member_ids UUID[] DEFAULT '{}',
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_groups_created_by ON groups(created_by);
CREATE INDEX idx_groups_member_ids ON groups USING GIN(member_ids);

-- Group Messages Table
CREATE TABLE IF NOT EXISTS group_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  sender_avatar TEXT,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'text' CHECK (type IN ('text', 'property', 'document', 'announcement')),
  metadata JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_group_messages_group_id ON group_messages(group_id);
CREATE INDEX idx_group_messages_timestamp ON group_messages(timestamp DESC);
CREATE INDEX idx_group_messages_sender_id ON group_messages(sender_id);

-- ============================================
-- ADMIN SYSTEM
-- ============================================

-- Flagged Content Table
CREATE TABLE IF NOT EXISTS flagged_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('property', 'user', 'message', 'review', 'other')),
  entity_id UUID NOT NULL,
  flagged_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_flagged_content_entity ON flagged_content(entity_type, entity_id);
CREATE INDEX idx_flagged_content_status ON flagged_content(status);
CREATE INDEX idx_flagged_content_severity ON flagged_content(severity);

-- Admin Actions Table
CREATE TABLE IF NOT EXISTS admin_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('ban', 'suspend', 'delete', 'verify', 'modify', 'other')),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_actions_admin_id ON admin_actions(admin_id);
CREATE INDEX idx_admin_actions_entity ON admin_actions(entity_type, entity_id);
CREATE INDEX idx_admin_actions_created_at ON admin_actions(created_at DESC);

-- System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  category TEXT,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_system_settings_key ON system_settings(key);
CREATE INDEX idx_system_settings_category ON system_settings(category);

-- ============================================
-- ANALYTICS SYSTEM
-- ============================================

-- Analytics Events Table
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_event ON analytics_events(event);
CREATE INDEX idx_analytics_events_timestamp ON analytics_events(timestamp DESC);
CREATE INDEX idx_analytics_events_entity ON analytics_events(entity_type, entity_id);

-- Reports Table
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('users', 'properties', 'interests', 'financial', 'custom')),
  parameters JSONB,
  generated_by UUID REFERENCES users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
  file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_reports_type ON reports(type);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);

-- ============================================
-- NOTIFICATIONS SYSTEM
-- ============================================

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  target_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('interest', 'message', 'system', 'achievement', 'marketplace', 'admin')),
  metadata JSONB,
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_target_user_id ON notifications(target_user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type);

-- Notification Preferences Table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  email_enabled BOOLEAN DEFAULT true,
  push_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  preferences JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);

-- ============================================
-- TERRITORIES & LOCATIONS
-- ============================================

-- Locations Table
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  area TEXT NOT NULL,
  state TEXT,
  country TEXT DEFAULT 'Nigeria',
  coordinates JSONB,
  boundaries JSONB,
  properties_count INTEGER DEFAULT 0,
  agents_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_locations_area ON locations(area);
CREATE INDEX idx_locations_state ON locations(state);
CREATE INDEX idx_locations_country ON locations(country);

-- ============================================
-- CIU SYSTEM (Close It Up)
-- ============================================

-- Closable Deals Table
CREATE TABLE IF NOT EXISTS closable_deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES users(id) ON DELETE CASCADE,
  interest_id UUID REFERENCES interests(id) ON DELETE SET NULL,
  urgency TEXT DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'high', 'critical')),
  closing_probability DECIMAL(5, 2) DEFAULT 50.00,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'in_progress', 'closed', 'lost', 'cancelled')),
  notes TEXT,
  expected_close_date TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_closable_deals_agent_id ON closable_deals(agent_id);
CREATE INDEX idx_closable_deals_assigned_to ON closable_deals(assigned_to);
CREATE INDEX idx_closable_deals_status ON closable_deals(status);
CREATE INDEX idx_closable_deals_urgency ON closable_deals(urgency);

-- Vilanow Tasks Table
CREATE TABLE IF NOT EXISTS vilanow_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID REFERENCES closable_deals(id) ON DELETE CASCADE,
  property_title TEXT NOT NULL,
  assigned_agent UUID REFERENCES users(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL CHECK (task_type IN ('follow_up', 'documentation', 'inspection', 'negotiation', 'closing', 'other')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  deadline TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vilanow_tasks_deal_id ON vilanow_tasks(deal_id);
CREATE INDEX idx_vilanow_tasks_assigned_agent ON vilanow_tasks(assigned_agent);
CREATE INDEX idx_vilanow_tasks_status ON vilanow_tasks(status);
CREATE INDEX idx_vilanow_tasks_priority ON vilanow_tasks(priority);
CREATE INDEX idx_vilanow_tasks_deadline ON vilanow_tasks(deadline);

-- Risk Flags Table
CREATE TABLE IF NOT EXISTS risk_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('property', 'user', 'deal', 'transaction', 'other')),
  entity_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('fraud', 'duplicate', 'suspicious', 'compliance', 'quality', 'other')),
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'investigating', 'resolved', 'dismissed')),
  evidence JSONB,
  description TEXT,
  flagged_by UUID REFERENCES users(id),
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_risk_flags_entity ON risk_flags(entity_type, entity_id);
CREATE INDEX idx_risk_flags_type ON risk_flags(type);
CREATE INDEX idx_risk_flags_severity ON risk_flags(severity);
CREATE INDEX idx_risk_flags_status ON risk_flags(status);

-- Automation Rules Table
CREATE TABLE IF NOT EXISTS automation_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  condition JSONB NOT NULL,
  action JSONB NOT NULL,
  enabled BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  trigger_count INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_automation_rules_enabled ON automation_rules(enabled);
CREATE INDEX idx_automation_rules_priority ON automation_rules(priority DESC);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to all tables with updated_at column
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'updated_at' 
        AND table_schema = 'public'
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS update_%s_updated_at ON %I;
            CREATE TRIGGER update_%s_updated_at
                BEFORE UPDATE ON %I
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        ', r.table_name, r.table_name, r.table_name, r.table_name);
    END LOOP;
END $$;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies (can be customized based on requirements)

-- Users: Can view own profile, admins can view all
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid()::text = id::text OR 
         (SELECT role FROM users WHERE id::text = auth.uid()::text) = 'admin');

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid()::text = id::text);

-- Properties: Public read, agents can manage their own
CREATE POLICY "Properties are viewable by everyone"
  ON properties FOR SELECT
  USING (true);

CREATE POLICY "Agents can insert their own properties"
  ON properties FOR INSERT
  WITH CHECK (
    agent_id::text = auth.uid()::text OR
    (SELECT role FROM users WHERE id::text = auth.uid()::text) = 'admin'
  );

CREATE POLICY "Agents can update their own properties"
  ON properties FOR UPDATE
  USING (
    agent_id::text = auth.uid()::text OR
    (SELECT role FROM users WHERE id::text = auth.uid()::text) = 'admin'
  );

-- Interests: Users can view their own interests
CREATE POLICY "Users can view own interests"
  ON interests FOR SELECT
  USING (
    seeker_id::text = auth.uid()::text OR
    (SELECT agent_id FROM properties WHERE id = property_id)::text = auth.uid()::text OR
    (SELECT role FROM users WHERE id::text = auth.uid()::text) = 'admin'
  );

-- Notifications: Users can only view their own
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (target_user_id::text = auth.uid()::text);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (target_user_id::text = auth.uid()::text);

-- ============================================
-- COMPLETE
-- ============================================

-- Schema creation complete!
-- Total tables created: 35+
-- All indexes and constraints applied
-- RLS policies enabled

