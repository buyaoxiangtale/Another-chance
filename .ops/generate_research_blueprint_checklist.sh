#!/usr/bin/env bash
# generate_research_blueprint_checklist.sh
# 为 gushi 项目生成研究清单

set -euo pipefail
REPO="/home/pjlab/fbh/fbh_project/gushi"
CHECKLIST="$REPO/Docs/researches/blueprint_checklist.md"
TMP=$(mktemp)

mkdir -p "$REPO/Docs/researches"

# Preserve existing [x] marks
declare -A done_map
if [[ -f "$CHECKLIST" ]]; then
  grep -oP '^\- \[x\] \[.*?\] (.+)$' "$CHECKLIST" | while read -r line; do
    key=$(echo "$line" | sed 's/^- \[x\] \[.*\] //')
    done_map["$key"]=1
  done
fi

echo "# Research Checklist — gushi 故事平台" > "$TMP"
echo "" >> "$TMP"
echo "研究目标：深入理解项目架构，为文生图功能集成和 API Rate Limit 优化提供全面的技术上下文。" >> "$TMP"
echo "" >> "$TMP"

# Code-only scope: src/ only, exclude node_modules, .next, etc.
cd "$REPO"

echo "## API 路由层" >> "$TMP"
find src/app/api -type f -name "*.ts" | sort | while read -r f; do
  rel="src/${f#src/}"
  mark=" "
  [[ -f "$REPO/Docs/researches/${rel//\//_}_research.md" ]] && mark="x"
  echo "- [$mark] [FILE] $rel" >> "$TMP"
done

echo "" >> "$TMP"
echo "## 核心库 (lib/)" >> "$TMP"
find src/lib -type f -name "*.ts" | sort | while read -r f; do
  rel="src/${f#src/}"
  mark=" "
  [[ -f "$REPO/Docs/researches/${rel//\//_}_research.md" ]] && mark="x"
  echo "- [$mark] [FILE] $rel" >> "$TMP"
done

echo "" >> "$TMP"
echo "## 组件层" >> "$TMP"
find src/components -type f \( -name "*.tsx" -o -name "*.ts" \) | sort | while read -r f; do
  rel="src/${f#src/}"
  mark=" "
  [[ -f "$REPO/Docs/researches/${rel//\//_}_research.md" ]] && mark="x"
  echo "- [$mark] [FILE] $rel" >> "$TMP"
done

echo "" >> "$TMP"
echo "## 类型定义" >> "$TMP"
find src/types -type f -name "*.ts" | sort | while read -r f; do
  rel="src/${f#src/}"
  mark=" "
  [[ -f "$REPO/Docs/researches/${rel//\//_}_research.md" ]] && mark="x"
  echo "- [$mark] [FILE] $rel" >> "$TMP"
done

mv "$TMP" "$CHECKLIST"
echo "✅ Checklist generated: $CHECKLIST ($(grep -c '^\- \[ \]' "$CHECKLIST") pending)"
