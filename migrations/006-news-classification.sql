CREATE TABLE IF NOT EXISTS news_classification_cache (
  cache_key text PRIMARY KEY,
  decision jsonb,
  model text,
  lease_owner uuid,
  retry_at timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS news_classification_runs (
  id uuid PRIMARY KEY,
  month date NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'done', 'failed')),
  cost_charge_micro bigint NOT NULL CHECK (cost_charge_micro >= 0),
  generation_id text,
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS news_classification_runs_month ON news_classification_runs(month);
