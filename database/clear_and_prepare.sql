-- Clear and Prepare Database for Testing
-- Run this script in Supabase SQL Editor before testing CRUD operations

-- ============================================
-- WARNING: This will DELETE ALL DATA
-- Only run in development/staging environment
-- ============================================

-- Disable foreign key checks temporarily
SET session_replication_role = 'replica';

-- Delete all data from tables (in reverse dependency order)
DELETE FROM group_messages;
DELETE FROM chat_messages;
DELETE FROM chat_sessions;
DELETE FROM collaborations;
DELETE FROM marketplace_offers;
DELETE FROM watchlist;
DELETE FROM property_requests;
DELETE FROM interests;
DELETE FROM transactions;
DELETE FROM notifications;
DELETE FROM notification_preferences;
DELETE FROM user_badges;
DELETE FROM user_quests;
DELETE FROM agent_challenges;
DELETE FROM territories;
DELETE FROM closable_deals;
DELETE FROM vilanow_tasks;
DELETE FROM risk_flags;
DELETE FROM automation_rules;
DELETE FROM flagged_content;
DELETE FROM admin_actions;
DELETE FROM kyc_documents;
DELETE FROM properties;
DELETE FROM credit_bundles;
DELETE FROM groups;
DELETE FROM locations;
DELETE FROM users;

-- Re-enable foreign key checks
SET session_replication_role = 'origin';

-- Reset sequences (if using serial IDs)
-- Note: UUIDs don't need sequence reset

-- Verify tables are empty
DO $$
DECLARE
    table_name TEXT;
    row_count INTEGER;
BEGIN
    FOR table_name IN 
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT LIKE 'pg_%'
        AND tablename NOT LIKE '_%'
    LOOP
        EXECUTE format('SELECT COUNT(*) FROM %I', table_name) INTO row_count;
        RAISE NOTICE 'Table % has % rows', table_name, row_count;
    END LOOP;
END $$;

-- Success message
SELECT 'Database cleared successfully. Ready for testing!' AS status;

