PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS usage_counters (
  scope TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  window_key TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (scope, subject_id, window_key)
);

CREATE INDEX IF NOT EXISTS idx_usage_counters_window ON usage_counters(window_key, scope);
