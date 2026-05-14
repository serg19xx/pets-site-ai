-- Example application table (safe to extend in later numbered files).
CREATE TABLE IF NOT EXISTS items (
  id BIGSERIAL PRIMARY KEY,
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
