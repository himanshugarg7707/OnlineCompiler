CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  username TEXT NOT NULL,
  username_normalized TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  avatar_initials TEXT NOT NULL DEFAULT '',
  avatar_color TEXT NOT NULL DEFAULT '#00d4ff',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS auth_sessions_expiry_idx ON auth_sessions (expires_at);

CREATE TABLE IF NOT EXISTS compiler_workspaces (
  owner_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT 'Workspace',
  files JSONB NOT NULL DEFAULT '[]'::jsonb,
  folders JSONB NOT NULL DEFAULT '[]'::jsonb,
  active_file_id TEXT,
  open_file_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  stdin TEXT NOT NULL DEFAULT '',
  subject_id TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (owner_id, workspace_id)
);
CREATE INDEX IF NOT EXISTS compiler_workspaces_updated_at_idx ON compiler_workspaces (owner_id, updated_at DESC);
