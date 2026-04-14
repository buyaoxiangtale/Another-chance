#!/usr/bin/env bash
# Research guard — uses OpenClaw subagent for research (no proxy needed)
# Usage: bash .ops/research_guard.sh
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CHECKLIST="$REPO_DIR/Docs/researches/blueprint_checklist.md"
CLAIMS_DIR="$REPO_DIR/.cron/research_claims"
STATE_FILE="$REPO_DIR/.cron/research_guard.state"
LOG_FILE="$REPO_DIR/.cron/research_guard.log"
RESEARCH_DIR="$REPO_DIR/Docs/researches"

MAX_BATCH=3
AUTO_CLEANUP="${AUTO_CLEANUP_ON_COMPLETE:-1}"

mkdir -p "$CLAIMS_DIR"

log() { echo "[$(date '+%H:%M:%S')] $*" >> "$LOG_FILE"; echo "$*"; }

pending_count() {
  grep -c '^\- \[ \]' "$CHECKLIST" 2>/dev/null || echo 0
}

# If completed
if [[ "$(pending_count)" -eq 0 && -f "$STATE_FILE" ]]; then
  current=$(cat "$STATE_FILE")
  if [[ "$current" != "completed" ]]; then
    log "✅ All items researched. Setting completed."
    echo "completed" > "$STATE_FILE"
  fi
  echo "completed"
  exit 0
fi

# Check if another guard is already running (lock file)
LOCK_FILE="$REPO_DIR/.cron/research_guard.pid"
if [[ -f "$LOCK_FILE" ]]; then
  old_pid=$(cat "$LOCK_FILE")
  if kill -0 "$old_pid" 2>/dev/null; then
    log "⏭️  Another guard already running (pid $old_pid). Exiting."
    exit 0
  fi
fi
echo $$ > "$LOCK_FILE"
trap 'rm -f "$LOCK_FILE"' EXIT

claim_item() {
  local entry="$1"
  local claim_id=$(echo "$entry" | md5sum | cut -c1-12)
  local claim_file="$CLAIMS_DIR/${claim_id}.claim"
  [[ -f "$claim_file" ]] && return 1
  echo "{\"entry\": \"$entry\", \"started_at\": \"$(date -Iseconds)\"}" > "$claim_file"
  echo "$claim_id"
}

extract_path() {
  echo "$1" | sed 's/^- \[.\] \[DIR\] //' | sed 's/^- \[.\] \[FILE\] //'
}

extract_type() {
  if echo "$1" | grep -q '\[DIR\]'; then echo "dir"; else echo "file"; fi
}

run_research() {
  local path="$1"
  local type="$2"
  local full_path="$REPO_DIR/$path"
  local safe_name=$(echo "$path" | tr '/' '_')
  local output_file="$RESEARCH_DIR/${safe_name}_research.md"

  log "🔍 Researching: $path ($type)"

  local prompt
  if [[ "$type" == "dir" ]]; then
    prompt="研究项目 $REPO_DIR 中 $path/ 目录下的所有源文件。对每个文件：描述用途、导出、依赖关系。然后给出该目录的架构概览。最后指出 ChronosMirror 升级需要改进的地方（角色建模、时间轴校验、MCP 维基百科集成、节奏控制）。用中文写，详细具体，引用实际的函数名和类型定义。最后把完整报告写入文件 $output_file"
  else
    prompt="研究项目 $REPO_DIR 中的文件 $path。详细描述：1) 用途和架构角色 2) 所有导出（函数、类型、常量）3) 核心逻辑和数据流 4) 依赖关系 5) ChronosMirror 升级需要改进的地方（角色建模、时间轴校验、MCP 维基百科集成、节奏控制）。用中文写，详细具体，引用实际的函数名、类型定义和行号。最后把完整报告写入文件 $output_file"
  fi

  # Use openclaw subagent (runs locally, no proxy needed)
  local result
  result=$(openclaw agent --local --message "$prompt" --json 2>&1) || true

  if [[ -f "$output_file" && $(wc -c < "$output_file") -gt 500 ]]; then
    log "✅ Output: $output_file ($(wc -c < "$output_file") bytes)"
    return 0
  else
    log "❌ Output missing or too small for $path"
    # Write what we got for debugging
    echo "$result" > "${output_file}.debug" 2>/dev/null || true
    return 1
  fi
}

mark_done() {
  local line_num="$1"
  local tmp=$(mktemp)
  awk -v n="$line_num" 'NR==n { sub(/\[ \]/, "[x]") } { print }' "$CHECKLIST" > "$tmp"
  mv "$tmp" "$CHECKLIST"
}

# Main
echo "running" > "$STATE_FILE"
log "=== Research guard started (subagent mode) ==="

BATCH=0
while [[ $BATCH -lt $MAX_BATCH ]]; do
  PENDING=$(pending_count)
  [[ "$PENDING" -eq 0 ]] && { log "🎉 No pending items remaining."; break; }

  line_num=0
  entry=""
  while IFS= read -r line; do
    line_num=$((line_num + 1))
    if [[ "$line" =~ ^-\ \[\ \] ]]; then
      entry="$line"
      break
    fi
  done < "$CHECKLIST"

  [[ -z "$entry" ]] && break

  path=$(extract_path "$entry")
  type=$(extract_type "$entry")

  claim_id=$(claim_item "$entry" 2>/dev/null || true)
  if [[ -z "$claim_id" ]]; then
    log "⏭️  Skipping (already claimed): $path"
    continue
  fi

  if run_research "$path" "$type"; then
    mark_done "$line_num"
    log "✅ Completed: $path"
  else
    rm -f "$CLAIMS_DIR/${claim_id}.claim" 2>/dev/null || true
    log "❌ Failed: $path (will retry next cycle)"
  fi

  BATCH=$((BATCH + 1))
done

FINAL_PENDING=$(pending_count)
log "=== Batch done. Remaining: $FINAL_PENDING ==="

if [[ "$FINAL_PENDING" -eq 0 ]]; then
  echo "completed" > "$STATE_FILE"
  log "✅ All research complete!"
  # Regenerate final todo
  bash "$REPO_DIR/.ops/generate_daily_research_todo.sh" >> "$LOG_FILE" 2>&1 || true
else
  echo "idle_waiting" > "$STATE_FILE"
fi
