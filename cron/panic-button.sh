#!/bin/bash

# HAIKU-INDEX: Panic button (manual sync)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_FILE="$SCRIPT_DIR/cron.log"
INGEST_SCRIPT="$SCRIPT_DIR/src/ingest-q-series.js"
PROJECTS="Q10 Q11 Q12 Q19"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Manual sync initiated..." | tee -a "$LOG_FILE"

cd "$SCRIPT_DIR"

# Ingest all projects
node "$INGEST_SCRIPT" $PROJECTS | tee -a "$LOG_FILE"

# Commit to Fossil
fossil add haiku.db 2>/dev/null
fossil commit -m "Manual sync: $(date '+%Y-%m-%d %H:%M')" 2>/dev/null

SYNC_TIME=$(date '+%Y-%m-%d %H:%M:%S')
echo "[${SYNC_TIME}] ✓ Synced Q10, Q11, Q12, Q19" | tee -a "$LOG_FILE"
