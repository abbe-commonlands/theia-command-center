-- Mission Control Database Schema
-- Priority: 1-10 scale (10 = most urgent)

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
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
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'inbox', -- inbox, assigned, in_progress, review, done
  priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10), -- 1-10 scale
  created_by TEXT,
  assigned_to TEXT, -- comma-separated agent ids
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER,
  due_at INTEGER,
  verified_by TEXT,
  verified_at INTEGER,
  deliverables TEXT
);

-- Task assignments (many-to-many)
CREATE TABLE IF NOT EXISTS task_assignments (
  task_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  assigned_at INTEGER DEFAULT (strftime('%s', 'now')),
  PRIMARY KEY (task_id, agent_id),
  FOREIGN KEY (task_id) REFERENCES tasks(id),
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- Messages/Comments
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  from_agent_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);

-- Activity feed
CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL, -- task_created, task_assigned, task_moved, task_completed, task_verified, message_sent
  agent_id TEXT,
  task_id TEXT,
  message TEXT NOT NULL,
  metadata TEXT, -- JSON for extra data
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Event processing log
CREATE TABLE IF NOT EXISTS event_log (
  id TEXT PRIMARY KEY,
  event_file TEXT NOT NULL,
  event_type TEXT NOT NULL,
  source_agent TEXT,
  processed_at INTEGER DEFAULT (strftime('%s', 'now')),
  status TEXT DEFAULT 'processed', -- processed, rejected, pending_verification
  result TEXT
);

-- Seed agents
INSERT OR IGNORE INTO agents (id, name, role, session_key, icon) VALUES
  ('abbe', 'Abbe', 'Squad Lead / Orchestrator', 'agent:main:main', '🧠'),
  ('seidel', 'Seidel', 'Sales Operations', 'agent:sales:main', '💼'),
  ('iris', 'Iris', 'Marketing Specialist', 'agent:marketing:main', '🎨'),
  ('theia', 'Theia', 'Engineering/Optical Design', 'agent:engineering:main', '🔬'),
  ('photon', 'Photon', 'Operations/Data Processing', 'agent:operations:main', '⚡'),
  ('zernike', 'Zernike', 'Software Development', 'agent:softwaredeveloper:main', '💻'),
  ('ernst', 'Ernst', 'Task Verification', 'agent:ernst:main', '✓');
