PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS api_connections (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('self', 'managed')),
  provider TEXT NOT NULL CHECK (provider IN ('openai-compatible', 'custom')),
  label TEXT NOT NULL DEFAULT '',
  base_url TEXT NOT NULL,
  model TEXT NOT NULL,
  api_key_ciphertext TEXT NOT NULL DEFAULT '',
  api_key_hint TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS api_access_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  purpose TEXT NOT NULL,
  expected_usage TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_api_connections_owner_status ON api_connections(owner_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_requests_status_created ON api_access_requests(status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_api_requests_one_pending_per_user ON api_access_requests(user_id) WHERE status = 'pending';
