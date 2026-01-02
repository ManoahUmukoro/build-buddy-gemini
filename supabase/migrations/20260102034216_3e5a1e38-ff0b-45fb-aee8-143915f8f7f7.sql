-- Assign orphan transactions (with null bank_account_id) to user's primary account
-- This handles legacy transactions that were created before multi-account support
UPDATE transactions t
SET bank_account_id = (
  SELECT id FROM bank_accounts ba 
  WHERE ba.user_id = t.user_id AND ba.is_primary = true
  LIMIT 1
)
WHERE t.bank_account_id IS NULL
  AND EXISTS (
    SELECT 1 FROM bank_accounts ba 
    WHERE ba.user_id = t.user_id AND ba.is_primary = true
  );