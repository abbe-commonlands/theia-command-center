#!/bin/bash
# List tasks from the database
# Usage: ./list-tasks.sh [status]

DB="$HOME/clawd/projects/abbe-command-center/database/mission-control.db"
STATUS="${1:-}"

if [ ! -f "$DB" ]; then
  echo "Database not found. Run process-events.js first to initialize."
  exit 1
fi

if [ -n "$STATUS" ]; then
  sqlite3 -header -column "$DB" "SELECT id, priority, status, title, created_by FROM tasks WHERE status = '$STATUS' ORDER BY priority DESC, created_at DESC;"
else
  sqlite3 -header -column "$DB" "SELECT id, priority, status, title, created_by FROM tasks ORDER BY priority DESC, status, created_at DESC;"
fi
