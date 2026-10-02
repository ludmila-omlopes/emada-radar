-- Emails collected while the Academy is closed to the public.
CREATE TABLE IF NOT EXISTS academy_waitlist (
  email text PRIMARY KEY CHECK (email = lower(email) AND length(email) <= 254),
  locale text NOT NULL CHECK (locale IN ('pt-BR', 'en')),
  source text NOT NULL,
  user_id text,
  created_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS academy_waitlist_created ON academy_waitlist (created_at);
