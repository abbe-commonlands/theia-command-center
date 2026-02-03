# Abbe Command Center — Specification

A Tauri desktop application with two main screens:
1. **Memory Visualization** — UMAP-style clustering of memory entries
2. **Mission Control** — Agent management dashboard for coordinating AI agent swarm

## Tech Stack

- **Framework:** Tauri 2.0 (Rust backend + web frontend)
- **Frontend:** SvelteKit (or vanilla HTML/CSS/JS if simpler)
- **Database:** SQLite (via Tauri's sql plugin or better-sqlite3)
- **Styling:** Tailwind CSS
- **No external APIs** — 100% local operation

## Security Requirements

- Local-only operation (no network calls except localhost)
- No telemetry
- Sandboxed file access (read-only except for database)
- CSP: no eval(), no dynamic code
- Code-signed for macOS Gatekeeper

---

## Screen 1: Memory Visualization

### Data Sources

Parse these local files:
- `~/clawd/MEMORY.md` — Core long-term memory
- `~/clawd/memory/*.md` — Daily episodic notes
- `~/life/` — PARA-structured knowledge graph

### Features

1. **2D/3D Visualization**
   - Cluster similar memories spatially
   - Use keyword/TF-IDF clustering (no external embeddings API)
   - Pan, zoom, rotate controls
   - Toggle between 2D and 3D views

2. **Memory Cards**
   - Click to select, shift-click for multi-select
   - Sidebar shows selection details
   - Filter by type: Decisions (green), Events (purple), Entities (yellow), Notes (gray)

3. **Search**
   - Text search across all memory files
   - Highlight matching entries in visualization

4. **Timeline View**
   - Alternative view showing memories chronologically
   - Filter by date range

---

## Screen 2: Mission Control

### Agent Registry

Six AI agents, each a Clawdbot session with unique identity:

| Agent | Role | Session Key | Icon |
|-------|------|-------------|------|
| Abbe | Squad Lead / Orchestrator | agent:main:main | 🧠 |
| Seidel | Sales Operations | agent:sales:main | 💼 |
| Iris | Marketing Specialist | agent:marketing:main | 🎨 |
| Theia | Engineering/Optical Design | agent:engineering:main | 🔬 |
| Photon | Operations/Data Processing | agent:operations:main | ⚡ |
| Zernike | Software Development | agent:softwaredeveloper:main | 💻 |

### Database Schema (SQLite)

```sql
-- Agents table
CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT DEFAULT 'idle', -- idle, active, blocked
  current_task_id TEXT,
  session_key TEXT NOT NULL,
  icon TEXT,
  last_active_at INTEGER,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Tasks table
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'inbox', -- inbox, assigned, in_progress, review, done
  priority TEXT DEFAULT 'normal', -- low, normal, high, urgent
  created_by TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER,
  due_at INTEGER
);

-- Task assignments (many-to-many)
CREATE TABLE task_assignments (
  task_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  assigned_at INTEGER DEFAULT (strftime('%s', 'now')),
  PRIMARY KEY (task_id, agent_id)
);

-- Messages/Comments
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  from_agent_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (task_id) REFERENCES tasks(id),
  FOREIGN KEY (from_agent_id) REFERENCES agents(id)
);

-- Activity feed
CREATE TABLE activities (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL, -- task_created, task_assigned, message_sent, status_changed, etc.
  agent_id TEXT,
  task_id TEXT,
  message TEXT NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Documents/Deliverables
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT, -- Markdown
  type TEXT DEFAULT 'deliverable', -- deliverable, research, protocol, note
  task_id TEXT,
  created_by TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER
);
```

### Mission Control UI

#### Agent Overview Panel
- Grid of agent cards showing:
  - Name + icon
  - Current status (idle/active/blocked)
  - Current task (if any)
  - Last active timestamp
- Click agent to see detailed view

#### Task Board (Kanban)
- Columns: Inbox → Assigned → In Progress → Review → Done
- Drag-and-drop between columns
- Card shows: title, assignee(s), priority indicator, comment count
- Click card to expand task detail

#### Task Detail View
- Title, description (editable)
- Status selector
- Assignee selector (multi-select agents)
- Priority selector
- Comment thread
- Attached documents
- Activity history for this task

#### Activity Feed
- Real-time stream of all actions
- Filter by agent, task, or action type
- Shows: "[Agent] [action] [object] at [time]"

#### Create Task Modal
- Title (required)
- Description (markdown)
- Assign to agent(s)
- Set priority
- Attach documents

---

## Navigation

```
┌─────────────────────────────────────────────────────────────┐
│  🧠 Abbe Command Center                    [Memory] [Mission]│
├─────────────────────────────────────────────────────────────┤
│                                                              │
│                    [Current Screen Content]                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

- Tab navigation between Memory and Mission Control
- Badge on Mission Control tab showing unread activity count

---

## Build Instructions

```bash
# Prerequisites
# - Rust (rustup)
# - Node.js 18+
# - Tauri CLI

# Setup
cd ~/clawd/projects/abbe-command-center
npm create tauri-app@latest . -- --template svelte-ts
npm install
npm install tailwindcss postcss autoprefixer
npm install better-sqlite3 # or use tauri-plugin-sql

# Development
npm run tauri dev

# Build
npm run tauri build
```

---

## File Structure

```
abbe-command-center/
├── src/                    # Frontend (Svelte)
│   ├── routes/
│   │   ├── +layout.svelte  # Main layout with nav
│   │   ├── memory/         # Memory visualization
│   │   │   └── +page.svelte
│   │   └── mission/        # Mission control
│   │       └── +page.svelte
│   ├── lib/
│   │   ├── components/     # Reusable components
│   │   ├── stores/         # Svelte stores
│   │   └── db.ts           # Database interface
│   └── app.css             # Tailwind + global styles
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── main.rs
│   │   └── commands.rs     # Tauri commands
│   ├── tauri.conf.json
│   └── Cargo.toml
├── database/
│   └── mission-control.db  # SQLite database
├── SPEC.md                 # This file
└── package.json
```

---

## Deliverables

1. Working Tauri app with both screens
2. Memory parsing and visualization (keyword-based clustering)
3. Mission Control with full CRUD for tasks/agents/messages
4. SQLite database seeded with the 6 agents
5. README with setup and usage instructions
