# Architecture Overview

## Three-Tier Design Philosophy

haiku-index uses a three-tier architecture to balance speed, completeness, and token efficiency.

### Tier 1: Metadata Index (⚡ Fast, ~50ms)

**Purpose:** Quick filtering and discovery

**What's Indexed:**
- Project name (Q10, Q11, Q12, etc.)
- Conversation date
- Summary (first + last message)
- Message count
- Keywords/topics
- Status (complete/incomplete)

**Why It's Fast:**
- No full-text search
- Small payload (~100-200 bytes per result)
- ~50-100 tokens per result
- SQLite can return 1000+ results in 50ms

**Use Case:**
```bash
node src/cli.js search "deployment"
# Returns: [List of 4 conversations matching "deployment"]
# Time: ~50ms, ~50 tokens
```

### Tier 2: Full Conversations (📄 Medium, ~200ms)

**Purpose:** Get complete context when needed

**What's Stored:**
- All messages concatenated
- User role, assistant role, content
- Token estimate
- Original timestamp

**Why It's Medium Speed:**
- Loads complete conversation file
- ~500-2000 tokens per conversation
- Slightly slower but still instant to users

**Use Case:**
```bash
node src/cli.js view e74ac217-111c-466d-8f99-b9969eaf7014
# Returns: Complete conversation (1316 messages)
# Time: ~200ms, ~500 tokens
# User can now read full context
```

### Tier 3: Individual Messages (🎯 Reference)

**Purpose:** Drill-down and specific queries

**What's Stored:**
- Message-by-message breakdown
- Role (user/assistant)
- Content
- Timestamp

**Why It's Granular:**
- Enables message-level search
- Find exact quotes
- Extract specific replies
- Analyze patterns

**Use Case:**
```bash
node src/cli.js search-message "how do I deploy"
# Returns: Specific messages matching query
# Time: ~100ms per message
```

## Data Flow

```
┌─────────────────────────────────────────┐
│    Claude.ai Conversations              │
│    (Web interface, cloud stored)         │
└────────────────┬────────────────────────┘
                 │
                 │ User exports JSONL
                 ↓
┌─────────────────────────────────────────┐
│    JSONL Files                          │
│    ~/.claude/projects/                  │
└────────────────┬────────────────────────┘
                 │
                 │ ingest-all-q-series.js
                 │ • Parse JSONL
                 │ • Extract sessionId groups
                 │ • Generate summaries
                 │ • Estimate tokens
                 ↓
┌─────────────────────────────────────────┐
│    SQLite Database (haiku.db)           │
│    ├─ conversations_metadata (Tier 1)   │
│    ├─ conversations_full (Tier 2)       │
│    ├─ messages (Tier 3)                 │
│    └─ FTS5 Indexes (search)             │
└────────────────┬────────────────────────┘
                 │
                 │ CLI queries
                 │ • node src/cli.js search
                 │ • node src/cli.js view
                 │ • node src/cli.js list-projects
                 ↓
┌─────────────────────────────────────────┐
│    User Interface                       │
│    • Terminal output                    │
│    • Export to Claude.ai                │
│    • Copy/paste into new conversations  │
└─────────────────────────────────────────┘
```

## Database Schema

### conversations_metadata (Tier 1 - Fast)

```sql
conversation_id   TEXT PRIMARY KEY
project           TEXT            -- Q10, Q11, Q12, etc.
date              DATE
title             TEXT            -- Project conversation
message_count     INTEGER
key_topics        TEXT            -- CSV of topics
summary           TEXT            -- First + last message
status            TEXT            -- complete/incomplete
has_todos         BOOLEAN
last_updated      DATETIME
```

**Indexes:** Full-text search via FTS5 virtual table `conversations_meta_fts`

### conversations_full (Tier 2 - Complete)

```sql
conversation_id   TEXT PRIMARY KEY
full_text         TEXT            -- All messages concatenated
token_estimate    INTEGER
created_at        DATETIME
```

**Indexes:** Full-text search via FTS5 virtual table `conversations_fts`

### messages (Tier 3 - Granular)

```sql
id                INTEGER PRIMARY KEY
conversation_id   TEXT FOREIGN KEY
message_id        TEXT
role              TEXT            -- user/assistant
content           TEXT
timestamp         DATETIME
```

**Indexes:** Full-text search via FTS5 virtual table `messages_fts`

## FTS5 Full-Text Search

All tables use SQLite's FTS5 virtual table for instant full-text search:

```sql
-- Metadata search (what user types)
SELECT * FROM conversations_meta_fts
WHERE conversations_meta_fts MATCH 'deployment'
-- Returns: All metadata rows matching "deployment"
-- Time: ~50ms

-- Full-text search
SELECT * FROM conversations_fts
WHERE conversations_fts MATCH 'deployment'
-- Returns: All conversations matching "deployment"
-- Time: ~200ms

-- Message search
SELECT * FROM messages_fts
WHERE messages_fts MATCH 'deployment'
-- Returns: All messages matching "deployment"
-- Time: ~100ms per message
```

## CLI Workflow

```
User: node src/cli.js search "Q10"
    ↓
CLI: Query conversations_metadata
    ↓
Database: Return matches from FTS5
    ↓
CLI: Format results (title, summary, message count)
    ↓
Display:
    [1] 351222c2... | Q10 | 2026-01-25 | 1617 messages
        Status: incomplete
        User: good afternoon sun jan 25 15:33 ; can you tell me...
        Assistant: API Error: Connection error....

    [2] ed2edf98... | Q11 | 2026-01-29 | 1964 messages
        Status: incomplete
        User: haiku...
        Assistant: Perfect! Everything is saved. Let me create...
```

## Performance Characteristics

### Search Performance

| Operation | Time | Tokens | Use Case |
|-----------|------|--------|----------|
| Metadata search | ~50ms | ~50 | Quick filtering |
| View conversation | ~200ms | ~500 | Get context |
| Search messages | ~100ms | ~50 | Find quotes |
| List projects | ~10ms | ~20 | Overview |

### Storage Efficiency

| Data | Size | Messages |
|------|------|----------|
| 1,000 messages | 1.4MB | 1617 (Q10) |
| 2,000 messages | 2.8MB | 1964 (Q11) |
| 5,000 messages | 7.3MB | 5362 (Q10-Q12-Q19) |
| 10,000 messages | ~14MB | Estimated |

**Rule of thumb:** ~1.4MB per 1000 messages

### Token Efficiency

Sharing with Claude.ai:
- Metadata only: ~50 tokens
- Full conversation: ~500 tokens
- Specific message: ~50-100 tokens

You control what to share - can often get away with just metadata + specific conversation.

## Ingestion Process

```
ingest-all-q-series.js
│
├─ For each project (Q10, Q11, Q12, etc.)
│  │
│  ├─ Find JSONL file
│  ├─ Parse line-by-line
│  ├─ Group by sessionId (conversation ID)
│  │
│  └─ For each conversation:
│     │
│     ├─ Extract messages
│     ├─ Generate summary
│     ├─ Detect keywords
│     ├─ Estimate tokens
│     ├─ Determine status (complete/incomplete)
│     │
│     └─ Insert into database:
│        ├─ conversations_metadata
│        ├─ conversations_full
│        └─ messages
│
└─ Output: Summary (conversations, messages, projects)
```

## Sync Strategy

### Auto-Sync (Cron)

```bash
*/5 * * * * /path/to/haiku-index/cron/watch.sh
```

**What it does:**
1. Check if Q-series JSONL files changed
2. If changed: Run ingest-all-q-series.js
3. If not changed: Skip (saves resources)
4. Auto-commit to Fossil

**Why Cron:**
- Lightweight (checks every 5 min)
- Smart (only syncs on changes)
- Automatic (no user action needed)
- Reliable (runs in background)

### Manual Sync

```bash
/path/to/haiku-index/cron/panic-button.sh
# or
haiku-sync
```

**What it does:**
1. Immediately run ingest-all-q-series.js
2. Commit changes to Fossil
3. Log to cron.log

## Version Control (Fossil)

All code changes tracked in Fossil repository:

```bash
haiku-index.fossil
│
├─ src/
├─ sql/
├─ cron/
├─ docs/
└─ [config files]
```

**Why Fossil:**
- Lightweight (one file)
- Self-contained (no server needed)
- Complete history
- Can be backed up easily

## Security Model

### Data Privacy
- ✅ All data stays on your machine
- ✅ No cloud sync
- ✅ No telemetry
- ✅ SQLite file is portable/backupable

### Access Control
- No authentication (single user)
- File system permissions control access
- Database is plaintext SQLite (not encrypted)

## Future Improvements

Possible enhancements (not yet implemented):

1. **Database encryption** - Encrypt haiku.db at rest
2. **Web UI** - Browser-based search interface
3. **Remote sync** - Optional cloud backup
4. **API server** - Query via HTTP
5. **Multiple formats** - Support other AI assistants
6. **Smart tagging** - Auto-tag conversations by topic
7. **Analytics** - Dashboard of conversation patterns

## References

- [SQLite FTS5 Documentation](https://www.sqlite.org/fts5.html)
- [Node.js sqlite3 Module](https://github.com/mapbox/node-sqlite3)
- [README.md](../README.md) - User-facing documentation
- [FAQ.md](FAQ.md) - Common questions

---

**Questions?** Open an issue or check [CONTRIBUTING.md](../CONTRIBUTING.md).
