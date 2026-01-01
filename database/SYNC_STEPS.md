# Quick Database Sync Steps

## ✅ Complete Sync Order

Run these SQL scripts in Supabase SQL Editor in this exact order:

### 1. Schema (if not already run)
```sql
-- Run: database/schema.sql
-- Creates all tables
```

### 2. Password Verification Function
```sql
-- Run: database/verify_password_function.sql
-- Creates RPC function for bcrypt verification
-- REQUIRED for test data passwords to work
```

### 3. Clear Data (Optional - only if you want fresh start)
```sql
-- Run: database/clear_and_prepare.sql
-- Deletes all existing data
```

### 4. Test Data
```sql
-- Run: database/test_crud_data.sql
-- Inserts test users, properties, etc.
-- All users have password: "Test123!"
```

### 5. Enable Realtime (if not already done)
```sql
-- Run: database/enable_realtime.sql
-- Enables real-time subscriptions
```

## 🔑 Test User Credentials

All test users use the password: **`Test123!`**

- **Admin**: `admin@vilanow.com` / `Test123!`
- **Agent 1**: `agent1@vilanow.com` / `Test123!`
- **Agent 2**: `agent2@vilanow.com` / `Test123!`
- **Agent 3**: `agent3@vilanow.com` / `Test123!`
- **Seeker 1**: `seeker1@vilanow.com` / `Test123!`
- **Seeker 2**: `seeker2@vilanow.com` / `Test123!`

## ⚠️ Important Notes

1. **Password Function**: Must run `verify_password_function.sql` BEFORE inserting test data
2. **UUID Format**: All IDs are now proper UUIDs (not string IDs)
3. **Password Hashes**: Test data uses bcrypt, verified via Supabase RPC function
4. **Production**: For production, use API registration endpoint instead of SQL inserts

## ✅ Verification

After running all scripts, verify:

```sql
SELECT 
  (SELECT COUNT(*) FROM users) AS users,
  (SELECT COUNT(*) FROM properties) AS properties,
  (SELECT COUNT(*) FROM credit_bundles) AS bundles,
  (SELECT COUNT(*) FROM interests) AS interests;
```

Should return:
- users: 6
- properties: 5
- bundles: 4
- interests: 3

---

**Ready to test CRUD operations!** 🚀

