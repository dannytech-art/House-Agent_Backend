-- Migration: Create migrations log table
-- Created: 2024-01-01
-- Description: Creates a table to track applied database migrations

-- UP Migration
CREATE TABLE IF NOT EXISTS migrations_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  migration_name TEXT UNIQUE NOT NULL,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  applied_by TEXT,
  rollback_at TIMESTAMPTZ,
  notes TEXT
);

CREATE INDEX idx_migrations_log_applied_at ON migrations_log(applied_at DESC);
CREATE INDEX idx_migrations_log_migration_name ON migrations_log(migration_name);

-- Add comment
COMMENT ON TABLE migrations_log IS 'Tracks all applied database migrations';

-- DOWN Migration (for rollback)
-- DROP INDEX IF EXISTS idx_migrations_log_migration_name;
-- DROP INDEX IF EXISTS idx_migrations_log_applied_at;
-- DROP TABLE IF EXISTS migrations_log;

