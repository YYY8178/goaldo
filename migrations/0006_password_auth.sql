PRAGMA foreign_keys = ON;

ALTER TABLE users ADD COLUMN password_hash TEXT;
ALTER TABLE users ADD COLUMN password_salt TEXT;
ALTER TABLE users ADD COLUMN password_iterations INTEGER NOT NULL DEFAULT 120000;
ALTER TABLE users ADD COLUMN last_password_login_at TEXT;

CREATE INDEX IF NOT EXISTS idx_users_email_status ON users(email, status);
