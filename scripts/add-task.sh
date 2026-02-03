#!/bin/bash
# Quick task creation for agents
# Usage: ./add-task.sh "Title" "Description" [priority 1-10] [agent_id]

TITLE="$1"
DESC="${2:-}"
PRIORITY="${3:-5}"
AGENT="${4:-unknown}"

if [ -z "$TITLE" ]; then
  echo "Usage: $0 \"Title\" [\"Description\"] [priority 1-10] [agent_id]"
  exit 1
fi

TIMESTAMP=$(date +%s)
EVENT_FILE="$HOME/.clawdbot/events/pending/${TIMESTAMP}_task_create.json"

mkdir -p "$HOME/.clawdbot/events/pending"

cat > "$EVENT_FILE" << EOF
{
  "event_type": "task.create",
  "source_agent": "$AGENT",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "payload": {
    "title": "$TITLE",
    "description": "$DESC",
    "suggested_priority": $PRIORITY
  }
}
EOF

echo "✓ Task event created: $EVENT_FILE"
echo "  Run 'node scripts/process-events.js' to process into database"
