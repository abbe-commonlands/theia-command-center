#!/bin/bash
# =============================================================================
# DEPLOYMENT VALIDATION SCRIPT
# Run before ANY Convex operation to prevent deployment mismatch
# =============================================================================

set -e

EXPECTED_DEPLOYMENT="prod:quick-whale-641"
EXPECTED_URL="https://quick-whale-641.convex.cloud"
ENV_FILE=".env.local"
CLIENT_FILE="js/convex-client.js"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Validating Convex deployment configuration..."

# Check if we're in the right directory
if [ ! -f "convex/schema.ts" ]; then
    echo -e "${RED}ERROR: Not in abbe-command-center directory${NC}"
    echo "Run from: ~/clawd/projects/abbe-command-center"
    exit 1
fi

ERRORS=0

# 1. Check .env.local exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}ERROR: $ENV_FILE does not exist!${NC}"
    echo ""
    echo "Create it with:"
    echo "  CONVEX_DEPLOYMENT=$EXPECTED_DEPLOYMENT"
    echo "  CONVEX_URL=$EXPECTED_URL"
    ERRORS=$((ERRORS + 1))
else
    # 2. Check CONVEX_DEPLOYMENT
    DEPLOYMENT=$(grep "^CONVEX_DEPLOYMENT=" "$ENV_FILE" | cut -d'=' -f2 | tr -d ' ')
    if [ "$DEPLOYMENT" != "$EXPECTED_DEPLOYMENT" ]; then
        echo -e "${RED}ERROR: CONVEX_DEPLOYMENT mismatch!${NC}"
        echo "  Expected: $EXPECTED_DEPLOYMENT"
        echo "  Found:    $DEPLOYMENT"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "${GREEN}✓ CONVEX_DEPLOYMENT correct${NC}"
    fi

    # 3. Check CONVEX_URL
    URL=$(grep "^CONVEX_URL=" "$ENV_FILE" | cut -d'=' -f2 | tr -d ' ')
    if [ "$URL" != "$EXPECTED_URL" ]; then
        echo -e "${RED}ERROR: CONVEX_URL mismatch!${NC}"
        echo "  Expected: $EXPECTED_URL"
        echo "  Found:    $URL"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "${GREEN}✓ CONVEX_URL correct${NC}"
    fi
fi

# 4. Check frontend client URL
if [ -f "$CLIENT_FILE" ]; then
    CLIENT_URL=$(grep 'CONVEX_URL = "' "$CLIENT_FILE" | head -1 | sed 's/.*"\(.*\)".*/\1/')
    if [ "$CLIENT_URL" != "$EXPECTED_URL" ]; then
        echo -e "${RED}ERROR: Frontend client URL mismatch!${NC}"
        echo "  Expected: $EXPECTED_URL"
        echo "  Found:    $CLIENT_URL"
        echo "  File:     $CLIENT_FILE"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "${GREEN}✓ Frontend client URL correct${NC}"
    fi
fi

# 5. Summary
echo ""
if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${RED}  DEPLOYMENT VALIDATION FAILED - $ERRORS error(s)${NC}"
    echo -e "${RED}═══════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "The ONLY valid deployment is: $EXPECTED_DEPLOYMENT"
    echo "The ONLY valid URL is: $EXPECTED_URL"
    echo ""
    echo "To fix .env.local, run:"
    echo "  ./scripts/fix-deployment.sh"
    echo ""
    exit 1
else
    echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  ✓ DEPLOYMENT VALIDATION PASSED${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
    exit 0
fi
