# Installation Guide

## Prerequisites

Before installing haiku-index, ensure you have:

- **Node.js 14+** - [Download](https://nodejs.org/)
- **npm** - Comes with Node.js
- **SQLite3** - Usually included in Node.js

### Verify Installation

```bash
# Check Node.js
node --version
# Should show v14.0.0 or higher

# Check npm
npm --version
# Should show 6.0.0 or higher

# Check sqlite3
sqlite3 --version
# Should show 3.x.x
```

## Quick Install (GitHub Cloning)

### Step 1: Clone the Repository

```bash
git clone https://github.com/mjc02840/haiku-index.git
cd haiku-index
```

### Step 2: Install Dependencies

```bash
npm install
```

This installs:
- `sqlite3@^5.1.6` - Database library

### Step 3: Verify Installation

```bash
node src/cli.js --help
```

You should see the CLI help output.

## First Run

### Step 1: Export Your Conversations

From [claude.ai](https://claude.ai):

1. Open Settings (bottom left) → Privacy
2. Click "Export conversations"
3. Select JSONL format
4. Wait for download (may take a moment)
5. Note the file location (usually `~/Downloads/`)

### Step 2: Move Conversations (Optional)

```bash
# Optional: Organize your exports
mkdir -p ~/.claude/projects
mv ~/Downloads/claude-conversations-*.jsonl ~/.claude/projects/
```

Or just keep them wherever - the ingest script will find them.

### Step 3: Run the Ingest

```bash
cd /path/to/haiku-index
node src/ingest-all-q-series.js
```

You should see:
```
═══════════════════════════════════════════════════════════════════════════
  HAIKU-INDEX: Complete Q-Series Ingest
═══════════════════════════════════════════════════════════════════════════

✓ Starting ingest of: Q10, Q11, Q12, Q14, Q18, Q19, Q21
...
```

### Step 4: Start Searching

```bash
node src/cli.js search "deployment"
node src/cli.js list-projects
```

## Setup Auto-Sync (Optional)

Enable automatic 5-minute sync:

### On macOS/Linux

Add to crontab:

```bash
crontab -e
```

Add this line:

```
*/5 * * * * /path/to/haiku-index/cron/watch.sh >> /path/to/haiku-index/cron.log 2>&1
```

Replace `/path/to/haiku-index` with actual path (e.g., `/Users/john/haiku-index`).

### On Windows

Use Task Scheduler:

1. Open Task Scheduler
2. Create Basic Task
3. Name: "haiku-index sync"
4. Trigger: Every 5 minutes
5. Action: `node C:\path\to\haiku-index\src\ingest-all-q-series.js`

### Manual Sync (Anytime)

No need to set up cron? Just run manually:

```bash
/path/to/haiku-index/cron/panic-button.sh
```

Or create an alias (macOS/Linux):

```bash
echo 'alias haiku-sync="/path/to/haiku-index/cron/panic-button.sh"' >> ~/.bashrc
source ~/.bashrc
haiku-sync
```

## Troubleshooting

### "Command not found: node"

Node.js is not installed or not in PATH.

**Solution:**
1. Install Node.js from https://nodejs.org/
2. Restart terminal
3. Verify: `node --version`

### "No JSONL files found"

The ingest script can't find your conversation exports.

**Solution:**
1. Export from claude.ai (Settings → Privacy → Export)
2. Place exports in `~/.claude/projects/`
3. Or update the script to point to your export location

### "sqlite3: cannot open database"

Database file is locked or corrupted.

**Solution:**
```bash
# Start fresh
rm haiku.db
sqlite3 haiku.db < sql/schema.sql
node src/ingest-all-q-series.js
```

### "Permission denied"

Cron job doesn't have permission to run.

**Solution:**
```bash
chmod +x /path/to/haiku-index/cron/watch.sh
chmod +x /path/to/haiku-index/cron/panic-button.sh
```

### "Module not found: sqlite3"

Dependencies not installed.

**Solution:**
```bash
npm install
```

### Database appears empty

The ingest might have failed silently.

**Solution:**
```bash
# Check the database
sqlite3 haiku.db "SELECT COUNT(*) FROM conversations_metadata;"

# Run ingest again with verbose output
node src/ingest-all-q-series.js
```

## Updating

### From GitHub

If you cloned from GitHub:

```bash
cd /path/to/haiku-index
git pull origin main
npm install
```

### Backing Up Your Database

Before updating, backup your database:

```bash
cp haiku.db haiku.db.backup
```

## Uninstalling

To remove haiku-index:

```bash
# Delete the directory
rm -rf /path/to/haiku-index

# Remove from crontab (if set up)
crontab -e
# Remove the haiku-index line

# Remove aliases (if added)
# Edit ~/.bashrc or ~/.zshrc and remove haiku-sync alias
```

Your conversation exports are safe - they're just JSONL files. You can keep them or delete them as you like.

## Platform-Specific Notes

### macOS

- SQLite is included
- Use `crontab -e` for cron jobs
- Finder: Press Cmd+Shift+G to open file location

### Linux

- SQLite usually available via package manager
- Use `crontab -e` for cron jobs
- Install Node.js via nvm or apt

### Windows

- Use Task Scheduler instead of cron
- Or use Windows Subsystem for Linux (WSL) with Linux instructions
- Node.js installer includes npm and SQLite

## Next Steps

1. ✅ Installation complete
2. 📖 Read the [README.md](../README.md)
3. 🔍 Try searching: `node src/cli.js search "your-topic"`
4. 💾 Set up auto-sync (optional)
5. 📚 Check [ARCHITECTURE.md](ARCHITECTURE.md) to understand how it works

## Need Help?

- Check [FAQ.md](FAQ.md)
- Read [ARCHITECTURE.md](ARCHITECTURE.md)
- Open an issue on GitHub
- Review [CONTRIBUTING.md](../CONTRIBUTING.md)

---

**Happy indexing!** 🚀
