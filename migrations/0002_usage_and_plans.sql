CREATE TABLE IF NOT EXISTS plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  max_api_keys INTEGER NOT NULL,
  requests_per_day INTEGER NOT NULL,
  tokens_per_month INTEGER NOT NULL,
  requests_per_minute INTEGER NOT NULL,
  max_input_tokens INTEGER NOT NULL,
  max_output_tokens INTEGER NOT NULL
);

INSERT OR IGNORE INTO plans (
  id,
  name,
  max_api_keys,
  requests_per_day,
  tokens_per_month,
  requests_per_minute,
  max_input_tokens,
  max_output_tokens
) VALUES (
  1,
  'free',
  3,
  1000,
  100000,
  10,
  4000,
  2000
);

ALTER TABLE users
ADD COLUMN plan_id INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS api_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  api_key_id INTEGER,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE,
  FOREIGN KEY (api_key_id)
    REFERENCES api_keys(id)
    ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_api_usage_user_created
ON api_usage(user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_api_usage_key_created
ON api_usage(api_key_id, created_at);
