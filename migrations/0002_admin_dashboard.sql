PRAGMA foreign_keys = ON;

ALTER TABLE users ADD COLUMN admin_note TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN last_seen_at TEXT;

ALTER TABLE projects ADD COLUMN admin_note TEXT NOT NULL DEFAULT '';
ALTER TABLE projects ADD COLUMN admin_status TEXT NOT NULL DEFAULT 'active'
  CHECK (admin_status IN ('active', 'flagged', 'archived'));

CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_admin_status_updated ON projects(admin_status, updated_at DESC);

-- The agriculture project was a bundled demo that could be copied between
-- accounts through legacy localStorage. Replace only that known demo; user
-- projects created through GoalDo use generated project IDs and are preserved.
DELETE FROM projects WHERE json_extract(data, '$.id') = 'agri-iot';
