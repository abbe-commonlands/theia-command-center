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
# The frontend (js/convex-client.js) is hardcoded to aromatic-trout-929.
# If you change this file, CLI and frontend will point to different DBs.
#
# This has caused production outages 3+ times (2026-02-04).
#
# NOTE: This project uses DEV deployment (aromatic-trout-929).
# The PROD deployment (aromatic-trout-929) is NOT used by the frontend.
# ═══════════════════════════════════════════════════════════════════════════

CONVEX_DEPLOYMENT=dev:aromatic-trout-929
CONVEX_URL=https://aromatic-trout-929.convex.cloud
EOF

echo "✅ Fixed .env.local → prod:aromatic-trout-929"
echo ""
echo "Validating..."
./scripts/validate-deployment.sh
