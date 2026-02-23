# Build & Deploy Instructions

## Prerequisites
- Node.js 18+
- Convex account (convex.dev)
- Vercel account (or any static host)

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Initialize Convex project (creates convex.json with your deployment URL)
npx convex dev
# Follow prompts → creates a new Convex project
# Copy the deployment URL shown (https://xxx.convex.cloud)

# 3. Update index.html with your Convex URL
# In index.html, add before </body>:
# <script>window.CONVEX_URL = "https://YOUR_URL.convex.cloud";</script>
# OR set it in app.js: const CONVEX_URL = "https://YOUR_URL.convex.cloud";

# 4. Deploy Convex schema + functions
npx convex deploy
```

## Local Dev

```bash
npx convex dev   # runs Convex locally + watches for changes
# open index.html in browser (or use a local server)
python -m http.server 8080   # serve index.html locally
```

## Seed Data

After deploying Convex, run the seed script to register the three agents:

```bash
node scripts/seed-agents.js
```

Or manually via Convex dashboard, insert into `agents`:
```json
[
  { "name": "Theia",  "role": "Optical Design Lead",    "emoji": "🔭", "status": "idle", "sessionKey": "agent:main:main",   "model": "claude-sonnet-4-6" },
  { "name": "Photon", "role": "Optimization & Patents", "emoji": "⚡", "status": "idle", "sessionKey": "agent:photon:main", "model": "claude-sonnet-4-6" },
  { "name": "Quark",  "role": "Zemax Automation",       "emoji": "🔬", "status": "idle", "sessionKey": "agent:quark:main",  "model": "gpt-5.3-codex" }
]
```

## Vercel Deploy

```bash
# Push to GitHub, connect repo to Vercel
# Vercel settings: Framework = Other, Output = root directory
# No build command needed (static site)
```

## Agent Integration (OpenClaw)

Agents update their status via Convex mutations. Key calls:

```python
# Theia — update design performance after optimization
import requests
CONVEX_URL = "https://YOUR_URL.convex.cloud"

# Via Convex HTTP API
requests.post(f"{CONVEX_URL}/api/mutation", json={
  "path": "lensDesigns/updatePerformance",
  "args": {
    "id": "<designId>",
    "currentMFValue": 0.0234,
    "rmsSpotUm": 3.2,
    "zemaxFile": "C:/designs/DSL952_v3.zmx"
  }
})

# Photon — log optimization run completion
requests.post(f"{CONVEX_URL}/api/mutation", json={
  "path": "optimizationRuns/complete",
  "args": {
    "id": "<runId>",
    "status": "converged",
    "mfValueAfter": 0.0234,
    "rmsSpotAfter": 3.2,
    "iterationsCount": 147,
    "outputSummary": "Converged on retrofocus zone. TTL within budget."
  }
})

# Quark — log tolerance analysis
requests.post(f"{CONVEX_URL}/api/mutation", json={
  "path": "toleranceAnalyses/create",
  "args": {
    "designId": "<designId>",
    "designName": "DSL952 Wide-Angle M12",
    "runBy": "<quarkAgentId>",
    "runByName": "Quark",
    "yieldPercent": 94.2,
    "mfgRisk": "medium",
    "recommendation": "Tighten element 3 tilt tolerance."
  }
})
```

## File Structure

```
theia-command-center/
├── index.html              ← Main app shell, 7 tabs
├── css/styles.css          ← Precision dark theme
├── js/
│   ├── app.js              ← Tab router, Convex init, DB proxy
│   ├── mission.js          ← Mission Control (agents + tasks)
│   ├── lens-library.js     ← Lens design catalog
│   ├── patent-map.js       ← Patent landscape
│   ├── optimization-log.js ← Zemax run history
│   ├── tolerance-tracker.js← Tolerance analyses
│   ├── memory-browser.js   ← Agent memories
│   ├── log.js              ← Activity feed
│   ├── documents.js        ← Documents tab
│   ├── notifications.js    ← Notification bell
│   └── convex-client.js    ← Convex SDK loader
├── convex/
│   ├── schema.ts           ← Full schema (optical + agent tables)
│   ├── lensDesigns.ts      ← Design CRUD + queries
│   ├── optimizationRuns.ts ← Optimization run tracking
│   ├── toleranceAnalyses.ts← Tolerance analysis results
│   ├── patents.ts          ← Patent catalog + coverage heatmap
│   ├── glassSelections.ts  ← Glass map per design
│   ├── agents.ts           ← Agent registry + status
│   ├── tasks.ts            ← Task management
│   ├── activities.ts       ← Activity feed
│   ├── documents.ts        ← Document storage
│   ├── memories.ts         ← Agent memory sync
│   ├── notifications.ts    ← Notification delivery
│   └── sessionHistory.ts   ← Session wake/sleep tracking
└── BUILD-INSTRUCTIONS.md   ← This file
```
