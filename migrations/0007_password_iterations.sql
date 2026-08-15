PRAGMA foreign_keys = ON;

UPDATE users SET password_iterations = 100000 WHERE password_iterations > 100000;
