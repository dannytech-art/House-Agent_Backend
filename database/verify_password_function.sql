-- Create a function to verify bcrypt passwords in Supabase
-- This allows Edge Runtime to verify bcrypt hashes via RPC call

CREATE OR REPLACE FUNCTION verify_bcrypt_password(
  input_password TEXT,
  stored_hash TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Use pgcrypto's crypt function to verify
  RETURN stored_hash = crypt(input_password, stored_hash);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION verify_bcrypt_password(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_bcrypt_password(TEXT, TEXT) TO anon;

