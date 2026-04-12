#!/bin/bash
# Setup isolated automation repo for execution cron
cd /home/pjlab/fbh/fbh_project/gushi

# Create automation clone directory
AUTO_DIR=".cron/automation_repo"
rm -rf "$AUTO_DIR"
mkdir -p "$AUTO_DIR"

# Copy source files (exclude .git, .cron, node_modules)
rsync -a --exclude='.git' --exclude='.cron' --exclude='node_modules' --exclude='.next' ./ "$AUTO_DIR/"
cd "$AUTO_DIR"
git init && git add -A && git commit -m "init: automation repo snapshot" --quiet 2>/dev/null
echo "Automation repo ready at $AUTO_DIR"
