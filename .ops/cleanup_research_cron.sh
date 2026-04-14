#!/usr/bin/env bash
# Cleanup research cron entries
# Usage: bash .ops/cleanup_research_cron.sh
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_FILE="$REPO_DIR/.cron/research_cleanup.log"

log() { echo "[$(date -Iseconds)] $*" >> "$LOG_FILE"; echo "$*"; }

log "=== Cleanup started ==="

# Remove cron lines matching this repo
crontab -l 2>/dev/null | grep -v "gushi.*research" | crontab - 2>/dev/null || true
log "Removed research cron entries"

# Set cleanup state
echo "cleaned" > "$REPO_DIR/.cron/research_cleanup.state"
log "=== Cleanup done ==="
