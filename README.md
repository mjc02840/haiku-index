# haiku-index

> **Recover your lost Claude conversations. Search everything. Local, private, fast.**

A searchable index of all your Claude conversations stored locally on your machine. Never lose context between sessions again.

## The Problem

You're having a great conversation with Claude, solving a problem, building something cool. Then you close the browser. The conversation is archived somewhere in Claude's cloud, but you can't easily search it, retrieve context, or continue where you left off.

**haiku-index solves this.** It keeps a local copy of every conversation, indexed and searchable.

## The Solution

haiku-index is a lightweight SQLite database with full-text search that automatically indexes your Claude conversations. Three-tier architecture makes searches fast (metadata first, then full-text if needed).

## Features

- 🔍 **Full-Text Search** - Search across all conversations instantly
- 🏠 **Local Storage** - Your data stays on your machine (no cloud)
- ⚡ **Three-Tier Architecture** - Fast metadata search → full-text → message-level
- 🔐 **Zero Vendor Lock-in** - SQLite database, free to export anytime
- ⏱️ **Automatic Sync** - Updates every 5 minutes
- 🔔 **Panic Button** - Manual sync anytime with `haiku-sync`
- 🎯 **Multi-Project Support** - Index all your Q-series, ESLTP, or custom projects
- 📊 **Token Efficient** - Share specific conversations with Claude.ai without full context

## Installation

### Prerequisites
- Node.js 14 or higher
- npm or yarn
- SQLite3 (usually included)

### Quick Install

```bash
git clone https://github.com/mjc02840/haiku-index.git
cd haiku-index
npm install
```

## Quick Start

### 1. Export your conversations

From [claude.ai](https://claude.ai):
- Go to Settings > Privacy
- Export your conversations (JSONL format)
- Note the export location

### 2. Ingest the data

```bash
node src/ingest-all-q-series.js
```

### 3. Start searching

```bash
node src/cli.js search "Q10"
node src/cli.js list-projects
node src/cli.js view [conversation-id]
```

## CLI Commands

### Search across all projects
```bash
node src/cli.js search "deployment"
```

Returns matching conversations with metadata (fast, ~50ms).

### View full conversation
```bash
node src/cli.js view e74ac217-111c-466d-8f99-b9969eaf7014
```

Shows complete conversation with all messages.

### List all projects
```bash
node src/cli.js list-projects
```

Shows indexed projects and conversation counts.

### Search specific messages
```bash
node src/cli.js search-message "avatar"
```

Find specific messages within conversations.

### Export for Claude.ai
```bash
node src/cli.js export [conversation-id]
```

Format conversation for pasting into Claude.ai.

## How It Works

### Three-Tier Architecture

**Tier 1: Metadata Index** (~50ms, ~50 tokens)
- Project name, date, summary
- Message count, keywords
- Fast filtering and discovery

**Tier 2: Full Conversations** (~200ms, ~500 tokens)
- Complete conversation thread
- All messages + token estimate
- Get full context when needed

**Tier 3: Individual Messages**
- Message-by-message breakdown
- Drill-down for specific details
- Find exact quotes

### Data Flow

```
Claude conversations
    ↓
JSONL files from claude.ai export
    ↓
ingest-all-q-series.js parser
    ↓
SQLite database with FTS5 indexes
    ↓
CLI search interface
    ↓
Your results (local, private, instant)
```

## Auto-Sync (Optional)

Enable automatic 5-minute sync by adding to crontab:

```bash
*/5 * * * * /path/to/haiku-index/cron/watch.sh >> /path/to/haiku-index/cron.log 2>&1
```

Or trigger manual sync anytime:

```bash
haiku-sync
```

## Database Structure

### conversations_metadata
Fast-indexed metadata for each conversation.

### conversations_full
Complete conversation text (for full-text search).

### messages
Individual messages (for message-level queries).

All tables use FTS5 virtual indexes for instant full-text search.

## Storage Requirements

- ~5-20MB per 5,000 messages (very efficient)
- Depends on message length and richness

For reference:
- 5,000 messages = ~7MB
- 10,000 messages = ~14MB

## Use Cases

### 1. Continue Previous Conversations
Search for a past conversation, review context, ask Claude to continue.

### 2. Find Solutions to Common Problems
"How did I solve this authentication issue before?"

### 3. Recover Lost Work
Accidentally closed a tab? Search and recover the conversation.

### 4. Track Project Progress
See all conversations related to a project in chronological order.

### 5. Build Better Context
Take specific conversations and build a curated context file for new work.

## Architecture Diagram

```
User Query
    ↓
Search Metadata (fast, ~50ms)
    ↓
Results with Summaries
    ↓
Select Conversation
    ↓
Retrieve Full Text (if needed)
    ↓
Export to Claude.ai
    ↓
Continue Conversation
```

## Privacy & Security

- ✅ **Fully Local** - Runs on your machine, no cloud
- ✅ **No Tracking** - No telemetry, no analytics
- ✅ **Your Data** - You control the database file
- ✅ **Backup Anytime** - Export SQLite database whenever

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md).

### Development

```bash
git clone https://github.com/mjc02840/haiku-index.git
cd haiku-index
npm install
node src/cli.js --help
```

### Reporting Issues

Use [GitHub Issues](https://github.com/mjc02840/haiku-index/issues).

## License

MIT License - See [LICENSE](LICENSE) for details.

## Made By

Built with Claude Haiku 4.5. A proof of concept that AI can help you recover your own AI conversations.

---

## FAQ

**Q: Is my data private?**
A: Yes! haiku-index runs entirely locally. No cloud, no servers, no tracking. Your data never leaves your machine.

**Q: Can I export my data?**
A: Yes, it's all in a local SQLite database. You can export/backup anytime.

**Q: How much storage does it use?**
A: ~5-20MB per 5,000 messages. Very efficient.

**Q: How often does it sync?**
A: Every 5 minutes automatically via cron. Or manually with `haiku-sync` anytime.

**Q: Does it work on Mac/Linux/Windows?**
A: Yes, Node.js and SQLite work on all platforms.

**Q: Can I search across different projects?**
A: Yes! Search queries work across all indexed conversations.

---

**Have questions?** Open an issue on GitHub or check [docs/FAQ.md](docs/FAQ.md).
