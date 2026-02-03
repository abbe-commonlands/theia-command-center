# Abbe Command Center — Build Instructions for Codex

## Simplified Approach

Build a **standalone web application** first. We'll wrap it in Tauri later.

## Stack
- **Vanilla HTML/CSS/JS** (or React if faster for you)
- **IndexedDB** for local storage (no server needed)
- **Tailwind via CDN** for styling
- Single HTML file that can be opened directly in browser

## What to Build

### File Structure
```
abbe-command-center/
├── index.html          # Main app entry
├── css/
│   └── styles.css      # Custom styles (Tailwind via CDN in HTML)
├── js/
│   ├── app.js          # Main app logic, routing
│   ├── db.js           # IndexedDB wrapper
│   ├── memory-viz.js   # Memory visualization screen
│   ├── mission.js      # Mission Control screen
│   └── components.js   # Reusable UI components
└── SPEC.md             # Full specification (already exists)
```

### Screen 1: Memory Visualization

Parse these paths (hardcoded for now, user can configure later):
- `~/clawd/MEMORY.md`
- `~/clawd/memory/*.md`

Since this is a web app without file system access, provide a **file upload** option or **paste text** area for now. 

Display memories as:
- Clustered cards (group by date or keyword)
- Filter by type (Decision, Learning, Fix, Entity)
- Search box
- Click to expand detail

### Screen 2: Mission Control

Use IndexedDB with these object stores:
- `agents`
- `tasks`
- `messages`
- `activities`
- `documents`

**On first load, seed the agents:**

```javascript
const DEFAULT_AGENTS = [
  { id: 'abbe', name: 'Abbe', role: 'Squad Lead / Orchestrator', sessionKey: 'agent:main:main', icon: '🧠', status: 'idle' },
  { id: 'seidel', name: 'Seidel', role: 'Sales Operations', sessionKey: 'agent:sales:main', icon: '💼', status: 'idle' },
  { id: 'iris', name: 'Iris', role: 'Marketing Specialist', sessionKey: 'agent:marketing:main', icon: '🎨', status: 'idle' },
  { id: 'theia', name: 'Theia', role: 'Engineering / Optical Design', sessionKey: 'agent:engineering:main', icon: '🔬', status: 'idle' },
  { id: 'photon', name: 'Photon', role: 'Operations / Data Processing', sessionKey: 'agent:operations:main', icon: '⚡', status: 'idle' },
  { id: 'zernike', name: 'Zernike', role: 'Software Development', sessionKey: 'agent:softwaredeveloper:main', icon: '💻', status: 'idle' },
];
```

**UI Components:**
1. Agent cards grid (shows all 6 agents with status)
2. Task board (Kanban: Inbox → Assigned → In Progress → Review → Done)
3. Task detail modal (edit, assign, comment)
4. Activity feed sidebar
5. Create task button/modal

### Navigation

Tab bar at top:
- [🧠 Memory] [🎯 Mission Control]

### Styling

- Dark theme (black/dark gray background, white text)
- Cards with subtle borders and shadows
- Accent color: blue/cyan for active elements
- Use CSS Grid for layouts

## Deliverable

A complete, working single-page web app:
1. Can be opened directly via `open index.html` or `npx serve .`
2. Both screens fully functional
3. IndexedDB persistence (data survives page refresh)
4. Clean, professional design (follow frontend-design skill guidelines)
5. No placeholder code — everything works

## Run Locally

```bash
cd ~/clawd/projects/abbe-command-center
npx serve .
# or just: open index.html
```
