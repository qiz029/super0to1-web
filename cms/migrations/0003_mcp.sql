-- Token secrets live only in OAuth KV, encrypted by the OAuth provider.
-- D1 is the authoritative, immediately checked connection revocation ledger.
CREATE TABLE mcp_connections (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  client_id TEXT NOT NULL,
  client_name TEXT NOT NULL,
  grant_id TEXT,
  scopes TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_used_at TEXT,
  expires_at TEXT NOT NULL,
  revoked_at TEXT
);
CREATE INDEX mcp_connections_owner ON mcp_connections(email, created_at DESC);
CREATE TABLE mcp_consents (handle_hash TEXT PRIMARY KEY, email TEXT NOT NULL, expires_at TEXT NOT NULL);
CREATE TABLE mcp_rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);
