#!/usr/bin/env bash
# pg_dump 备份脚本
# 用法:
#   ./scripts/backup-db.sh          # 备份到 backups/ 目录
#   ./scripts/backup-db.sh restore  # 恢复最新的备份
#
# 自动检测容器：优先用 docker-compose 的 gushi-postgres，其次用 medical-postgres

set -euo pipefail

BACKUP_DIR="$(cd "$(dirname "$0")/.." && pwd)/backups"
mkdir -p "$BACKUP_DIR"

DB_NAME="gushi_dev"
DB_USER="gushi"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/gushi_${TIMESTAMP}.sql.gz"

# 检测 PostgreSQL 容器
CONTAINER=""
for c in gushi-postgres medical-postgres; do
  if docker ps --format '{{.Names}}' | grep -qx "$c"; then
    CONTAINER="$c"
    break
  fi
done

if [ -z "$CONTAINER" ]; then
  echo "[ERROR] 未找到运行中的 PostgreSQL 容器"
  exit 1
fi

echo "[INFO] 使用容器: $CONTAINER"

# ---------- 备份 ----------
backup() {
  echo "[INFO] 开始备份数据库 $DB_NAME ..."
  docker exec "$CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" --clean --if-exists | gzip > "$BACKUP_FILE"
  local size
  size=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "[OK] 备份完成: $BACKUP_FILE ($size)"

  # 清理超过 30 天的旧备份
  find "$BACKUP_DIR" -name "gushi_*.sql.gz" -mtime +30 -delete 2>/dev/null && \
    echo "[INFO] 已清理 30 天前的旧备份"
}

# ---------- 恢复 ----------
restore() {
  local file="${2:-}"
  if [ -z "$file" ]; then
    file=$(ls -t "$BACKUP_DIR"/gushi_*.sql.gz 2>/dev/null | head -1)
  fi

  if [ -z "$file" ]; then
    echo "[ERROR] 没有找到备份文件"
    exit 1
  fi

  echo "[WARN] 即将从 $file 恢复数据库（会覆盖现有数据）"
  read -rp "确认继续？[y/N] " confirm
  if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "[INFO] 已取消"
    exit 0
  fi

  echo "[INFO] 恢复中..."
  gunzip -c "$file" | docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME"
  echo "[OK] 恢复完成"
}

# ---------- 列表 ----------
list_backups() {
  echo "可用备份:"
  ls -lht "$BACKUP_DIR"/gushi_*.sql.gz 2>/dev/null || echo "  (无)"
}

# ---------- 入口 ----------
case "${1:-backup}" in
  backup)   backup ;;
  restore)  restore "$@" ;;
  list)     list_backups ;;
  *)
    echo "用法: $0 {backup|restore [文件]|list}"
    exit 1
    ;;
esac
