-- One-time migration for existing users.
-- Run this once after deploying the email_verified column.
UPDATE user_accounts
SET email_verified = true
WHERE email_verified IS NULL
   OR email_verified = false;
