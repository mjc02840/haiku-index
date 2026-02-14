-- HAIKU-INDEX: SQLite Schema with FTS5
-- February 2026 Alpha Phase

-- TABLE 1: Metadata (Fast searches)
CREATE TABLE IF NOT EXISTS conversations_metadata (
  conversation_id TEXT PRIMARY KEY,
  project TEXT,
  date DATE,
  title TEXT,
  message_count INTEGER,
  key_topics TEXT,
  summary TEXT,
  status TEXT,
  has_todos BOOLEAN,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- FTS5 Virtual table on metadata
CREATE VIRTUAL TABLE IF NOT EXISTS conversations_meta_fts USING fts5(
  project,
  key_topics,
  summary,
  title,
  content=conversations_metadata,
  content_rowid=conversation_id
);

-- TABLE 2: Full Conversations (Medium cost, full context)
CREATE TABLE IF NOT EXISTS conversations_full (
  conversation_id TEXT PRIMARY KEY,
  full_text TEXT,
  token_estimate INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- FTS5 on full conversations
CREATE VIRTUAL TABLE IF NOT EXISTS conversations_fts USING fts5(
  full_text,
  content=conversations_full,
  content_rowid=conversation_id
);

-- TABLE 3: Individual Messages (For drilling down)
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id TEXT,
  message_id TEXT,
  role TEXT,
  content TEXT,
  timestamp TIMESTAMP,
  FOREIGN KEY(conversation_id) REFERENCES conversations_metadata(conversation_id)
);

-- FTS5 on messages
CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
  content,
  content=messages,
  content_rowid=id
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversation_project ON conversations_metadata(project);
CREATE INDEX IF NOT EXISTS idx_conversation_date ON conversations_metadata(date);
CREATE INDEX IF NOT EXISTS idx_message_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_message_timestamp ON messages(timestamp);
