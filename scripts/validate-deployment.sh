#!/bin/bash
# Validate that the browser Convex URL matches where npx convex run writes data.
# Run this after any Convex config change to prevent data split.

set -euo pipefail

EXPECTED_URL="https://aromatic-trout-929.convex.cloud"

# 1. Check what URL the browser uses
BROWSER_URL=$(grep -o 'https://[a-z0-9-]*\.convex\.cloud' js/convex-client.js | head -1)
echo "Browser URL:  $BROWSER_URL"

# 2. Check what npx convex run targets by querying both
echo ""
echo "Checking data freshness..."

CLI_COUNT=$(npx convex run agents:list '{}' 2>/dev/null | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")
HTTP_COUNT=$(curl -s "$BROWSER_URL/api/query" -H "Content-Type: application/json" -d '{"path":"agents:list","args":{}}' | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('value',[])))")

echo "CLI agents:   $CLI_COUNT"
echo "HTTP agents:  $HTTP_COUNT"

if [ "$CLI_COUNT" != "$HTTP_COUNT" ]; then
  echo ""
  echo "🚨 DATA SPLIT DETECTED!"
  echo "   CLI (npx convex run) and browser (HTTP API) see different data."
  echo "   Browser URL ($BROWSER_URL) does not match where CLI writes."
  echo ""
  echo "   Fix: Update CONVEX_URL in js/convex-client.js to match the active deployment."
  echo "   Run: npx convex dashboard  — to see which project the CLI targets."
  exit 1
fi

if [ "$BROWSER_URL" != "$EXPECTED_URL" ]; then
  echo ""
  echo "⚠️  Browser URL is $BROWSER_URL but expected $EXPECTED_URL"
  echo "   Update if the active deployment has changed."
  exit 1
fi

echo ""
echo "✅ Deployment validated. Browser and CLI target the same Convex instance."
echo "   URL: $BROWSER_URL | Agents: $CLI_COUNT"
