CREATE TABLE state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  revision INTEGER NOT NULL,
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL
);
CREATE TABLE revisions (
  revision INTEGER PRIMARY KEY,
  data TEXT NOT NULL,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL
);
CREATE TRIGGER state_insert_history AFTER INSERT ON state BEGIN
  INSERT INTO revisions VALUES (NEW.revision, NEW.data, NEW.updated_at, NEW.updated_by);
END;
CREATE TRIGGER state_update_history AFTER UPDATE ON state BEGIN
  INSERT INTO revisions VALUES (NEW.revision, NEW.data, NEW.updated_at, NEW.updated_by);
END;
CREATE TABLE members (email TEXT PRIMARY KEY, role TEXT NOT NULL CHECK (role IN ('admin', 'editor')));
CREATE TABLE previews (id TEXT PRIMARY KEY, data TEXT NOT NULL, expires_at TEXT NOT NULL);
CREATE TABLE media (id TEXT PRIMARY KEY, name TEXT NOT NULL, bytes INTEGER NOT NULL, width INTEGER NOT NULL, height INTEGER NOT NULL, created_at TEXT NOT NULL, created_by TEXT NOT NULL);
CREATE TABLE releases (
  id TEXT PRIMARY KEY, revision INTEGER NOT NULL, data TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('preparing','deploying','live','failed','verification_failed')),
  commit_sha TEXT, run_url TEXT, error TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, created_by TEXT NOT NULL
);
CREATE UNIQUE INDEX one_active_release ON releases ((1)) WHERE status IN ('preparing','deploying');
CREATE INDEX release_created_at ON releases (created_at DESC);
ALTER TABLE releases ADD COLUMN lease_until TEXT;
ALTER TABLE releases ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0;
CREATE TABLE content_paths (kind TEXT NOT NULL, id TEXT NOT NULL, path TEXT NOT NULL, PRIMARY KEY (kind,id), UNIQUE(kind,path));
