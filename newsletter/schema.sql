CREATE TABLE IF NOT EXISTS subscribers (
  email TEXT PRIMARY KEY NOT NULL,
  status TEXT NOT NULL,
  confirmation_token_hash TEXT,
  confirmation_expires_at INTEGER,
  confirmation_sent_at INTEGER,
  unsubscribe_token TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  confirmed_at INTEGER,
  updated_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscribers_confirmation_hash
  ON subscribers(confirmation_token_hash)
  WHERE confirmation_token_hash IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscribers_unsubscribe_token
  ON subscribers(unsubscribe_token);

CREATE INDEX IF NOT EXISTS idx_subscribers_status_email
  ON subscribers(status, email);

CREATE TABLE IF NOT EXISTS publications (
  url TEXT PRIMARY KEY NOT NULL,
  publication_id TEXT NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  sent_at INTEGER,
  recipient_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_publications_status_started
  ON publications(status, started_at);

CREATE TABLE IF NOT EXISTS newsletter_meta (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
