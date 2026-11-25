-- The Copper Kitchen — cloud database (Neon Postgres, free tier)
-- Run once in the Neon SQL Editor. One row per app: the whole app
-- state lives in a single JSONB document, exactly the shape the site
-- already keeps in localStorage (see js/store.js seedState). Every
-- future business system gets its own row here under its own app id,
-- so one Neon project holds the whole showcase.

CREATE TABLE IF NOT EXISTS app_state (
  app        TEXT PRIMARY KEY,
  state      JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
