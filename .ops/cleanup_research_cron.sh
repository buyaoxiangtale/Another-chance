#!/usr/bin/env bash
# cleanup_research_cron.sh
set -euo pipefail
echo "Cleaning up research cron entries..."
crontab -l 2>/dev/null | grep -v 'gushi.*research' | crontab -
echo "✅ Research cron entries removed"
