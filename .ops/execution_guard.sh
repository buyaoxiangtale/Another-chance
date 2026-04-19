#!/bin/bash
# execution_guard.sh — 执行 cron 守护进程 (Claude Code)
set -euo pipefail
export PATH="/home/pjlab/.local/bin:$PATH"

REPO="/home/pjlab/fbh/fbh_project/gushi"
BLUEPRINT="$REPO/.ops/BLUEPRINT.md"
STATE="$REPO/.cron/execution_guard.state"
LOG="$REPO/.cron/execution_guard.log"
PROGRESS="$REPO/.cron/execution_guard.progress"
BLOCK_COUNT_FILE="$REPO/.cron/execution_guard.block_count"
CHECKPOINT_FILE="$REPO/.cron/execution_guard.pending_checkpoint"

mkdir -p "$(dirname "$STATE")" "$(dirname "$LOG")"

export https_proxy=http://127.0.0.1:7897
export http_proxy=http://127.0.0.1:7897

log() { echo "[$(date '+%Y-%m-%d-%H-%M-%S')] $*" | tee -a "$LOG"; }

# Lock to prevent concurrent guards
LOCK="$REPO/.cron/execution_guard.lock"
exec 200>"$LOCK"
flock -n 200 || { log "Another execution guard running"; exit 0; }

# Read block count (streak counter)
BLOCK_COUNT=$(cat "$BLOCK_COUNT_FILE" 2>/dev/null || echo 0)

# Count pending items
PENDING=$(grep -c '^\- \[ \]' "$BLUEPRINT" 2>/dev/null || true)
DONE=$(grep -c '^\- \[x\]' "$BLUEPRINT" 2>/dev/null || true)

if [[ "$PENDING" -eq 0 ]]; then
  log "🎉 Blueprint complete! All $DONE items done."
  echo "completed" > "$STATE"
  bash "$REPO/.ops/cleanup_execution_cron.sh" 2>/dev/null || true
  exit 0
fi

log "Progress: $DONE done, $PENDING pending (streak: $BLOCK_COUNT)"

# Streak detection
if [[ "$BLOCK_COUNT" -ge 5 ]]; then
  STUCK=$(grep '^\- \[ \]' "$BLUEPRINT" | head -3 | tr '\n' ' ')
  log "⚠️ STALL DETECTED (5 commits, no progress). Stuck at: $STUCK"
  echo "stalled" > "$STATE"
  exit 1
fi

# Pick the first cluster of pending items (up to 6 items in same phase)
CLUSTER_ITEMS=()
CURRENT_PHASE=""
while IFS= read -r line; do
  ITEM=$(echo "$line" | sed 's/^- \[ \] //')
  PHASE=$(echo "$ITEM" | grep -oP '^\d+\.\d+' | head -1 | cut -d. -f1)
  
  if [[ -z "$CURRENT_PHASE" ]]; then
    CURRENT_PHASE="$PHASE"
  fi
  
  if [[ "$PHASE" == "$CURRENT_PHASE" ]] && [[ ${#CLUSTER_ITEMS[@]} -lt 6 ]]; then
    CLUSTER_ITEMS+=("$ITEM")
  else
    break
  fi
done < <(grep '^\- \[ \]' "$BLUEPRINT")

if [[ ${#CLUSTER_ITEMS[@]} -eq 0 ]]; then
  log "No items to execute"
  echo "idle" > "$STATE"
  exit 0
fi

CLUSTER_LABEL="Phase $CURRENT_PHASE"

log "Executing cluster $CLUSTER_LABEL (${#CLUSTER_ITEMS[@]} items)"

cat > "$CHECKPOINT_FILE" <<EOF
# Execution Checkpoint — $(date '+%Y-%m-%d-%H-%M-%S')
Cluster: $CLUSTER_LABEL
Items:
$(printf '  - %s\n' "${CLUSTER_ITEMS[@]}")
Status: running
EOF

BLUEPRINT_CONTENT=$(cat "$BLUEPRINT")

echo "running" > "$STATE"

cd "$REPO"

/home/pjlab/.local/bin/claude -p --dangerously-skip-permissions \
  "你是一个专业的全栈开发工程师。请按照蓝图中的检查清单完成以下任务：

## 蓝图
$BLUEPRINT_CONTENT

## 当前任务
请完成以下检查清单项：
$(printf '%s\n' "${CLUSTER_ITEMS[@]}")

## 要求
1. 严格遵循蓝图中的实现要点
2. 修改已有文件时保持现有代码风格
3. 所有新代码用 TypeScript 编写
4. 不要创建多余的文件，只修改必要的文件
5. 完成后在蓝图中将对应项标记为 [x]
6. 完成后运行 npm run build 验证编译通过

项目根目录: $REPO" \
  >> "$LOG" 2>&1

EXIT_CODE=$?

if [[ $EXIT_CODE -eq 0 ]]; then
  NEW_PENDING=$(grep -c '^\- \[ \]' "$BLUEPRINT" 2>/dev/null || true)
  if [[ "$NEW_PENDING" -lt "$PENDING" ]]; then
    PROGRESS_INCREASE=$((PENDING - NEW_PENDING))
    log "✅ Progress! $PROGRESS_INCREASE items completed ($PENDING → $NEW_PENDING)"
    echo 0 > "$BLOCK_COUNT_FILE"
    
    cd "$REPO"
    git add -A
    git diff --cached --quiet || git commit -m "feat: $CLUSTER_LABEL execution ($PROGRESS_INCREASE items)" 2>> "$LOG" || true
  else
    log "Commit succeeded but no checklist progress ($PENDING → $NEW_PENDING)"
    echo $((BLOCK_COUNT + 1)) > "$BLOCK_COUNT_FILE"
  fi
  
  bash "$REPO/.ops/generate_daily_execution_todo.sh" >> "$LOG" 2>&1 || true
else
  log "❌ Claude Code exec failed (exit $EXIT_CODE)"
  echo "exec_failed" > "$STATE"
fi
