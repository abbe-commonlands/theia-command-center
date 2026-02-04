/**
 * Activity Log - Newspaper Editorial Style
 * Real-time feed of agent activity
 */

const AGENT_ICONS = {
  'Abbe': '🧠',
  'Seidel': '💼',
  'Iris': '🎨',
  'Theia': '🔮',
  'Photon': '📸',
  'Zernike': '💻',
  'Ernst': '✅',
  'Kanban': '📋',
  'Deming': '📊',
  'Max': '👤',
  'unknown': '❓'
};

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

let activityData = [];
let useConvex = false;
let filterCompletionsOnly = false;

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
}

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
  
  // Sort groups by date descending, then activities within each group
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

function renderActivityLog() {
  const container = document.getElementById('activity-log');
  if (!container) return;
  
  const filterAgent = document.getElementById('log-filter-agent')?.value || '';
  const filterType = document.getElementById('log-filter-type')?.value || '';
  
  let filtered = activityData;
  
  // Completions only filter
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
  
  // Update summary counts
  updateActivitySummary();
  
  // Update badge
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
            
            // Parse metadata
            let metadata = activity.metadata;
            if (typeof metadata === 'string') {
              try { metadata = JSON.parse(metadata); } catch (e) { metadata = null; }
            }
            
            // Build context section
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
            
            // First entry of the day gets drop cap styling (via class)
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

function addActivity(activity) {
  const newActivity = {
    id: `act_${Date.now()}`,
    _creationTime: Date.now(),
    ...activity
  };
  
  activityData.unshift(newActivity);
  
  // Persist to localStorage as backup
  localStorage.setItem('activities', JSON.stringify(activityData.slice(0, 500)));
  
  // If Convex available, also save there
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

function log(activity) {
  // Alias for addActivity
  addActivity(activity);
}

function clearActivityLog() {
  if (confirm('Clear all activity logs?')) {
    activityData = [];
    localStorage.removeItem('activities');
    renderActivityLog();
  }
}

function populateAgentFilter() {
  const select = document.getElementById('log-filter-agent');
  if (!select) return;
  
  const agents = [
    { name: 'Abbe', icon: '🧠' },
    { name: 'Zernike', icon: '💻' },
    { name: 'Seidel', icon: '💼' },
    { name: 'Iris', icon: '🎨' },
    { name: 'Photon', icon: '📸' },
    { name: 'Deming', icon: '📊' },
    { name: 'Ernst', icon: '✅' },
    { name: 'Theia', icon: '🔮' },
    { name: 'Kanban', icon: '📋' },
  ];
  
  agents.forEach(agent => {
    const option = document.createElement('option');
    option.value = agent.name;
    option.textContent = `${agent.icon} ${agent.name}`;
    select.appendChild(option);
  });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  populateAgentFilter();
  
  if (window.Convex && window.Convex.isReady && window.Convex.isReady()) {
    useConvex = true;
    setupRealtimeActivities();
    console.log("📋 Activity Log: Using Convex (real-time)");
    loadActivityLog();
  } else {
    console.log("📋 Activity Log: Waiting for Convex initialization...");
  }
  
  document.getElementById('refresh-log-btn')?.addEventListener('click', loadActivityLog);
  document.getElementById('clear-log-btn')?.addEventListener('click', clearActivityLog);
  document.getElementById('log-filter-agent')?.addEventListener('change', renderActivityLog);
  document.getElementById('log-filter-type')?.addEventListener('change', renderActivityLog);
  document.getElementById('filter-completions-btn')?.addEventListener('click', toggleCompletionsFilter);
});

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

function toggleCompletionsFilter() {
  filterCompletionsOnly = !filterCompletionsOnly;
  
  const btn = document.getElementById('filter-completions-btn');
  if (btn) {
    btn.classList.toggle('active', filterCompletionsOnly);
  }
  
  renderActivityLog();
}

// Export
window.ActivityLog = {
  add: addActivity,
  log: log,
  load: loadActivityLog,
  clear: clearActivityLog,
  render: renderActivityLog,
  isRealtime: () => useConvex,
  toggleCompletions: toggleCompletionsFilter,
};
