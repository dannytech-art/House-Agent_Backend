# Test Data Password Notes

## Password Format Issue

The test data uses **bcrypt** hashes (via PostgreSQL's `crypt` function), but the API's `verifyPassword` function currently uses **SHA-256**.

## Solutions

### Option 1: Use API Registration (Recommended)
Instead of inserting users directly via SQL, create them through the API:

```bash
POST /api/auth/register
{
  "email": "admin@vilanow.com",
  "password": "Test123!",
  "name": "Admin User",
  "phone": "+234 800 000 0001",
  "role": "admin"
}
```

This ensures passwords are hashed correctly using the API's hashing method.

### Option 2: Update Security to Support Both
The `verifyPassword` function has been updated to temporarily accept bcrypt hashes for test data. However, for production, you should:

1. Use Supabase Auth for user management (recommended)
2. Or implement proper bcrypt verification
3. Or update all passwords to use SHA-256 format

### Option 3: Use Supabase Auth
For production, consider using Supabase's built-in Auth system which handles password hashing automatically.

## Test User Credentials

All test users have the password: **`Test123!`**

- Admin: `admin@vilanow.com` / `Test123!`
- Agent 1: `agent1@vilanow.com` / `Test123!`
- Agent 2: `agent2@vilanow.com` / `Test123!`
- Agent 3: `agent3@vilanow.com` / `Test123!`
- Seeker 1: `seeker1@vilanow.com` / `Test123!`
- Seeker 2: `seeker2@vilanow.com` / `Test123!`

## Current Status

The test data SQL will insert users with bcrypt hashes. The `verifyPassword` function has been updated to temporarily accept these for testing purposes. For production, you should use the API registration endpoint or implement proper bcrypt verification.

