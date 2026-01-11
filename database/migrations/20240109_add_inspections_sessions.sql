-- ============================================
-- Add Inspections and Sessions Tables
-- Run this in your Supabase SQL Editor
-- ============================================

-- Inspections Table
CREATE TABLE IF NOT EXISTS inspections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  interest_id UUID REFERENCES interests(id) ON DELETE SET NULL,
  seeker_id UUID REFERENCES users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES users(id) ON DELETE CASCADE,
  scheduled_date TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inspections_property_id ON inspections(property_id);
CREATE INDEX IF NOT EXISTS idx_inspections_seeker_id ON inspections(seeker_id);
CREATE INDEX IF NOT EXISTS idx_inspections_agent_id ON inspections(agent_id);
CREATE INDEX IF NOT EXISTS idx_inspections_interest_id ON inspections(interest_id);
CREATE INDEX IF NOT EXISTS idx_inspections_scheduled_date ON inspections(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_inspections_status ON inspections(status);

-- Sessions Table (for JWT token tracking)
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Add trigger to update updated_at for inspections
DROP TRIGGER IF EXISTS update_inspections_updated_at ON inspections;
CREATE TRIGGER update_inspections_updated_at
    BEFORE UPDATE ON inspections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on new tables
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Inspections
CREATE POLICY "Users can view their own inspections"
  ON inspections FOR SELECT
  USING (
    seeker_id::text = auth.uid()::text OR
    agent_id::text = auth.uid()::text OR
    (SELECT role FROM users WHERE id::text = auth.uid()::text) = 'admin'
  );

CREATE POLICY "Agents can manage their inspections"
  ON inspections FOR ALL
  USING (
    agent_id::text = auth.uid()::text OR
    (SELECT role FROM users WHERE id::text = auth.uid()::text) = 'admin'
  );

-- RLS Policies for Sessions
CREATE POLICY "Users can view own sessions"
  ON sessions FOR SELECT
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can delete own sessions"
  ON sessions FOR DELETE
  USING (user_id::text = auth.uid()::text);

-- Add metadata column to transactions if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE transactions ADD COLUMN metadata JSONB DEFAULT '{}';
  END IF;
END $$;

-- Add reference column to transactions if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'reference'
  ) THEN
    ALTER TABLE transactions ADD COLUMN reference TEXT;
    CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(reference);
  END IF;
END $$;

-- Ensure chat_messages has read column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chat_messages' AND column_name = 'read'
  ) THEN
    ALTER TABLE chat_messages ADD COLUMN read BOOLEAN DEFAULT false;
    CREATE INDEX IF NOT EXISTS idx_chat_messages_read ON chat_messages(read);
  END IF;
END $$;

COMMENT ON TABLE inspections IS 'Property inspection schedules between seekers and agents';
COMMENT ON TABLE sessions IS 'User authentication sessions for JWT token tracking';




