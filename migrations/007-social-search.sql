CREATE TABLE IF NOT EXISTS social_search_state (
  id integer PRIMARY KEY CHECK (id = 1),
  cursor jsonb NOT NULL DEFAULT '{}'::jsonb,
  accounts jsonb NOT NULL DEFAULT '{}'::jsonb,
  lease_id uuid,
  lease_until timestamptz,
  last_success_at timestamptz,
  last_error text
);
INSERT INTO social_search_state (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS social_search_runs (
  slot bigint PRIMARY KEY,
  started_at timestamptz NOT NULL,
  finished_at timestamptz,
  status text NOT NULL CHECK (status IN ('running', 'done', 'failed')),
  post_count integer NOT NULL DEFAULT 0,
  error_code text
);

CREATE TABLE IF NOT EXISTS social_search_posts (
  id text PRIMARY KEY CHECK (id ~ '^[0-9]+$'),
  username text NOT NULL,
  body text NOT NULL,
  published_at timestamptz NOT NULL,
  query_key text NOT NULL,
  fetched_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS social_search_posts_recent ON social_search_posts (query_key, published_at DESC);
