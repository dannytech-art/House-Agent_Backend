-- ============================================
-- Vilanow Database Seed Script
-- ============================================
-- This script populates the database with initial/default data
-- Run this AFTER running schema.sql
-- ============================================

-- Insert default credit bundles
INSERT INTO credit_bundles (id, name, description, credits, price, bonus_credits, popular, active)
VALUES
  (gen_random_uuid(), 'Starter Pack', 'Perfect for getting started', 10, 1000.00, 0, false, true),
  (gen_random_uuid(), 'Popular Choice', 'Best value for most users', 25, 2000.00, 5, true, true),
  (gen_random_uuid(), 'Value Pack', 'Great for active agents', 50, 3500.00, 10, false, true),
  (gen_random_uuid(), 'Premium Bundle', 'Maximum credits with bonus', 100, 6000.00, 25, true, true)
ON CONFLICT DO NOTHING;

-- Insert default badges
INSERT INTO badges (id, name, description, rarity, category)
VALUES
  (gen_random_uuid(), 'First Listing', 'Created your first property listing', 'common', 'listing'),
  (gen_random_uuid(), 'Top Performer', 'Achieved top ratings', 'rare', 'performance'),
  (gen_random_uuid(), 'Territory Master', 'Dominant in your territory', 'epic', 'territory'),
  (gen_random_uuid(), 'Deal Closer', 'Closed 10+ deals', 'legendary', 'sales'),
  (gen_random_uuid(), 'Rising Star', 'Reached level 5', 'common', 'level'),
  (gen_random_uuid(), 'Veteran Agent', 'Reached level 20', 'epic', 'level'),
  (gen_random_uuid(), 'Perfect Rating', 'Maintained 5.0 rating', 'rare', 'rating'),
  (gen_random_uuid(), 'Credit Saver', 'Accumulated 1000+ credits', 'rare', 'credits')
ON CONFLICT DO NOTHING;

-- Insert default challenges
INSERT INTO challenges (id, name, description, type, target_value, xp_reward, credit_reward, active)
VALUES
  (gen_random_uuid(), 'List Your First Property', 'Create your first property listing', 'listing', 1, 100, 10, true),
  (gen_random_uuid(), 'Get 5 Interests', 'Receive interest from 5 different seekers', 'interest', 5, 200, 25, true),
  (gen_random_uuid(), 'Fast Responder', 'Respond to interests within 1 hour', 'response', 10, 150, 15, true),
  (gen_random_uuid(), 'Top Rated', 'Achieve a 4.5+ rating', 'rating', 1, 300, 50, true),
  (gen_random_uuid(), 'Listing Master', 'Create 10 property listings', 'listing', 10, 500, 100, true)
ON CONFLICT DO NOTHING;

-- Insert default quests
INSERT INTO quests (id, name, description, type, xp_reward, credit_reward, active, requirements)
VALUES
  (gen_random_uuid(), 'Daily Login', 'Log in to the platform today', 'daily', 50, 5, true, '{"action": "login"}'::jsonb),
  (gen_random_uuid(), 'Weekly Listings', 'Create 3 listings this week', 'weekly', 200, 30, true, '{"action": "create_listing", "count": 3}'::jsonb),
  (gen_random_uuid(), 'Monthly Sales', 'Close 5 deals this month', 'monthly', 1000, 200, true, '{"action": "close_deal", "count": 5}'::jsonb),
  (gen_random_uuid(), 'Special: New User', 'Complete your profile and first listing', 'special', 500, 100, true, '{"actions": ["complete_profile", "create_listing"]}'::jsonb)
ON CONFLICT DO NOTHING;

-- Insert default system settings
INSERT INTO system_settings (id, key, value, description, category)
VALUES
  (gen_random_uuid(), 'platform_name', '"Vilanow"'::jsonb, 'Platform name', 'general'),
  (gen_random_uuid(), 'min_password_length', '8'::jsonb, 'Minimum password length', 'security'),
  (gen_random_uuid(), 'credit_cost_per_listing', '5'::jsonb, 'Credits required per listing', 'credits'),
  (gen_random_uuid(), 'credit_cost_per_interest', '1'::jsonb, 'Credits required to unlock interest', 'credits'),
  (gen_random_uuid(), 'max_listings_per_agent', '50'::jsonb, 'Maximum listings per agent', 'limits'),
  (gen_random_uuid(), 'kyc_required', 'true'::jsonb, 'KYC verification required for agents', 'kyc'),
  (gen_random_uuid(), 'maintenance_mode', 'false'::jsonb, 'Platform maintenance mode', 'general')
ON CONFLICT (key) DO NOTHING;

-- Insert sample locations (Nigeria)
INSERT INTO locations (id, name, area, state, country)
VALUES
  (gen_random_uuid(), 'Lagos Island', 'Lagos Island', 'Lagos', 'Nigeria'),
  (gen_random_uuid(), 'Victoria Island', 'Victoria Island', 'Lagos', 'Nigeria'),
  (gen_random_uuid(), 'Ikoyi', 'Ikoyi', 'Lagos', 'Nigeria'),
  (gen_random_uuid(), 'Lekki', 'Lekki', 'Lagos', 'Nigeria'),
  (gen_random_uuid(), 'Abuja Central', 'Central Area', 'FCT', 'Nigeria'),
  (gen_random_uuid(), 'Maitama', 'Maitama', 'FCT', 'Nigeria'),
  (gen_random_uuid(), 'Asokoro', 'Asokoro', 'FCT', 'Nigeria'),
  (gen_random_uuid(), 'Port Harcourt', 'Port Harcourt', 'Rivers', 'Nigeria')
ON CONFLICT DO NOTHING;

-- Note: You can add more seed data as needed
-- For example: sample properties, users (for testing), etc.

-- ============================================
-- Seed Complete
-- ============================================

