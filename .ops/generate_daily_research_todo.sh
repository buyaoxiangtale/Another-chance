#!/usr/bin/env bash
# generate_daily_research_todo.sh
set -euo pipefail
REPO="/home/pjlab/fbh/fbh_project/gushi"
CHECKLIST="$REPO/Docs/researches/blueprint_checklist.md"
TODO="$REPO/Docs/researches/todos_$(date +%Y%m%d).md"
TMP=$(mktemp)

mkdir -p "$REPO/Docs/researches"

DONE=$(grep -c '^\- \[x\]' "$CHECKLIST" 2>/dev/null || echo 0)
PENDING=$(grep -c '^\- \[ \]' "$CHECKLIST" 2>/dev/null || echo 0)

cat > "$TMP" <<EOF
# Research Todo — $(date +%Y-%m-%d)

Summary: ✅ $DONE done · ⏳ $PENDING pending
EOF

if [[ "$PENDING" -eq 0 ]]; then
  echo "" >> "$TMP"
  echo "🎉 All research items completed!" >> "$TMP"
else
  echo "" >> "$TMP"
  echo "## Pending Items" >> "$TMP"
  echo "" >> "$TMP"
  grep '^\- \[ \]' "$CHECKLIST" >> "$TMP"
fi

mv "$TMP" "$TODO"
echo "✅ Todo generated: $TODO"
