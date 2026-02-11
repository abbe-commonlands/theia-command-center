/**
 * Activity Log - Newspaper Editorial Style
 * Real-time feed of agent activity with Convex-backed persistence.
 * 
 * NOTE: Do NOT auto-init on DOMContentLoaded. Convex is not ready until
 * Mission.init() completes. Instead, app.js calls ActivityLog.init() explicitly.
 */

/** @type {Object<string, string>} Agent name → emoji icon mapping */
const AGENT_ICONS = {
  'Abbe': '🧠',
  'Seidel': '🎯',
  'Iris': '📡',
  'Zernike': '💻',
  'Ernst': '📋',
  'Kanban': '📦',
  'Deming': '✅',
  'Max': '👤',
  'unknown': '❓'
};

/** @type {Object<string, {label: string, icon: string, verb: string}>} Event type metadata */
const EVENT_TYPES = {
  task_created: { label: 'New Task', icon: '📝', verb: 'created a new task' },
  task_assigned: { label: 'Assignment', icon: '🎯', verb: 'was assigned to' },
  task_moved: { label: 'Progress', icon: '➡️', verb: 'moved task to' },
  task_completed: { label: 'Completed', icon: '✅', verb: 'completed' },
  task_verified: { label: 'Verified', icon: '✓', verb: 'verified completion of' },
  task_rejected: { label: 'Returned', icon: '↩️', verb: 'returned task for revision:' },
  message_sent: { label: 'Discussion', icon: '💬', verb: 'commented on' },
  document_created: { label: 'Document', icon: '📄', verb: 'published' },
  agent_status_changed: { label: 'Status', icon: '🔄', verb: 'status changed to' },
  agent_message: { label: 'Comms', icon: '📡', verb: 'messaged' },
  mention: { label: 'Mention', icon: '📣', verb: 'mentioned' },
  priority_requested: { label: 'Priority', icon: '⚡', verb: 'requested priority change for' },
  heartbeat: { label: 'Heartbeat', icon: '💓', verb: 'checked in' },
};

/** @type {Array} Internal activity data cache */
let activityData = [];
/** @type {boolean} Whether we're using Convex for persistence */
let useConvex = false;
/** @type {boolean} Whether to filter to completions only */
let filterCompletionsOnly = false;

/**
 * Escape HTML special characters to prevent XSS.
 * @param {string} text - Raw text to escape
 * @returns {string} HTML-safe string
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

/**
 * Format a timestamp into a human-readable time string (e.g. "3:45 PM").
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @returns {string} Formatted time
 */
function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
}

/**
 * Format a timestamp into a date header string (e.g. "Today", "Yesterday", or full date).
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @returns {string} Human-friendly date label
 */
function formatDateHeader(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor((now - date) / 86400000);
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  
  return date.toLocaleDateString('en-US', { 
    weekday: 'long',
    month: 'long', 
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
}

/**
 * Group activities by date, sorted descending.
 * @param {Array} activities - Array of activity objects
 * @returns {Array<{date: number, activities: Array}>} Grouped and sorted activities
 */
function groupByDate(activities) {
  const groups = {};
  
  activities.forEach(activity => {
    const timestamp = activity._creationTime || activity.created_at * 1000 || Date.now();
    const dateKey = new Date(timestamp).toDateString();
    
    if (!groups[dateKey]) {
      groups[dateKey] = {
        date: timestamp,
        activities: []
      };
    }
    groups[dateKey].activities.push(activity);
  });
  
  return Object.values(groups)
    .sort((a, b) => b.date - a.date)
    .map(group => ({
      ...group,
      activities: group.activities.sort((a, b) => {
        const timeA = a._creationTime || a.created_at * 1000 || 0;
        const timeB = b._creationTime || b.created_at * 1000 || 0;
        return timeB - timeA;
      })
    }));
}

/**
 * Load activity log from Convex (preferred) or localStorage fallback.
 * Renders the log after loading.
 */
async function loadActivityLog() {
  try {
    if (window.Convex && window.Convex.isReady && window.Convex.isReady()) {
      useConvex = true;
      activityData = await window.Convex.activities.list(100);
    } else {
      const stored = localStorage.getItem('activities');
      if (stored) {
        activityData = JSON.parse(stored);
      }
    }
    renderActivityLog();
  } catch (err) {
    console.error('Failed to load activity log:', err);
    const stored = localStorage.getItem('activities');
    if (stored) {
      activityData = JSON.parse(stored);
      renderActivityLog();
    }
  }
}

/**
 * Set up real-time Convex subscriptions for activity updates.
 * Listens for both onChange callbacks and custom DOM events.
 */
function setupRealtimeActivities() {
  if (!window.Convex) return;
  
  window.Convex.activities.onChange((activities) => {
    console.log("🔄 Activities updated (real-time):", activities.length);
    activityData = activities;
    renderActivityLog();
    
    const badge = document.getElementById('log-count');
    if (badge) {
      badge.classList.add('pulse');
      setTimeout(() => badge.classList.remove('pulse'), 1000);
    }
  });
  
  window.addEventListener("convex:activities", (e) => {
    activityData = e.detail || [];
    renderActivityLog();
  });
}

/**
 * Render the full activity log into the #activity-log container.
 * Applies current filters (agent, type, completions-only).
 */
function renderActivityLog() {
  const container = document.getElementById('activity-log');
  if (!container) return;
  
  const filterAgent = document.getElementById('log-filter-agent')?.value || '';
  const filterType = document.getElementById('log-filter-type')?.value || '';
  
  let filtered = activityData;
  
  if (filterCompletionsOnly) {
    filtered = filtered.filter(a => 
      a.type === 'task_completed' || 
      a.type === 'task_verified' || 
      a.type === 'document_created'
    );
  }
  
  if (filterAgent) {
    filtered = filtered.filter(a => a.agentName === filterAgent || a.agent_id === filterAgent);
  }
  if (filterType) {
    filtered = filtered.filter(a => a.type === filterType);
  }
  
  updateActivitySummary();
  
  const badge = document.getElementById('log-count');
  if (badge) {
    badge.textContent = activityData.length;
  }
  
  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="log-empty">
        <p style="font-family: var(--font-serif); font-size: 1.1rem; color: var(--headline-warm);">
          No dispatches yet
        </p>
        <p style="font-size: var(--text-caption); margin-top: var(--space-sm);">
          Activity will appear here as agents work
        </p>
      </div>
    `;
    return;
  }
  
  const grouped = groupByDate(filtered);
  
  if (window.Mission && window.Mission.renderActivityCompact) {
    window.Mission.renderActivityCompact();
  }

  container.innerHTML = `
    <div class="activity-feed-editorial">
      ${useConvex ? `
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-md);">
          <span class="live-indicator">LIVE</span>
          <span style="font-size: var(--text-caption); color: var(--text-muted);">
            ${filtered.length} dispatches
          </span>
        </div>
      ` : ''}
      
      ${grouped.map((group, groupIndex) => `
        <div class="activity-date-group">
          <div class="activity-date-header">${formatDateHeader(group.date)}</div>
          
          ${group.activities.map((activity, actIndex) => {
            const eventInfo = EVENT_TYPES[activity.type] || { 
              label: activity.type, 
              icon: '📌', 
              verb: 'performed action' 
            };
            const agentName = activity.agentName || activity.agent_id || 'unknown';
            const agentIcon = AGENT_ICONS[agentName] || AGENT_ICONS.unknown;
            
            const timestamp = activity._creationTime || activity.created_at * 1000 || Date.now();
            const time = formatTime(timestamp);
            
            let metadata = activity.metadata;
            if (typeof metadata === 'string') {
              try { metadata = JSON.parse(metadata); } catch (e) { metadata = null; }
            }
            
            let context = '';
            if (metadata) {
              if (metadata.from && metadata.to) {
                context = `Status changed from <strong>${metadata.from}</strong> to <strong>${metadata.to}</strong>`;
              }
              if (metadata.feedback) {
                context = `"${escapeHtml(metadata.feedback)}"`;
              }
              if (metadata.preview) {
                context = `"${escapeHtml(metadata.preview)}..."`;
              }
              if (metadata.deliverables) {
                const truncated = metadata.deliverables.length > 80 
                  ? metadata.deliverables.slice(0, 80) + '...' 
                  : metadata.deliverables;
                context = `📦 ${escapeHtml(truncated)}`;
              }
            }
            
            const isFirstOfDay = actIndex === 0;
            
            return `
              <div class="activity-entry">
                <div class="activity-entry-icon">${agentIcon}</div>
                <div class="activity-entry-body">
                  <div class="activity-entry-headline ${isFirstOfDay && groupIndex === 0 ? '' : ''}">
                    <strong>${escapeHtml(agentName)}</strong> ${eventInfo.verb}
                    ${activity.taskTitle ? `<em>"${escapeHtml(activity.taskTitle)}"</em>` : ''}
                    ${activity.message && !activity.taskTitle ? escapeHtml(activity.message) : ''}
                  </div>
                  <div class="activity-entry-byline">
                    <span class="agent-name">${agentIcon} ${agentName}</span> reported at ${time}
                  </div>
                  ${context ? `<div class="activity-entry-context">${context}</div>` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `).join('')}
    </div>
  `;
}

/**
 * Add a new activity entry. Persists to localStorage and optionally Convex.
 * @param {Object} activity - Activity object with type, agentName, etc.
 */
function addActivity(activity) {
  const newActivity = {
    id: `act_${Date.now()}`,
    _creationTime: Date.now(),
    ...activity
  };
  
  activityData.unshift(newActivity);
  
  localStorage.setItem('activities', JSON.stringify(activityData.slice(0, 500)));
  
  if (window.Convex && window.Convex.isReady && window.Convex.isReady()) {
    window.Convex.activities.create(newActivity).catch(err => {
      console.warn('Failed to save activity to Convex:', err);
    });
  }
  
  renderActivityLog();
  
  const badge = document.getElementById('log-count');
  if (badge) {
    badge.classList.add('pulse');
    setTimeout(() => badge.classList.remove('pulse'), 1000);
  }
}

/**
 * Alias for addActivity.
 * @param {Object} activity - Activity object
 */
function log(activity) {
  addActivity(activity);
}

/**
 * Clear all activity logs after user confirmation.
 */
function clearActivityLog() {
  if (confirm('Clear all activity logs?')) {
    activityData = [];
    localStorage.removeItem('activities');
    renderActivityLog();
  }
}

/**
 * Populate the agent filter dropdown with known agents.
 */
function populateAgentFilter() {
  const select = document.getElementById('log-filter-agent');
  if (!select) return;
  
  const agents = [
    { name: 'Abbe', icon: '🧠' },
    { name: 'Zernike', icon: '💻' },
    { name: 'Seidel', icon: '🎯' },
    { name: 'Iris', icon: '📡' },
    { name: 'Deming', icon: '✅' },
    { name: 'Ernst', icon: '📋' },
    { name: 'Kanban', icon: '📦' },
  ];
  
  agents.forEach(agent => {
    const option = document.createElement('option');
    option.value = agent.name;
    option.textContent = `${agent.icon} ${agent.name}`;
    select.appendChild(option);
  });
}

/**
 * Update the activity summary counters (today's events, verified, comments).
 */
function updateActivitySummary() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();
  
  const todayActivities = activityData.filter(a => {
    const timestamp = a._creationTime || a.created_at * 1000 || 0;
    return timestamp >= todayMs;
  });
  
  const todayVerified = todayActivities.filter(a => a.type === 'task_verified').length;
  const todayComments = todayActivities.filter(a => a.type === 'message_sent').length;
  
  const todayActivityCount = document.getElementById('today-activity-count');
  const todayVerifiedCount = document.getElementById('today-verified-count');
  const todayCommentsCount = document.getElementById('today-comments-count');
  
  if (todayActivityCount) todayActivityCount.textContent = `${todayActivities.length} events`;
  if (todayVerifiedCount) todayVerifiedCount.textContent = `${todayVerified} tasks`;
  if (todayCommentsCount) todayCommentsCount.textContent = `${todayComments} messages`;
}

/**
 * Toggle the completions-only filter and re-render.
 */
function toggleCompletionsFilter() {
  filterCompletionsOnly = !filterCompletionsOnly;
  
  const btn = document.getElementById('filter-completions-btn');
  if (btn) {
    btn.classList.toggle('active', filterCompletionsOnly);
  }
  
  renderActivityLog();
}

/**
 * Explicitly initialize the ActivityLog module.
 * Must be called AFTER Convex is initialized (i.e., after Mission.init()).
 */
function initActivityLog() {
  populateAgentFilter();
  
  if (window.Convex && window.Convex.isReady && window.Convex.isReady()) {
    useConvex = true;
    setupRealtimeActivities();
    console.log("📋 Activity Log: Using Convex (real-time)");
  } else {
    console.log("📋 Activity Log: No Convex available, using localStorage");
  }
  
  loadActivityLog();
  
  document.getElementById('refresh-log-btn')?.addEventListener('click', loadActivityLog);
  document.getElementById('clear-log-btn')?.addEventListener('click', clearActivityLog);
  document.getElementById('log-filter-agent')?.addEventListener('change', renderActivityLog);
  document.getElementById('log-filter-type')?.addEventListener('change', renderActivityLog);
  document.getElementById('filter-completions-btn')?.addEventListener('click', toggleCompletionsFilter);
}

/**
 * Replace the internal activity data cache (used by real-time subscriptions).
 * @param {Array} data - Fresh activity data from Convex
 */
function setData(data) {
  activityData = data;
}

// Export
window.ActivityLog = {
  init: initActivityLog,
  add: addActivity,
  log: log,
  load: loadActivityLog,
  clear: clearActivityLog,
  render: renderActivityLog,
  isRealtime: () => useConvex,
  toggleCompletions: toggleCompletionsFilter,
  getData: () => activityData,
  setData: setData,
};
