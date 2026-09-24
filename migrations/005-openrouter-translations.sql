-- Additive and independent from the retired character-based translation accounting.
-- Shares the platform budget from migration 002; never resets existing usage.
CREATE TABLE IF NOT EXISTS openrouter_translation_cache (
  cache_key text PRIMARY KEY,
  translated_text text,
  source_language text,
  lease_owner uuid,
  retry_at timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS openrouter_translation_runs (
  id uuid PRIMARY KEY,
  month date NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'done', 'failed')),
  cost_charge_micro bigint NOT NULL CHECK (cost_charge_micro >= 0),
  generation_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS openrouter_translation_runs_month ON openrouter_translation_runs(month);
