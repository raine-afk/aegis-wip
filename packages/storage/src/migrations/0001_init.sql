CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  goal TEXT NOT NULL,
  mode TEXT NOT NULL,
  status TEXT NOT NULL,
  linked_issue_or_pr_json TEXT,
  plan_snapshot_json TEXT,
  completion_summary_json TEXT,
  resume_hints_json TEXT,
  linked_memory_ids_json TEXT NOT NULL DEFAULT '[]',
  related_files_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks (status);
CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON tasks (updated_at);
CREATE INDEX IF NOT EXISTS idx_tasks_status_updated_at ON tasks (status, updated_at DESC);

CREATE TABLE IF NOT EXISTS memory_index (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  confidence TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  canonical_path TEXT NOT NULL,
  provenance_json TEXT NOT NULL,
  source_refs_json TEXT NOT NULL DEFAULT '[]',
  supersedes_json TEXT NOT NULL DEFAULT '[]',
  superseded_by TEXT,
  tags_json TEXT NOT NULL DEFAULT '[]',
  related_files_json TEXT NOT NULL DEFAULT '[]',
  related_tasks_json TEXT NOT NULL DEFAULT '[]',
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_memory_index_status ON memory_index (status);
CREATE INDEX IF NOT EXISTS idx_memory_index_type_status ON memory_index (type, status);
CREATE INDEX IF NOT EXISTS idx_memory_index_updated_at ON memory_index (updated_at);
CREATE INDEX IF NOT EXISTS idx_memory_index_status_confidence_updated_at ON memory_index (
  status,
  confidence,
  updated_at DESC
);
CREATE INDEX IF NOT EXISTS idx_memory_index_superseded_by ON memory_index (superseded_by);
