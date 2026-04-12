#!/bin/bash
# Extract unchecked items from blueprint checklist
cd /home/pjlab/fbh/fbh_project/gushi
BLUEPRINT="Docs/researches/reorganization_blueprint.md"
if [ ! -f "$BLUEPRINT" ]; then echo "Blueprint not found"; exit 1; fi
echo "=== PENDING ITEMS ==="
grep -n '^- \[ \]' "$BLUEPRINT" || echo "All items completed!"
echo ""
TOTAL=$(grep -c '^- \[.\]' "$BLUEPRINT" || echo 0)
DONE=$(grep -c '^- \[x\]' "$BLUEPRINT" || echo 0)
PENDING=$((TOTAL - DONE))
echo "Progress: $DONE/$TOTAL ($PENDING pending)"
