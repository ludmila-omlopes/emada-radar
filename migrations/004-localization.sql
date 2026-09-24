CREATE TABLE IF NOT EXISTS user_locale_preferences (
  user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  locale text NOT NULL CHECK (locale IN ('pt-BR', 'en')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS content_translations (
  cache_key text PRIMARY KEY,
  target_locale text NOT NULL CHECK (target_locale IN ('pt-BR', 'en')),
  translated_text text,
  source_language text,
  lease_owner text,
  retry_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS content_translations_created_idx ON content_translations(created_at);

-- Counts reserved characters, including uncertain/failed provider requests, to avoid overspending.
CREATE TABLE IF NOT EXISTS translation_usage (
  month date PRIMARY KEY,
  characters bigint NOT NULL DEFAULT 0 CHECK (characters >= 0)
);
