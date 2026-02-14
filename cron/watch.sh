#!/bin/bash

# HAIKU-INDEX: Auto-ingest watch (runs every 5 minutes)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_FILE="$SCRIPT_DIR/cron.log"
INGEST_SCRIPT="$SCRIPT_DIR/src/ingest-q-series.js"
PROJECTS="Q10 Q11 Q12 Q19"
LAST_RUN_FILE="/tmp/haiku-last-run"

# Get last run timestamp (default: 24 hours ago)
LAST_RUN=$(cat "$LAST_RUN_FILE" 2>/dev/null || date -d "24 hours ago" +%s)
NOW=$(date +%s)

# Check if any Q-series JSONL files changed since last run
CHANGED_FILES=0
for project in $PROJECTS; do
  FILES=$(find ~/.claude/projects/-var-www-html-$project -name "*.jsonl" -type f -newermt @$LAST_RUN 2>/dev/null | grep -v "sessions-index" | wc -l)
  CHANGED_FILES=$((CHANGED_FILES + FILES))
done

# If files changed, ingest
if [ $CHANGED_FILES -gt 0 ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Detected $CHANGED_FILES changed files" >> "$LOG_FILE"

  # Run ingest
  cd "$SCRIPT_DIR"
  node "$INGEST_SCRIPT" $PROJECTS >> "$LOG_FILE" 2>&1

  # Commit to Fossil
  cd "$SCRIPT_DIR"
  fossil add haiku.db 2>/dev/null
  fossil commit -m "Auto-ingest Q-series: $(date '+%Y-%m-%d %H:%M')" >> "$LOG_FILE" 2>&1

  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✓ Synced" >> "$LOG_FILE"
fi

# Update last run timestamp
echo $NOW > "$LAST_RUN_FILE"
