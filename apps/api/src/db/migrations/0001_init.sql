-- Cursi — initial schema migration
-- Run this against your Supabase project or local PostgreSQL instance.

CREATE TABLE IF NOT EXISTS "users" (
  "id"         UUID PRIMARY KEY,
  "email"      TEXT NOT NULL UNIQUE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "conversations" (
  "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"    UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title"      TEXT NOT NULL DEFAULT 'New conversation',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "conversations_user_id_idx"
  ON "conversations" ("user_id");

CREATE TABLE IF NOT EXISTS "messages" (
  "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversation_id"  UUID NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
  "role"             TEXT NOT NULL CHECK ("role" IN ('user', 'assistant', 'system')),
  "content"          TEXT NOT NULL,
  "model"            TEXT,
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "messages_conversation_id_idx"
  ON "messages" ("conversation_id");

-- Auto-update updated_at on conversations
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER conversations_updated_at
  BEFORE UPDATE ON "conversations"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
