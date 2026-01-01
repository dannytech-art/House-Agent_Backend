# Database Migrations

This directory contains database migration scripts for the Vilanow platform.

## Migration System

We use a timestamp-based migration system where each migration is a SQL file that can be applied sequentially.

## Migration Format

Migrations follow this naming convention:
```
YYYYMMDD_HHMMSS_description.sql
```

Example:
```
20240115_143022_add_user_preferences.sql
```

## Creating a Migration

1. Create a new SQL file in this directory
2. Use the format: `YYYYMMDD_HHMMSS_description.sql`
3. Write both UP and DOWN migrations in the same file
4. Document what the migration does

Example migration:

```sql
-- Migration: Add user preferences table
-- Created: 2024-01-15
-- Description: Adds user preferences for notification settings

-- UP Migration
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

-- DOWN Migration (for rollback)
-- DROP INDEX IF EXISTS idx_user_preferences_user_id;
-- DROP TABLE IF EXISTS user_preferences;
```

## Applying Migrations

### Via Supabase Dashboard

1. Go to Supabase SQL Editor
2. Open the migration file
3. Copy the UP migration section
4. Run the SQL
5. Record the migration in `migrations_log` table (optional)

### Via Script

```bash
# Apply a single migration
npm run migrate -- migration-file.sql

# Apply all pending migrations
npm run migrate:up

# Rollback last migration
npm run migrate:down
```

## Migration Best Practices

1. **Always test migrations on staging first**
2. **Never modify existing migrations** (create new ones instead)
3. **Include both UP and DOWN migrations**
4. **Test rollback procedures**
5. **Backup database before major migrations**
6. **Document breaking changes**
7. **Use transactions where possible**

## Migration Log Table

Create this table to track applied migrations:

```sql
CREATE TABLE IF NOT EXISTS migrations_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  migration_name TEXT UNIQUE NOT NULL,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  applied_by TEXT,
  rollback_at TIMESTAMPTZ,
  notes TEXT
);

CREATE INDEX idx_migrations_log_applied_at ON migrations_log(applied_at DESC);
```

## Rollback Procedures

If you need to rollback a migration:

1. Identify the migration to rollback
2. Find the DOWN migration section
3. Run the DOWN migration SQL
4. Update migrations_log if using it

**⚠️ Warning**: Rollbacks may cause data loss if not properly handled!

