-- ============================================
-- Enable Supabase Realtime for Tables
-- ============================================
-- Run this after schema.sql to enable real-time subscriptions
-- ============================================

-- Enable Realtime for notifications (critical for user experience)
ALTER publication supabase_realtime ADD TABLE notifications;

-- Enable Realtime for chat messages (real-time messaging)
ALTER publication supabase_realtime ADD TABLE chat_messages;

-- Enable Realtime for chat sessions (new conversations)
ALTER publication supabase_realtime ADD TABLE chat_sessions;

-- Enable Realtime for interests (new interest notifications)
ALTER publication supabase_realtime ADD TABLE interests;

-- Enable Realtime for properties (new listings, updates)
ALTER publication supabase_realtime ADD TABLE properties;

-- Enable Realtime for group messages (group chat)
ALTER publication supabase_realtime ADD TABLE group_messages;

-- Enable Realtime for transactions (payment updates)
ALTER publication supabase_realtime ADD TABLE transactions;

-- Enable Realtime for watchlist (saved property updates)
ALTER publication supabase_realtime ADD TABLE watchlist;

-- Enable Realtime for marketplace offers (new offers)
ALTER publication supabase_realtime ADD TABLE marketplace_offers;

-- Enable Realtime for collaborations (collaboration updates)
ALTER publication supabase_realtime ADD TABLE collaborations;

-- Enable Realtime for closable deals (CIU system updates)
ALTER publication supabase_realtime ADD TABLE closable_deals;

-- Enable Realtime for vilanow tasks (task updates)
ALTER publication supabase_realtime ADD TABLE vilanow_tasks;

-- Note: You can enable Realtime for additional tables as needed
-- Format: ALTER publication supabase_realtime ADD TABLE table_name;

-- ============================================
-- Realtime Configuration Complete
-- ============================================
-- The above tables will now broadcast changes in real-time
-- Frontend can subscribe to these changes via Supabase Realtime
-- ============================================

