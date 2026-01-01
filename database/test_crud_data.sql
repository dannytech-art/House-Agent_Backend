-- Test CRUD Data for Vilanow Platform
-- Run this after clearing the database to populate test data

-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- Insert Test Users
-- ============================================
-- All test users have password: "Test123!"
-- This is for testing only - change in production

-- Test Admin User
INSERT INTO users (id, email, password_hash, name, phone, role, verified, credits, wallet_balance, tier, created_at, updated_at)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', 'admin@vilanow.com', crypt('Test123!', gen_salt('bf')), 'Admin User', '+234 800 000 0001', 'admin', true, 10000, 50000.00, 'admin', NOW(), NOW());

-- Test Agents
INSERT INTO users (id, email, password_hash, name, phone, role, verified, agent_type, kyc_status, credits, wallet_balance, xp, level, tier, total_listings, rating, created_at, updated_at)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440002', 'agent1@vilanow.com', crypt('Test123!', gen_salt('bf')), 'Chidi Okafor', '+234 803 456 7890', 'agent', true, 'direct', 'verified', 500, 5000.00, 1500, 3, 'street-scout', 12, 4.8, NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440003', 'agent2@vilanow.com', crypt('Test123!', gen_salt('bf')), 'Fatima Ibrahim', '+234 802 345 6789', 'agent', true, 'semi-direct', 'verified', 300, 3000.00, 800, 2, 'street-scout', 8, 4.6, NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440004', 'agent3@vilanow.com', crypt('Test123!', gen_salt('bf')), 'Emeka Nnamdi', '+234 801 234 5678', 'agent', true, 'direct', 'pending', 200, 2000.00, 500, 1, 'street-scout', 5, 4.5, NOW(), NOW());

-- Test Seekers
INSERT INTO users (id, email, password_hash, name, phone, role, verified, credits, wallet_balance, created_at, updated_at)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440005', 'seeker1@vilanow.com', crypt('Test123!', gen_salt('bf')), 'John Doe', '+234 805 123 4567', 'seeker', true, 100, 1000.00, NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440006', 'seeker2@vilanow.com', crypt('Test123!', gen_salt('bf')), 'Jane Smith', '+234 806 234 5678', 'seeker', true, 50, 500.00, NOW(), NOW());

-- ============================================
-- Insert Credit Bundles
-- ============================================

INSERT INTO credit_bundles (id, name, description, credits, price, bonus_credits, popular, active, created_at, updated_at)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440101', 'Starter Pack', '100 Credits - Perfect for getting started', 100, 1000, 0, false, true, NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440102', 'Popular Pack', '500 Credits + 50 Bonus - Best Value!', 500, 4500, 50, true, true, NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440103', 'Professional Pack', '1000 Credits + 150 Bonus - For serious agents', 1000, 8500, 150, false, true, NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440104', 'Enterprise Pack', '5000 Credits + 1000 Bonus - Maximum value', 5000, 40000, 1000, false, true, NOW(), NOW());

-- ============================================
-- Insert Test Properties
-- ============================================

INSERT INTO properties (id, agent_id, title, type, price, location, area, bedrooms, bathrooms, description, status, created_at, updated_at)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440201', '550e8400-e29b-41d4-a716-446655440002', 'Luxury 3-Bedroom Apartment', 'apartment', 120000000, 'Lekki Phase 1', 'Lekki', 3, 3, 'Beautiful luxury apartment with modern amenities', 'available', NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440202', '550e8400-e29b-41d4-a716-446655440002', '5-Bedroom Duplex', 'duplex', 250000000, 'Ikoyi', 'Ikoyi', 5, 4, 'Spacious duplex with pool and garden', 'available', NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440203', '550e8400-e29b-41d4-a716-446655440003', '2-Bedroom Apartment', 'apartment', 80000000, 'Victoria Island', 'Victoria Island', 2, 2, 'Cozy apartment in prime location', 'available', NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440204', '550e8400-e29b-41d4-a716-446655440003', '4-Bedroom House', 'house', 180000000, 'Ajah', 'Ajah', 4, 3, 'Family home with BQ', 'available', NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440205', '550e8400-e29b-41d4-a716-446655440004', 'Studio Apartment', 'studio', 45000000, 'Ikeja', 'Ikeja', 1, 1, 'Modern studio for young professionals', 'available', NOW(), NOW());

-- ============================================
-- Insert Test Locations
-- ============================================

INSERT INTO locations (id, name, area, state, created_at, updated_at)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440301', 'Lekki Phase 1', 'Lekki', 'Lagos', NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440302', 'Ikoyi', 'Ikoyi', 'Lagos', NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440303', 'Victoria Island', 'Victoria Island', 'Lagos', NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440304', 'Ajah', 'Ajah', 'Lagos', NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440305', 'Ikeja', 'Ikeja', 'Lagos', NOW(), NOW());

-- ============================================
-- Insert Test Interests
-- ============================================

INSERT INTO interests (id, property_id, seeker_id, seeker_name, seeker_phone, message, status, created_at, updated_at)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440401', '550e8400-e29b-41d4-a716-446655440201', '550e8400-e29b-41d4-a716-446655440005', 'John Doe', '+234 805 123 4567', 'I am interested in viewing this property', 'pending', NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440402', '550e8400-e29b-41d4-a716-446655440202', '550e8400-e29b-41d4-a716-446655440005', 'John Doe', '+234 805 123 4567', 'Please contact me about this property', 'pending', NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440403', '550e8400-e29b-41d4-a716-446655440203', '550e8400-e29b-41d4-a716-446655440006', 'Jane Smith', '+234 806 234 5678', 'I would like to schedule a viewing', 'pending', NOW(), NOW());

-- ============================================
-- Insert Test Chat Sessions
-- ============================================

INSERT INTO chat_sessions (id, property_id, participant_ids, interest_id, created_at, last_message_at)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440501', '550e8400-e29b-41d4-a716-446655440201', ARRAY['550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440002']::UUID[], '550e8400-e29b-41d4-a716-446655440401', NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440502', '550e8400-e29b-41d4-a716-446655440202', ARRAY['550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440002']::UUID[], '550e8400-e29b-41d4-a716-446655440402', NOW(), NOW());

-- ============================================
-- Insert Test Transactions
-- ============================================

INSERT INTO transactions (id, user_id, type, amount, credits, description, status, timestamp)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440601', '550e8400-e29b-41d4-a716-446655440002', 'credit_purchase', 4500.00, 500, 'Purchased 500 credits', 'completed', NOW()),
  ('550e8400-e29b-41d4-a716-446655440602', '550e8400-e29b-41d4-a716-446655440005', 'credit_purchase', 1000.00, 100, 'Purchased 100 credits', 'completed', NOW());

-- ============================================
-- Success Message
-- ============================================

SELECT 
  'Test data inserted successfully!' AS status,
  (SELECT COUNT(*) FROM users) AS users_count,
  (SELECT COUNT(*) FROM properties) AS properties_count,
  (SELECT COUNT(*) FROM credit_bundles) AS bundles_count,
  (SELECT COUNT(*) FROM interests) AS interests_count;

