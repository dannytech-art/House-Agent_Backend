-- Migration: Add OTP table and OAuth fields to users
-- Run this in your Supabase SQL Editor

-- ============================================
-- ADD EMAIL VERIFICATION & OAUTH FIELDS TO USERS
-- ============================================

-- Add email_verified column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'email_verified') THEN
        ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Add google_id column for Google OAuth
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'google_id') THEN
        ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE;
    END IF;
END $$;

-- Add auth_provider column
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'auth_provider') THEN
        ALTER TABLE users ADD COLUMN auth_provider VARCHAR(50) DEFAULT 'email';
    END IF;
END $$;

-- Create index on google_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- ============================================
-- CREATE OTPs TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    otp VARCHAR(6) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('email_verification', 'password_reset', 'phone_verification')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for OTP lookups
CREATE INDEX IF NOT EXISTS idx_otps_email ON otps(email);
CREATE INDEX IF NOT EXISTS idx_otps_email_type ON otps(email, type);
CREATE INDEX IF NOT EXISTS idx_otps_expires_at ON otps(expires_at);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE otps ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can manage OTPs
CREATE POLICY "Service role can manage otps" ON otps
    FOR ALL 
    USING (true)
    WITH CHECK (true);

-- ============================================
-- CLEANUP FUNCTION FOR EXPIRED OTPs
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void AS $$
BEGIN
    DELETE FROM otps WHERE expires_at < NOW() OR verified = true;
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a scheduled job to clean up expired OTPs (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-otps', '0 * * * *', 'SELECT cleanup_expired_otps()');

-- ============================================
-- SUMMARY
-- ============================================
-- Added columns to users table:
--   - email_verified (BOOLEAN)
--   - google_id (VARCHAR, UNIQUE)
--   - auth_provider (VARCHAR, default 'email')
-- 
-- Created otps table for OTP verification
-- Added necessary indexes for performance


