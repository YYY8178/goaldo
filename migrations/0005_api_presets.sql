PRAGMA foreign_keys = ON;

ALTER TABLE api_connections ADD COLUMN preset_id TEXT NOT NULL DEFAULT 'custom';
CREATE INDEX IF NOT EXISTS idx_api_connections_preset ON api_connections(preset_id, status);
