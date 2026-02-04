# ⚠️ DEPLOYMENT CONFIGURATION ⚠️

## THE ONE RULE

**CLI and frontend MUST use the same Convex deployment.**

```
Deployment: aromatic-trout-929 (dev)
URL: https://aromatic-trout-929.convex.cloud
```

**NOTE:** This project uses the DEV deployment, not prod.

## Why This Matters

If `.env.local` and `js/convex-client.js` point to different deployments:
- Agents report status to Database A (via CLI)
- Dashboard displays Database B (via frontend)
- **Result: No data appears to sync. Dashboard looks broken.**

**This has caused 3+ production outages as of 2026-02-04.**

## Before ANY Convex Command

```bash
cd ~/clawd/projects/abbe-command-center
./scripts/validate-deployment.sh
```

## If Validation Fails

```bash
./scripts/fix-deployment.sh
```

## Required .env.local Contents

```
CONVEX_DEPLOYMENT=dev:aromatic-trout-929
CONVEX_URL=https://aromatic-trout-929.convex.cloud
```

## What Creates This Problem

1. Running `npx convex dev` creates a NEW deployment and overwrites `.env.local`
2. Someone changes `.env.local` to point to a dev deployment
3. Copy-pasting from another Convex project

## Safe Convex Commands

Use the wrapper script that validates first:

```bash
./scripts/convex run agents:list '{}'
./scripts/convex deploy --yes
```

Or validate manually before any `npx convex` command:

```bash
./scripts/validate-deployment.sh && npx convex run agents:list '{}'
```

## For Development

If you need a separate dev environment:
1. Clone the repo to a DIFFERENT directory
2. Use `npx convex dev` there (creates new deployment)
3. **Never mix dev/prod in the same directory**

## Files That Must Match

| File | Must Contain |
|------|--------------|
| `.env.local` | `CONVEX_DEPLOYMENT=dev:aromatic-trout-929` |
| `.env.local` | `CONVEX_URL=https://aromatic-trout-929.convex.cloud` |
| `js/convex-client.js` | `const CONVEX_URL = "https://aromatic-trout-929.convex.cloud"` |

If any of these differ, the dashboard breaks.

## IMPORTANT: Use `npx convex dev` NOT `deploy`

- `npx convex dev --once` → pushes to aromatic-trout-929 (correct)
- `npx convex deploy` → pushes to quick-whale-641 (WRONG - don't use)
