#!/bin/bash
# =============================================================================
# FIX DEPLOYMENT CONFIGURATION
# Overwrites .env.local with the correct production deployment
# =============================================================================

set -e

ENV_FILE=".env.local"

cat > "$ENV_FILE" << 'EOF'
# ═══════════════════════════════════════════════════════════════════════════
# CONVEX DEPLOYMENT CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════
# 
# ⚠️  DO NOT CHANGE THESE VALUES  ⚠️
#
# The frontend (js/convex-client.js) is hardcoded to quick-whale-641.
# If you change this file, CLI and frontend will point to different DBs.
#
# This has caused production outages 3+ times (2026-02-04).
#
# If you need a dev environment, use a SEPARATE project directory.
# ═══════════════════════════════════════════════════════════════════════════

CONVEX_DEPLOYMENT=prod:quick-whale-641
CONVEX_URL=https://quick-whale-641.convex.cloud
EOF

echo "✅ Fixed .env.local → prod:quick-whale-641"
echo ""
echo "Validating..."
./scripts/validate-deployment.sh
