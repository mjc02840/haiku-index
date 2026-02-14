# Frequently Asked Questions

## Privacy & Security

### Q: Is my data private?

**A:** Yes! haiku-index runs entirely locally.

- No cloud servers
- No tracking/analytics
- No phone home
- No authentication needed
- Your data never leaves your machine

The SQLite database lives in `/var/www/html/HAIKU_INDEX/haiku.db` - you have full control.

### Q: Can someone else access my conversations?

**A:** Only if they have:
1. Physical access to your computer
2. File system permissions to read `haiku.db`

It's as secure as any other file on your machine.

### Q: Can I encrypt the database?

**A:** Currently, haiku-index doesn't encrypt the SQLite database.

**Options:**
- Use full-disk encryption (OS level)
- Encrypt the `haiku.db` file separately
- Store in an encrypted folder/vault

## Installation & Setup

### Q: Do I need to install anything besides Node.js?

**A:** Just Node.js (14+) and npm.

SQLite comes with Node.js package. Git is optional (for cloning).

### Q: How do I export my conversations from claude.ai?

**A:** From [claude.ai](https://claude.ai):

1. Open Settings (⚙️ bottom left)
2. Click "Privacy"
3. Click "Export Conversations"
4. Choose JSONL format
5. Download (may take a moment)
6. Place in `~/.claude/projects/` (optional, ingest will find them)

### Q: Can I use haiku-index with conversations from other AI (ChatGPT, etc.)?

**A:** Currently designed for Claude conversations.

**Possible in future:**
- Generic JSONL parsing
- ChatGPT conversation import
- Other AI assistants

Would you like to contribute support for another format? See [CONTRIBUTING.md](../CONTRIBUTING.md).

### Q: Does haiku-index work on Windows/Mac/Linux?

**A:** Yes, all platforms supported!

- Windows: Use Task Scheduler for auto-sync
- Mac: Use crontab
- Linux: Use crontab

## Functionality

### Q: How often does haiku-index sync?

**A:** Depends on your setup:

- **Auto-sync (Cron):** Every 5 minutes (only if files changed)
- **Manual sync:** `haiku-sync` command (instant)
- **Never:** Just run `node src/ingest-all-q-series.js` when you want

### Q: Can I search across different projects?

**A:** Yes! Searches work across all indexed projects.

```bash
node src/cli.js search "Q10"
# Returns results from Q10, Q11, Q12, Q19, etc. if they mention Q10

node src/cli.js search "deployment"
# Returns all conversations mentioning "deployment"
```

### Q: Can I export my search results?

**A:** You can export a full conversation:

```bash
node src/cli.js export [conversation-id]
# Outputs formatted conversation ready to paste into Claude.ai
```

### Q: How do I know if my data was indexed correctly?

**A:** Check database:

```bash
# Count conversations
sqlite3 haiku.db "SELECT COUNT(*) FROM conversations_metadata;"

# List projects
node src/cli.js list-projects

# Search for something
node src/cli.js search "your-keyword"
```

## Storage & Performance

### Q: How much disk space does haiku-index use?

**A:** Very efficient! ~1.4MB per 1,000 messages.

**Examples:**
- 1,617 messages (Q10): ~2.3MB
- 1,964 messages (Q11): ~2.8MB
- 5,362 messages total: ~7.3MB

SQLite compression is excellent.

### Q: Will haiku-index slow down my computer?

**A:** No, it's lightweight.

**Resource usage:**
- CPU: Only during ingest (1-2 seconds per project)
- Memory: ~50MB during search
- Disk: <10MB for typical usage
- Network: Zero (all local)

### Q: Can I have multiple databases?

**A:** Yes! Just use different `haiku.db` files:

```bash
# Database 1: All conversations
node src/cli.js search "deployment" # uses haiku.db

# Database 2: Work conversations only
mv haiku.db haiku-all.db
node src/ingest-all-q-series.js Q10 Q12
# creates new haiku.db with selected projects
```

## Usage & Features

### Q: How do I continue a previous conversation?

**A:**

1. Search: `node src/cli.js search "topic"`
2. Find the conversation
3. View it: `node src/cli.js view [id]`
4. Copy/paste relevant parts into Claude.ai
5. Ask Claude to continue from there

### Q: Can I delete conversations?

**A:** Currently, you can:

1. Delete from SQLite directly
2. Start fresh: `rm haiku.db && sqlite3 haiku.db < sql/schema.sql`
3. Keep your exports and selectively re-ingest

Individual message deletion not yet supported.

### Q: Can I import conversations from a backup?

**A:** Yes!

```bash
# From previous haiku.db backup
cp haiku.db.backup haiku.db

# From JSONL exports
node src/ingest-all-q-series.js
```

### Q: How do I backup my data?

**A:** Simple! Just copy the database file:

```bash
cp haiku.db haiku.db.backup.$(date +%Y%m%d)

# Or zip it
zip haiku-backup.zip haiku.db
```

## Troubleshooting

### Q: Search returns no results but I know the conversation exists

**A:**

1. Check database isn't empty: `sqlite3 haiku.db "SELECT COUNT(*) FROM conversations_metadata;"`
2. Search with different keyword
3. Try: `node src/cli.js list-projects` to verify projects are indexed

### Q: "Module not found: sqlite3"

**A:** Dependencies not installed:

```bash
cd haiku-index
npm install
```

### Q: "Permission denied" on cron job

**A:** Make scripts executable:

```bash
chmod +x /path/to/haiku-index/cron/*.sh
```

### Q: Database locked error

**A:** Only one instance can access database at a time.

**Solution:**
- Close other terminals running haiku-index
- Wait a moment and try again
- Or start fresh: `rm haiku.db && sqlite3 haiku.db < sql/schema.sql`

### Q: Ingest seems stuck

**A:** Large JSONL files take time.

**Patience:**
- Q11 (17MB): ~20 seconds
- Q10 (13MB): ~2 seconds
- Total: ~1-2 minutes for all projects

**Check progress:**
- Open another terminal
- `sqlite3 haiku.db "SELECT COUNT(*) FROM messages;"` (watch this grow)

## Contributing & Community

### Q: Can I contribute?

**A:** Yes! See [CONTRIBUTING.md](../CONTRIBUTING.md).

**Ways to help:**
- Report bugs
- Suggest features
- Write code
- Improve documentation
- Fix typos

### Q: Is haiku-index open source?

**A:** Yes! MIT License.

Free to use, modify, and distribute. See [LICENSE](../LICENSE).

### Q: Who maintains this?

**A:** Built with Claude Haiku 4.5 under MIT license.

Maintained by the community.

### Q: Can I fork/modify it?

**A:** Absolutely! MIT license means you can:

- Use it commercially
- Modify it
- Distribute your changes
- Keep it private or public

Just include the license.

## Advanced Questions

### Q: Can I query the database directly?

**A:** Yes! SQLite is portable:

```bash
sqlite3 haiku.db
# Now in SQLite prompt
SELECT * FROM conversations_metadata LIMIT 5;
SELECT COUNT(*) FROM messages;
```

### Q: How do I understand the schema?

**A:** See [ARCHITECTURE.md](ARCHITECTURE.md) for full schema breakdown.

### Q: Can I integrate with other tools?

**A:** Yes! `haiku.db` is a standard SQLite file.

**Options:**
- Query directly via command line
- Use any SQLite client (TablePlus, DBeaver, etc.)
- Export to CSV: `sqlite3 -csv haiku.db "SELECT * FROM conversations_metadata;"`
- Build a web UI on top

### Q: What's the token cost of using haiku-index?

**A:**

- Metadata search: ~50 tokens per result
- Full conversation: ~500 tokens
- Zero tokens during search (all local)

You only pay Claude tokens when you copy/paste results into Claude.ai.

## Getting Help

### Q: Where do I ask questions?

Options (in order of helpfulness):

1. **Check [INSTALLATION.md](INSTALLATION.md)** - Most setup questions covered
2. **Read [ARCHITECTURE.md](ARCHITECTURE.md)** - How it works
3. **Search this FAQ** - Common questions
4. **Open [GitHub Issue](https://github.com/mjc02840/haiku-index/issues)** - Bug reports, feature requests
5. **Check [CONTRIBUTING.md](../CONTRIBUTING.md)** - Development questions

### Q: How do I report a bug?

Open a [GitHub Issue](https://github.com/mjc02840/haiku-index/issues) with:

1. Description of the problem
2. Steps to reproduce
3. Expected vs. actual behavior
4. Environment (Node version, OS, etc.)

### Q: How do I request a feature?

Open a [GitHub Issue](https://github.com/mjc02840/haiku-index/issues) with:

1. Problem it solves
2. Proposed solution
3. Example usage
4. Why it matters

---

## Still Have Questions?

- 📖 Read the [README.md](../README.md)
- 🏗️ Check [ARCHITECTURE.md](ARCHITECTURE.md)
- 📥 See [INSTALLATION.md](INSTALLATION.md)
- 🤝 Review [CONTRIBUTING.md](../CONTRIBUTING.md)
- 🐛 Open a GitHub Issue

We're happy to help!
