#!/usr/bin/env node
/**
 * Ernst's Event Processor
 * Watches pending events and processes them into the task database
 */

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

// Paths
const EVENTS_DIR = path.join(os.homedir(), '.clawdbot', 'events');
const PENDING_DIR = path.join(EVENTS_DIR, 'pending');
const PROCESSED_DIR = path.join(EVENTS_DIR, 'processed');
const LOG_DIR = path.join(EVENTS_DIR, 'log');
const DB_PATH = path.join(__dirname, '..', 'database', 'mission-control.db');

// Ensure directories exist
[PENDING_DIR, PROCESSED_DIR, LOG_DIR].forEach(dir => {
  fs.mkdirSync(dir, { recursive: true });
});

// SQLite setup
let Database;
try {
  Database = require('better-sqlite3');
} catch {
  console.error('better-sqlite3 not installed. Run: npm install better-sqlite3');
  process.exit(1);
}

const db = new Database(DB_PATH);

// Initialize schema if needed
const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
if (fs.existsSync(schemaPath)) {
  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schema);
}

// Event handlers
const handlers = {
  'task.create': (event) => {
    const { title, description, suggested_priority } = event.payload;
    const taskId = `task_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    
    db.prepare(`
      INSERT INTO tasks (id, title, description, priority, created_by, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'inbox', strftime('%s', 'now'), strftime('%s', 'now'))
    `).run(taskId, title, description || '', suggested_priority || 5, event.source_agent);
    
    logActivity('task_created', event.source_agent, taskId, `Created task: ${title}`);
    return { success: true, task_id: taskId, message: `Task created: ${taskId}` };
  },

  'task.move': (event) => {
    const { task_id, new_status, notes } = event.payload;
    const validStatuses = ['inbox', 'assigned', 'in_progress', 'review', 'done'];
    
    if (!validStatuses.includes(new_status)) {
      return { success: false, message: `Invalid status: ${new_status}` };
    }
    
    // If moving to 'done', redirect to review for verification
    const actualStatus = new_status === 'done' ? 'review' : new_status;
    
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(task_id);
    if (!task) {
      return { success: false, message: `Task not found: ${task_id}` };
    }
    
    db.prepare(`
      UPDATE tasks SET status = ?, updated_at = strftime('%s', 'now') WHERE id = ?
    `).run(actualStatus, task_id);
    
    const msg = new_status === 'done' 
      ? `Moved to review for verification (requested done): ${task.title}`
      : `Moved to ${new_status}: ${task.title}`;
    
    logActivity('task_moved', event.source_agent, task_id, msg, { notes, from: task.status, to: actualStatus });
    
    if (new_status === 'done') {
      return { 
        success: true, 
        message: `Task moved to review. Ernst will verify completion.`,
        pending_verification: true 
      };
    }
    
    return { success: true, message: `Task moved to ${actualStatus}` };
  },

  'task.complete': (event) => {
    const { task_id, deliverables, verification_notes } = event.payload;
    
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(task_id);
    if (!task) {
      return { success: false, message: `Task not found: ${task_id}` };
    }
    
    // Move to review, store deliverables for Ernst to verify
    db.prepare(`
      UPDATE tasks 
      SET status = 'review', 
          deliverables = ?, 
          updated_at = strftime('%s', 'now') 
      WHERE id = ?
    `).run(JSON.stringify({ deliverables, verification_notes }), task_id);
    
    logActivity('task_review_requested', event.source_agent, task_id, 
      `Completion requested: ${task.title}`, { deliverables, verification_notes });
    
    return { 
      success: true, 
      message: `Task submitted for verification. Ernst will review deliverables.`,
      pending_verification: true 
    };
  },

  'task.verify': (event) => {
    // Only Ernst should call this
    if (event.source_agent !== 'ernst') {
      return { success: false, message: 'Only Ernst can verify task completion' };
    }
    
    const { task_id, approved, feedback } = event.payload;
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(task_id);
    
    if (!task) {
      return { success: false, message: `Task not found: ${task_id}` };
    }
    
    if (approved) {
      db.prepare(`
        UPDATE tasks 
        SET status = 'done', 
            verified_by = 'ernst',
            verified_at = strftime('%s', 'now'),
            updated_at = strftime('%s', 'now')
        WHERE id = ?
      `).run(task_id);
      
      logActivity('task_verified', 'ernst', task_id, `Verified complete: ${task.title}`);
      return { success: true, message: `Task verified and marked done` };
    } else {
      db.prepare(`
        UPDATE tasks 
        SET status = 'in_progress',
            updated_at = strftime('%s', 'now')
        WHERE id = ?
      `).run(task_id);
      
      logActivity('task_rejected', 'ernst', task_id, `Verification failed: ${feedback}`, { feedback });
      return { success: true, message: `Task returned to in_progress with feedback` };
    }
  },

  'task.comment': (event) => {
    const { task_id, content } = event.payload;
    const msgId = `msg_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    
    db.prepare(`
      INSERT INTO messages (id, task_id, from_agent_id, content, created_at)
      VALUES (?, ?, ?, ?, strftime('%s', 'now'))
    `).run(msgId, task_id, event.source_agent, content);
    
    logActivity('message_sent', event.source_agent, task_id, `Comment added`);
    return { success: true, message_id: msgId };
  },

  'task.priority': (event) => {
    // Request priority change - log for Abbe to review
    const { task_id, requested_priority, reason } = event.payload;
    
    logActivity('priority_requested', event.source_agent, task_id, 
      `Priority change requested: ${requested_priority}`, { requested_priority, reason });
    
    return { success: true, message: 'Priority change request logged for Abbe' };
  }
};

function logActivity(type, agentId, taskId, message, metadata = null) {
  const id = `act_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  db.prepare(`
    INSERT INTO activities (id, type, agent_id, task_id, message, metadata, created_at)
    VALUES (?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
  `).run(id, type, agentId, taskId, message, metadata ? JSON.stringify(metadata) : null);
}

function processEvent(filePath) {
  const filename = path.basename(filePath);
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const event = JSON.parse(content);
    
    console.log(`Processing: ${event.event_type} from ${event.source_agent}`);
    
    const handler = handlers[event.event_type];
    if (!handler) {
      console.log(`  Unknown event type: ${event.event_type}`);
      return { success: false, message: `Unknown event type: ${event.event_type}` };
    }
    
    const result = handler(event);
    console.log(`  Result: ${result.message}`);
    
    // Log to event_log table
    const logId = `log_${Date.now()}`;
    db.prepare(`
      INSERT INTO event_log (id, event_file, event_type, source_agent, status, result)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(logId, filename, event.event_type, event.source_agent, 
           result.success ? 'processed' : 'rejected', JSON.stringify(result));
    
    // Move to processed
    const destPath = path.join(PROCESSED_DIR, filename);
    fs.renameSync(filePath, destPath);
    
    return result;
  } catch (err) {
    console.error(`  Error processing ${filename}:`, err.message);
    
    // Move to log with error
    const errorPath = path.join(LOG_DIR, `error_${filename}`);
    fs.renameSync(filePath, errorPath);
    
    return { success: false, message: err.message };
  }
}

function processPending() {
  const files = fs.readdirSync(PENDING_DIR).filter(f => f.endsWith('.json'));
  
  if (files.length === 0) {
    console.log('No pending events');
    return;
  }
  
  console.log(`Processing ${files.length} pending event(s)...`);
  
  for (const file of files.sort()) {
    processEvent(path.join(PENDING_DIR, file));
  }
}

// Run
processPending();
db.close();
