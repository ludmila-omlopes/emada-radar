CREATE TABLE IF NOT EXISTS admin_users (
  user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS admin_invites (
  token_hash text PRIMARY KEY,
  email text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz
);
CREATE TABLE IF NOT EXISTS lesson_progress (
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  lesson_slug text NOT NULL,
  answer text NOT NULL CHECK (length(answer) BETWEEN 30 AND 12000),
  checked jsonb NOT NULL,
  choice integer NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, lesson_slug)
);
CREATE TABLE IF NOT EXISTS news_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  url text NOT NULL UNIQUE CHECK (url LIKE 'https://%'),
  source text NOT NULL,
  category text NOT NULL,
  published_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by text REFERENCES "user"(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS news_status_date_idx ON news_items(status, published_at DESC);
CREATE TABLE IF NOT EXISTS news_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  details jsonb NOT NULL
);
