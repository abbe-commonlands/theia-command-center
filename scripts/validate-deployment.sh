#!/bin/bash
# Validate that the local Convex config points to the correct deployment.
# CANONICAL: quick-whale-641 (Convex prod)

cd "$(dirname "$0")/.." || exit 1

EXPECTED_DEPLOYMENT="prod:quick-whale-641"
EXPECTED_URL="https://quick-whale-641.convex.cloud"

if [ ! -f .env.local ]; then
  echo "❌ .env.local missing! Run: ./scripts/fix-deployment.sh"
  exit 1
fi

CURRENT_DEPLOYMENT=$(grep CONVEX_DEPLOYMENT .env.local | cut -d= -f2)
CURRENT_URL=$(grep CONVEX_URL .env.local | cut -d= -f2)

ERRORS=0
if [ "$CURRENT_DEPLOYMENT" != "$EXPECTED_DEPLOYMENT" ]; then
  echo "❌ CONVEX_DEPLOYMENT=$CURRENT_DEPLOYMENT (expected $EXPECTED_DEPLOYMENT)"
  ERRORS=1
fi

if [ "$CURRENT_URL" != "$EXPECTED_URL" ]; then
  echo "❌ CONVEX_URL=$CURRENT_URL (expected $EXPECTED_URL)"
  ERRORS=1
fi

if [ $ERRORS -eq 0 ]; then
  echo "✅ Deployment config OK → $EXPECTED_DEPLOYMENT"
else
  echo ""
  echo "Fix with: ./scripts/fix-deployment.sh"
  exit 1
fi
