-- Additive migration. Test on a Neon branch before applying to production.
CREATE TABLE IF NOT EXISTS practice_conversations (
  id uuid PRIMARY KEY,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  lesson_slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS practice_conversations_owner ON practice_conversations(user_id, lesson_slug, created_at);
CREATE TABLE IF NOT EXISTS practice_requests (
  id uuid PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES practice_conversations(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  lesson_slug text NOT NULL,
  prompt text NOT NULL CHECK (length(prompt) BETWEEN 1 AND 1500),
  reply text,
  status text NOT NULL CHECK (status IN ('pending', 'done', 'failed')),
  token_charge integer NOT NULL CHECK (token_charge >= 0),
  cost_charge_micro bigint NOT NULL CHECK (cost_charge_micro >= 0),
  prompt_tokens integer,
  completion_tokens integer,
  generation_id text,
  error_code text,
  context_trimmed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
CREATE INDEX IF NOT EXISTS practice_requests_owner_date ON practice_requests(user_id, created_at);
CREATE INDEX IF NOT EXISTS practice_requests_owner_lesson ON practice_requests(user_id, lesson_slug);
CREATE INDEX IF NOT EXISTS practice_requests_conversation ON practice_requests(conversation_id, created_at);
-- Includes in-flight reservations and uncertain charges, not just known successful calls.
CREATE TABLE IF NOT EXISTS practice_budgets (
  month date PRIMARY KEY,
  charged_micro bigint NOT NULL DEFAULT 0 CHECK (charged_micro >= 0)
);
