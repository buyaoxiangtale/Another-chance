#!/usr/bin/env bash
# Generate research blueprint checklist from repository tree
# Usage: bash .ops/generate_research_blueprint_checklist.sh
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CHECKLIST="$REPO_DIR/Docs/researches/blueprint_checklist.md"
TMPFILE=$(mktemp)

trap 'rm -f "$TMPFILE"' EXIT

# Collect existing [x] marks
declare -A DONE_MAP
if [[ -f "$CHECKLIST" ]]; then
  while IFS= read -r line; do
    if [[ "$line" =~ ^-\ \[x\] ]]; then
      # Extract path after the tag
      path=$(echo "$line" | sed 's/^- \[x\] \[DIR\] //' | sed 's/^- \[x\] \[FILE\] //')
      DONE_MAP["$path"]=1
    fi
  done < "$CHECKLIST"
fi

{
  echo "# Research Blueprint Checklist"
  echo ""
  echo "Auto-generated: $(date -Iseconds)"
  echo "Repository: $(basename "$REPO_DIR")"
  echo ""

  # Directories first, then files
  echo "## Directories"
  echo ""

  # Code directories to research
  for dir in \
    "src/app/api" \
    "src/app/story" \
    "src/app/create" \
    "src/components" \
    "src/lib" \
    "src/types" \
    "prisma" \
    "scripts" \
    "data"; do
    full="$REPO_DIR/$dir"
    if [[ -d "$full" ]]; then
      rel="${dir#/}"
      mark=" "
      [[ -v "DONE_MAP[$rel]" ]] && mark="x"
      echo "- [$mark] [DIR] $rel"
    fi
  done

  echo ""
  echo "## Files"
  echo ""

  # Key config files
  for f in \
    "prisma/schema.prisma" \
    "src/types/story.ts" \
    "src/lib/simple-db.ts" \
    "package.json" \
    "next.config.mjs" \
    "tailwind.config.ts" \
    "tsconfig.json" \
    ".env.example" \
    "capacitor.config.json" \
    "docker-compose.yml" \
    "Dockerfile" \
    "seed.js"; do
    full="$REPO_DIR/$f"
    if [[ -f "$full" ]]; then
      mark=" "
      [[ -v "DONE_MAP[$f]" ]] && mark="x"
      echo "- [$mark] [FILE] $f"
    fi
  done

  # API route files
  echo ""
  echo "## API Routes"
  echo ""

  for f in $(find "$REPO_DIR/src/app/api" -name "route.ts" -o -name "route.js" 2>/dev/null | sort); do
    rel="${f#$REPO_DIR/}"
    mark=" "
    [[ -v "DONE_MAP[$rel]" ]] && mark="x"
    echo "- [$mark] [FILE] $rel"
  done

  # Component files
  echo ""
  echo "## Components"
  echo ""

  for f in $(find "$REPO_DIR/src/components" -name "*.tsx" -o -name "*.ts" 2>/dev/null | sort); do
    rel="${f#$REPO_DIR/}"
    mark=" "
    [[ -v "DONE_MAP[$rel]" ]] && mark="x"
    echo "- [$mark] [FILE] $rel"
  done

  # Page files
  echo ""
  echo "## Pages"
  echo ""

  for f in $(find "$REPO_DIR/src/app" -maxdepth 3 -name "page.tsx" -o -name "layout.tsx" 2>/dev/null | sort); do
    rel="${f#$REPO_DIR/}"
    mark=" "
    [[ -v "DONE_MAP[$rel]" ]] && mark="x"
    echo "- [$mark] [FILE] $rel"
  done

} > "$TMPFILE"

mv "$TMPFILE" "$CHECKLIST"
echo "✅ Checklist generated: $CHECKLIST"
echo "   Items: $(grep -c '^\- \[' "$CHECKLIST")"
