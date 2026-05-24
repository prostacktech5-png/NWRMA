-- Temporary ERP accounts: when access ends (distinct from invite link expiry).

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "account_expires_at" TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS "User_account_expires_at_idx" ON "User"("account_expires_at");
