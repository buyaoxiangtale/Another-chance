#!/bin/bash
# Claude Code 对话列表 + 恢复工具
# 用法:
#   bash scripts/claude-chats.sh              # 列出最近 20 条对话
#   bash scripts/claude-chats.sh --all        # 列出全部
#   bash scripts/claude-chats.sh --tag ID 标签  # 给对话加标签备注
#   bash scripts/claude-chats.sh --find 关键词  # 搜索对话

PROJECT_DIR="$HOME/.claude/projects/-home-pjlab-fbh-fbh-project-gushi"
TAG_FILE="$PROJECT_DIR/chat-tags.tsv"
COUNT=20

# 确保 tag 文件存在
touch "$TAG_FILE"

case "${1:-}" in
  --tag)
    ID="$2"
    TAG="$3"
    if [[ -z "$ID" || -z "$TAG" ]]; then
      echo "用法: bash scripts/claude-chats.sh --tag <对话ID> <标签>"
      exit 1
    fi
    # 删除旧标签，写新标签
    grep -v "^$ID" "$TAG_FILE" > "$TAG_FILE.tmp" 2>/dev/null
    echo -e "$ID\t$TAG" >> "$TAG_FILE.tmp"
    mv "$TAG_FILE.tmp" "$TAG_FILE"
    echo "✅ 已标记: $ID → $TAG"
    ;;
  --find)
    KEYWORD="$2"
    if [[ -z "$KEYWORD" ]]; then
      echo "用法: bash scripts/claude-chats.sh --find <关键词>"
      exit 1
    fi
    echo "搜索: $KEYWORD"
    echo "─────────────────────────────────────────────────"
    for f in "$PROJECT_DIR"/*.jsonl; do
      id=$(basename "${f%.jsonl}")
      if grep -q "$KEYWORD" "$f" 2>/dev/null; then
        tag=$(grep "^$id" "$TAG_FILE" 2>/dev/null | cut -f2)
        tag_str="${tag:+ [$tag]}"
        first_msg=$(grep -m1 '"role":"user"' "$f" 2>/dev/null | python3 -c "
import sys, json
try:
    line = sys.stdin.read().strip()
    data = json.loads(line)
    content = data.get('message',{}).get('content','')
    if isinstance(content, list):
        content = content[0].get('text','') if content else ''
    print(content[:80].replace('\n',' '))
except: pass
" 2>/dev/null)
        size=$(ls -lh "$f" | awk '{print $5}')
        date=$(ls -l "$f" | awk '{print $6, $7, $8}')
        echo "$date | $size | $id$tag_str | $first_msg"
      fi
    done
    ;;
  --all)
    COUNT=9999
    ;&
  ""|--list)
    echo "最近对话 (claude -r <ID> 恢复)"
    echo "─────────────────────────────────────────────────"
    for f in $(ls -t "$PROJECT_DIR"/*.jsonl 2>/dev/null | head -n "$COUNT"); do
      id=$(basename "${f%.jsonl}")
      tag=$(grep "^$id" "$TAG_FILE" 2>/dev/null | cut -f2)
      tag_str="${tag:+ [$tag]}"
      first_msg=$(grep -m1 '"role":"user"' "$f" 2>/dev/null | python3 -c "
import sys, json
try:
    line = sys.stdin.read().strip()
    data = json.loads(line)
    content = data.get('message',{}).get('content','')
    if isinstance(content, list):
        content = content[0].get('text','') if content else ''
    print(content[:80].replace('\n',' '))
except: pass
" 2>/dev/null)
      size=$(ls -lh "$f" | awk '{print $5}')
      date=$(ls -l "$f" | awk '{print $6, $7, $8}')
      echo "$date | $size | $id$tag_str | $first_msg"
    done
    echo "─────────────────────────────────────────────────"
    echo "─────────────────────────────────────────────────"
    echo "恢复对话: claude -r <ID>"
    echo "加标签:   bash scripts/claude-chats.sh --tag <ID> <标签>"
    echo "搜索:    bash scripts/claude-chats.sh --find <关键词>"
    ;;
esac
