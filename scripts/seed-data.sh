#!/bin/bash
# Seed real data into Convex for Calendar + Memory Browser
set -e
cd ~/clawd/projects/abbe-command-center

echo "🗓️  Seeding Calendar (scheduledEvents)..."

# Agent heartbeats
npx convex run scheduledEvents:upsert '{"name":"zernike-heartbeat","type":"heartbeat","schedule":"0 5,11,17,23 * * *","scheduleKind":"cron","agentName":"Zernike","enabled":true,"nextRunAt":1771484400000}' && echo "  ✅ zernike-heartbeat"
npx convex run scheduledEvents:upsert '{"name":"iris-heartbeat","type":"heartbeat","schedule":"0 7,13,19,1 * * *","scheduleKind":"cron","agentName":"Iris","enabled":true,"nextRunAt":1771491600000}' && echo "  ✅ iris-heartbeat"
npx convex run scheduledEvents:upsert '{"name":"ernst-heartbeat","type":"heartbeat","schedule":"0 3,9,15,21 * * *","scheduleKind":"cron","agentName":"Ernst","enabled":true,"nextRunAt":1771498800000}' && echo "  ✅ ernst-heartbeat"
npx convex run scheduledEvents:upsert '{"name":"seidel-heartbeat","type":"heartbeat","schedule":"20 3,9,15,21 * * *","scheduleKind":"cron","agentName":"Seidel","enabled":true,"nextRunAt":1771500000000}' && echo "  ✅ seidel-heartbeat"
npx convex run scheduledEvents:upsert '{"name":"kanban-heartbeat","type":"heartbeat","schedule":"40 3,9,15,21 * * *","scheduleKind":"cron","agentName":"Kanban","enabled":true,"nextRunAt":1771501200000}' && echo "  ✅ kanban-heartbeat"
npx convex run scheduledEvents:upsert '{"name":"deming-heartbeat","type":"heartbeat","schedule":"50 3,9,15,21 * * *","scheduleKind":"cron","agentName":"Deming","enabled":true,"nextRunAt":1771501800000}' && echo "  ✅ deming-heartbeat"
npx convex run scheduledEvents:upsert '{"name":"abbe-heartbeat","type":"heartbeat","schedule":"0 3,9,15,21 * * *","scheduleKind":"cron","agentName":"Abbe","enabled":false,"nextRunAt":1771498800000}' && echo "  ✅ abbe-heartbeat (disabled)"

# Cron jobs
npx convex run scheduledEvents:upsert '{"name":"OpenClaw Backup 2am","type":"cron","schedule":"0 2 * * *","scheduleKind":"cron","agentName":"Abbe","enabled":true,"nextRunAt":1771495200000}' && echo "  ✅ OpenClaw Backup 2am"
npx convex run scheduledEvents:upsert '{"name":"nightly-build","type":"cron","schedule":"0 23 * * *","scheduleKind":"cron","agentName":"Abbe","enabled":false}' && echo "  ✅ nightly-build (disabled)"

# One-shot task
npx convex run scheduledEvents:upsert '{"name":"Remind: fix gh workflow scope","type":"task","schedule":"2026-02-19T15:30:00.000Z","scheduleKind":"at","agentName":"Abbe","enabled":true,"nextRunAt":1771515000000}' && echo "  ✅ Reminder task"

echo ""
echo "🧠 Seeding Memory Browser (memories)..."

# Abbe MEMORY.md
ABBE_MEMORY=$(cat ~/clawd/clawd/MEMORY.md | python3 -c "import sys,json; print(json.dumps(sys.stdin.read()))")
npx convex run memories:sync "{\"agentName\":\"Abbe\",\"sourcePath\":\"~/clawd/clawd/MEMORY.md\",\"sourceType\":\"longterm\",\"content\":$ABBE_MEMORY,\"date\":$(date +%s000)}" && echo "  ✅ Abbe — MEMORY.md"

# Zernike daily note
if [ -f ~/clawd-zernike/memory/2026-02-09.md ]; then
  ZERNIKE_DAILY=$(cat ~/clawd-zernike/memory/2026-02-09.md | python3 -c "import sys,json; print(json.dumps(sys.stdin.read()))")
  npx convex run memories:sync "{\"agentName\":\"Zernike\",\"sourcePath\":\"~/clawd-zernike/memory/2026-02-09.md\",\"sourceType\":\"daily\",\"content\":$ZERNIKE_DAILY,\"date\":1739059200000}" && echo "  ✅ Zernike — 2026-02-09.md"
fi

# Zernike WORKING.md
if [ -f ~/clawd-zernike/memory/WORKING.md ]; then
  ZERNIKE_WORKING=$(cat ~/clawd-zernike/memory/WORKING.md | python3 -c "import sys,json; print(json.dumps(sys.stdin.read()))")
  npx convex run memories:sync "{\"agentName\":\"Zernike\",\"sourcePath\":\"~/clawd-zernike/memory/WORKING.md\",\"sourceType\":\"working\",\"content\":$ZERNIKE_WORKING,\"date\":$(date +%s000)}" && echo "  ✅ Zernike — WORKING.md"
fi

echo ""
echo "✨ Done! Check https://abbe-command-center.vercel.app/"
