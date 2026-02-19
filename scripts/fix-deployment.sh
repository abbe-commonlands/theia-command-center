#!/bin/bash
# Fix the Convex deployment config for abbe-command-center.
#
# CANONICAL: quick-whale-641 (Convex prod)
# This is used by: frontend, agent crons, npx convex deploy
# aromatic-trout-929 is dev only.

cd "$(dirname "$0")/.." || exit 1

cat > .env.local << 'EOF'
CONVEX_DEPLOYMENT=prod:quick-whale-641
CONVEX_URL=https://quick-whale-641.convex.cloud
EOF

echo "✅ Fixed .env.local → prod:quick-whale-641"
echo "   Run 'npx convex deploy --yes' to push functions"
