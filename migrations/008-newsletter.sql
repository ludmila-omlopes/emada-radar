CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE CHECK (email = lower(email) AND length(email) <= 254),
  locale text NOT NULL CHECK (locale IN ('pt-BR', 'en')),
  status text NOT NULL CHECK (status IN ('pending', 'confirmed', 'unsubscribed')),
  source text NOT NULL,
  consent_version text NOT NULL,
  consented_at timestamptz NOT NULL,
  confirm_token_hash text UNIQUE,
  confirm_expires_at timestamptz,
  confirmation_sent_at timestamptz,
  confirmed_at timestamptz,
  unsubscribe_token text NOT NULL UNIQUE,
  unsubscribed_at timestamptz,
  created_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS newsletter_subscribers_sending ON newsletter_subscribers (status, confirmed_at);
CREATE INDEX IF NOT EXISTS newsletter_subscribers_confirmations ON newsletter_subscribers (confirmation_sent_at);

-- One issue per ISO week. Content is frozen per locale when the issue opens,
-- so interrupted deliveries continue with the same text on later runs.
CREATE TABLE IF NOT EXISTS newsletter_issues (
  issue_key text PRIMARY KEY CHECK (issue_key ~ '^[0-9]{4}-W[0-9]{2}$'),
  created_at timestamptz NOT NULL,
  content jsonb NOT NULL,
  finished_at timestamptz
);

CREATE TABLE IF NOT EXISTS newsletter_deliveries (
  issue_key text NOT NULL REFERENCES newsletter_issues (issue_key),
  subscriber_id uuid NOT NULL REFERENCES newsletter_subscribers (id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('sending', 'sent', 'unconfirmed', 'rejected')),
  claimed_at timestamptz NOT NULL,
  sent_at timestamptz,
  provider_id text,
  PRIMARY KEY (issue_key, subscriber_id)
);
