#!/usr/bin/env bash
# Generate daily research todo from blueprint checklist
# Usage: bash .ops/generate_daily_research_todo.sh
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CHECKLIST="$REPO_DIR/Docs/researches/blueprint_checklist.md"
TODAY=$(date +%Y%m%d)
TODO="$REPO_DIR/Docs/researches/todos_${TODAY}.md"

if [[ ! -f "$CHECKLIST" ]]; then
  echo "❌ Checklist not found: $CHECKLIST"
  exit 1
fi

DONE=$(grep -c '^\- \[x\]' "$CHECKLIST" || true)
PENDING=$(grep -c '^\- \[ \]' "$CHECKLIST" || true)
PENDING_DIRS=$(grep '^\- \[ \] \[DIR\]' "$CHECKLIST" | wc -l || true)
PENDING_FILES=$(grep '^\- \[ \] \[FILE\]' "$CHECKLIST" | wc -l || true)

{
  echo "# Research Todo — $TODAY"
  echo ""
  echo "- Done: $DONE"
  echo "- Pending: $PENDING (dirs: $PENDING_DIRS, files: $PENDING_FILES)"
  echo ""

  if [[ "$PENDING" -eq 0 ]]; then
    echo "🎉 All research items completed!"
  else
    echo "## Pending Items"
    echo ""
    grep '^\- \[ \]' "$CHECKLIST"
  fi
} > "$TODO"

echo "✅ Todo generated: $TODO"
