CREATE TABLE IF NOT EXISTS links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  target_url TEXT NOT NULL,
  title TEXT,
  summary TEXT,
  password_lookup TEXT UNIQUE,
  password_salt TEXT,
  password_hash TEXT,
  click_count INTEGER NOT NULL DEFAULT 0,
  public_stats INTEGER NOT NULL DEFAULT 1,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_clicked_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_links_password_lookup ON links(password_lookup);
CREATE INDEX IF NOT EXISTS idx_links_active_created ON links(active, created_at DESC);

CREATE TABLE IF NOT EXISTS click_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  link_id INTEGER NOT NULL,
  clicked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  country TEXT,
  referrer_host TEXT,
  user_agent TEXT,
  FOREIGN KEY(link_id) REFERENCES links(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_click_events_link_time ON click_events(link_id, clicked_at DESC);
