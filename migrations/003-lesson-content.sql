CREATE TABLE IF NOT EXISTS lesson_content (
  lesson_slug text PRIMARY KEY,
  draft jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(draft) = 'object'),
  published jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(published) = 'object'),
  version integer NOT NULL DEFAULT 0 CHECK (version >= 0),
  updated_by text REFERENCES "user"(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);

CREATE TABLE IF NOT EXISTS lesson_content_revisions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lesson_slug text NOT NULL REFERENCES lesson_content(lesson_slug),
  version integer NOT NULL,
  operation text NOT NULL CHECK (operation IN ('draft', 'publish')),
  texts jsonb NOT NULL CHECK (jsonb_typeof(texts) = 'object'),
  editor_id text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lesson_slug, version)
);
