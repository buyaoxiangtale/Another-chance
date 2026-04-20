#!/bin/bash
# research_guard.sh — 研究 cron 守护进程 (Claude Code)
set -euo pipefail
export PATH="/home/pjlab/.local/bin:$PATH"

REPO="/home/pjlab/fbh/fbh_project/gushi"
STATE="$REPO/.cron/research_guard.state"
LOG="$REPO/.cron/research_guard.log"
CLAIM_DIR="$REPO/.cron/research_claims"
CHECKLIST="$REPO/Docs/researches/blueprint_checklist.md"
RESEARCH_DIR="$REPO/Docs/researches"

export https_proxy=http://127.0.0.1:7897
export http_proxy=http://127.0.0.1:7897
mkdir -p "$CLAIM_DIR" "$RESEARCH_DIR"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG"; }

# Lock to prevent concurrent guards
LOCK="$REPO/.cron/research_guard.lock"
exec 200>"$LOCK"
flock -n 200 || { log "Another guard running, exiting"; exit 0; }

# Count pending items
PENDING=$(grep -c '^\- \[ \]' "$CHECKLIST" 2>/dev/null || true)
if [[ "$PENDING" -eq 0 ]]; then
  log "All items researched, done."
  echo "completed" > "$STATE"
  exit 0
fi

# Claim next pending item
ITEM=$(grep '^\- \[ \]' "$CHECKLIST" | head -1)
if [[ -z "$ITEM" ]]; then
  log "No pending items found"
  exit 0
fi

# Extract path from item
ITEM_PATH=$(echo "$ITEM" | sed 's/^- \[ \] \[.*\] //')
CLAIM_FILE="$CLAIM_DIR/$(echo "$ITEM_PATH" | tr '/' '_' | sed 's/\.tsx\?$//').claim"

# Skip if already claimed and in progress
if [[ -f "$CLAIM_FILE" ]]; then
  CLAIM_AGE=$(( $(date +%s) - $(stat -c %Y "$CLAIM_FILE" 2>/dev/null || echo 0) ))
  if [[ "$CLAIM_AGE" -lt 600 ]]; then
    log "Item already claimed (age ${CLAIM_AGE}s): $ITEM_PATH"
    exit 0
  fi
fi

# Claim the item
echo "$(date +%s)" > "$CLAIM_FILE"
log "Claimed: $ITEM_PATH"

RESEARCH_FILE="$RESEARCH_DIR/${ITEM_PATH//\//_}_research.md"

# Run Claude Code research
cd "$REPO"

/home/pjlab/.local/bin/claude -p --dangerously-skip-permissions \
  "研究文件 $ITEM_PATH 在 gushi 故事平台项目中的作用。重点关注：
1. 文件的核心功能和职责
2. 与图片生成功能的潜在集成点
3. AI API 调用位置和 rate limit 风险点
4. 对外暴露的接口和数据结构

用中文输出研究结果。" \
  > "$RESEARCH_FILE" 2>> "$LOG" || {
    log "claude failed for $ITEM_PATH (exit $?), skipping"
    rm -f "$CLAIM_FILE"
    exit 0
  }

# Verify output is non-empty
if [[ -s "$RESEARCH_FILE" ]]; then
  ESCAPED_PATH=$(printf '%s\n' "$ITEM_PATH" | sed 's/[[\.*^$()+?{|\\]/\\&/g')
  sed -i "s|^\\- \\[ \\] \\(\\[.*\\] $ESCAPED_PATH\\)|- [x] \\1|" "$CHECKLIST"
  log "✅ Completed: $ITEM_PATH"
  rm -f "$CLAIM_FILE"
else
  log "⚠️ Empty output for $ITEM_PATH, keeping claim"
fi

REMAINING=$(grep -c '^\- \[ \]' "$CHECKLIST" 2>/dev/null || true)
echo "running" > "$STATE"
log "Remaining: $REMAINING items"
