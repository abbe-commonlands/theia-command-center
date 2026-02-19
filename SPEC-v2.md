# Abbe Command Center v2 — Upgrade Spec

**Date:** 2026-02-18
**Author:** Abbe (reviewed by Max)
**Status:** Approved for implementation

---

## Overview

Upgrade the Abbe Command Center with three new features, remove misplaced QMS code, and replace the Knowledge Map with a practical Memory Browser. Based on analysis of current gaps and industry best practices.

**Stack:** Vanilla HTML/CSS/JS frontend + Convex backend (deployed on Vercel)
**Repo:** CommonlandsAbbe/abbe-command-center
**Live:** https://abbe-command-center.vercel.app/

---

## Change 1: Remove QMS Integration (Wrong Project)

QMS (RMA tracking + training records) was pushed to this repo by mistake. It belongs in the Commonlands Operating System (dashboard.commonlands.com), not the agent command center.

### Files to Remove
- `convex/rma.ts` (399 lines)
- `convex/training.ts` (388 lines)
- `scripts/seed-training.js`
- Any QMS-related sections in `index.html`

### Schema Changes (`convex/schema.ts`)
Remove these table definitions:
- `rmaRecords`
- `qualityKPIs`
- `employees`
- `trainingCourses`
- `trainingRecords`

Keep all agent/task/activity/document/notification/permission tables.

### ⚠️ Convex Migration
Removing tables from the schema requires that the tables are empty in production. Before pushing the schema change:
1. Check if any data exists: `npx convex run` a query against each table
2. If data exists, back it up, then delete all rows
3. Then push the schema change

---

## Change 2: Calendar View (New Tab)

### Purpose
Visual calendar showing all scheduled cron jobs, agent heartbeats, and planned tasks. Gives Max at-a-glance visibility into what's scheduled and whether jobs are firing correctly.

### Navigation
Add a new tab to the header nav:
```html
<button class="nav-tab" data-tab="calendar" role="tab" aria-selected="false" aria-controls="calendar-screen">
  <span>📅</span>
  <span>Calendar</span>
</button>
```

Position it after Mission Control, before Documents.

### UI Layout
- **Month/week/day toggle** at top (default: week view)
- **Calendar grid** showing:
  - Cron job schedules (recurring events shown as repeating blocks)
  - One-shot scheduled tasks (from tasks table where `dueAt` is set)
  - Agent heartbeat windows (shown as subtle background bands)
- **Event detail panel** on click:
  - Job name, schedule expression, last run time, last result (success/fail)
  - For tasks: title, assignee, priority, status

### Convex Schema Addition
```typescript
// New table: scheduled events (synced from OpenClaw cron)
scheduledEvents: defineTable({
  name: v.string(),
  type: v.union(v.literal("cron"), v.literal("task"), v.literal("heartbeat")),
  schedule: v.string(),        // cron expression or ISO timestamp
  scheduleKind: v.union(v.literal("cron"), v.literal("at"), v.literal("every")),
  agentId: v.optional(v.id("agents")),
  agentName: v.optional(v.string()),
  taskId: v.optional(v.id("tasks")),
  enabled: v.boolean(),
  lastRunAt: v.optional(v.number()),
  lastRunResult: v.optional(v.union(v.literal("success"), v.literal("failure"))),
  lastRunDurationMs: v.optional(v.number()),
  nextRunAt: v.optional(v.number()),
  metadata: v.optional(v.any()),
})
  .index("by_type", ["type"])
  .index("by_agent", ["agentId"])
  .index("by_nextRun", ["nextRunAt"]),
```

### Convex Mutations
- `scheduledEvents:upsert` — Create or update a scheduled event
- `scheduledEvents:list` — List all events (with optional type filter)
- `scheduledEvents:recordRun` — Log a run result (update lastRunAt, lastRunResult, nextRunAt)
- `scheduledEvents:remove` — Delete an event

### Frontend
- New file: `js/calendar.js`
- Use a simple CSS grid calendar (no external libs). Week view = 7 columns × 24 rows.
- Color-code by type: cron=blue, task=amber, heartbeat=gray
- Show a "last 24h run history" bar at the bottom with green/red dots per job

### Agent Integration
Agents should call `scheduledEvents:upsert` when they create cron jobs via OpenClaw, and `scheduledEvents:recordRun` on completion. Add this to the mission-control SKILL.md protocol.

---

## Change 3: Memory Browser (Replaces Knowledge Map)

### Purpose
Replace the 3D Knowledge Map (cool but not practical) with a searchable, browsable memory viewer that surfaces MEMORY.md + memory/*.md from all agent workspaces.

### Navigation
Replace the Knowledge Map tab:
```html
<!-- Was: Knowledge Map -->
<button class="nav-tab" data-tab="memory" role="tab" aria-selected="false" aria-controls="memory-screen">
  <span>🧠</span>
  <span>Memory</span>
</button>
```

### UI Layout
- **Search bar** at top (full-text search across all memories)
- **Filter pills**: All | Abbe | Zernike | Seidel | Iris | Kanban | Deming | By Date
- **Memory list** (left 60%):
  - Cards showing: source file, agent, date, preview snippet
  - Sorted by date (newest first)
  - Infinite scroll or pagination
- **Memory detail** (right 40%):
  - Full markdown content rendered as HTML
  - Source path shown
  - "Jump to section" links for MEMORY.md headers

### Convex Schema Addition
```typescript
// Memory entries - synced from agent workspace files
memories: defineTable({
  agentName: v.string(),
  agentId: v.optional(v.id("agents")),
  sourcePath: v.string(),       // e.g. "~/clawd/memory/2026-02-18.md"
  sourceType: v.union(v.literal("daily"), v.literal("longterm"), v.literal("working")),
  content: v.string(),          // Raw markdown content
  date: v.number(),             // Timestamp (from filename or file mod time)
  sections: v.optional(v.array(v.object({
    heading: v.string(),
    content: v.string(),
  }))),
  searchText: v.string(),       // Lowercase content for search
})
  .index("by_agent", ["agentName"])
  .index("by_date", ["date"])
  .index("by_type", ["sourceType"])
  .searchIndex("search_content", {
    searchField: "searchText",
    filterFields: ["agentName", "sourceType"],
  }),
```

### Convex Functions
- `memories:search` — Full-text search with optional agent/type filters
- `memories:list` — Paginated list with filters
- `memories:sync` — Upsert a memory entry (called by agents during sleep protocol)
- `memories:get` — Get single memory by ID

### Frontend
- New file: `js/memory-browser.js`
- Remove: `js/embedding-viz.js`, `js/memory-viz.js`
- Render markdown as HTML using a lightweight parser (marked.js or similar — add via CDN)
- Search should be near-instant using Convex's built-in search indexes

### Agent Integration
Add to sleep protocol: agents sync their MEMORY.md and today's daily note to Convex via `memories:sync`. This keeps the browser up to date without polling the filesystem.

### Files to Remove
- `js/embedding-viz.js` (524 lines)
- `js/memory-viz.js` (277 lines)
- `scripts/generate-embeddings.js`
- Three.js and UMAP CDN imports from `index.html`

---

## Change 4: Agent Session Dashboard (Enhance Squad Sidebar)

### Purpose
Upgrade the existing squad sidebar from simple status indicators to a richer session dashboard showing context burn rate, recent actions, and session history.

### UI Changes to Mission Control Screen

#### Enhanced Agent Cards (in sidebar)
Current: name, emoji, status dot, last active time
New additions:
- **Context meter**: Visual bar showing token usage % (green < 60%, yellow 60-80%, red > 80%)
- **Session duration**: "Active for 23m" or "Idle 2h ago"
- **Last action**: One-line summary of most recent activity
- **Expand arrow**: Click to see full session detail

#### Agent Detail Modal (on card click)
- **Session History** (last 7 days): List of sessions with start/end times, context usage, sleep notes
- **Action Timeline**: Last 20 activities for this agent (from activities table)
- **Context Trend**: Simple sparkline or bar chart showing context % over last 10 sessions
- **Current Task**: If assigned, show task detail inline

### Convex Schema Addition
```typescript
// Session history - one row per agent wake/sleep cycle
sessionHistory: defineTable({
  agentId: v.id("agents"),
  agentName: v.string(),
  startedAt: v.number(),
  endedAt: v.optional(v.number()),
  contextUsed: v.optional(v.number()),
  contextCap: v.optional(v.number()),
  contextPercent: v.optional(v.number()),
  workingOn: v.optional(v.string()),
  nextSteps: v.optional(v.string()),
  activitiesCount: v.optional(v.number()),
})
  .index("by_agent", ["agentId"])
  .index("by_agent_time", ["agentId", "startedAt"]),
```

### Convex Changes
- Modify `agents:updateStatus` — When status changes to "active", create a new `sessionHistory` row
- Modify `agents:sleep` — Update the current `sessionHistory` row with endedAt and context stats
- New query: `sessionHistory:listByAgent` — Get recent sessions for an agent

### Frontend
- Modify `js/mission.js` — Enhance `renderAgentsCompact()` with context meters and expanded detail
- Add sparkline rendering (pure CSS or tiny inline SVG — no chart library needed)

---

## Implementation Order

1. **Remove QMS** (smallest, clears dead code) → PR #1
2. **Agent Session Dashboard** (enhances existing UI, no new tabs) → PR #2
3. **Calendar View** (new tab + schema) → PR #3
4. **Memory Browser** (new tab, replaces Knowledge Map) → PR #4

Each PR should be independently deployable. Schema changes should be backward-compatible (additive only, except QMS removal which needs data cleanup first).

---

## Files Summary

### Remove
- `convex/rma.ts`
- `convex/training.ts`
- `scripts/seed-training.js`
- `js/embedding-viz.js`
- `js/memory-viz.js`
- `scripts/generate-embeddings.js`
- QMS sections in `index.html`
- Three.js / UMAP CDN imports

### New
- `js/calendar.js`
- `js/memory-browser.js`

### Modify
- `convex/schema.ts` (remove QMS tables, add scheduledEvents + memories + sessionHistory)
- `convex/agents.ts` (session history integration in updateStatus + sleep)
- `index.html` (new tabs, remove QMS/Knowledge Map sections)
- `js/mission.js` (enhanced agent cards)
- `js/app.js` (init new tabs)
- `css/styles.css` (calendar + memory browser styles)

---

## Non-Goals
- No virtual office / pixel art (fun but low ROI)
- No content pipeline (we're optics, not content creators)
- No external dependencies beyond Convex SDK + marked.js CDN
- No Tauri/desktop — stays as Vercel-hosted web app
