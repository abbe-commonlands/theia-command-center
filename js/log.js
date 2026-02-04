/**
 * Activity Log - Agent-to-agent interaction viewer
 * Now with Convex real-time support
 */

const AGENT_ICONS = {
  'Abbe': '🧠',
  'Seidel': '💼',
  'Iris': '🎨',
  'Theia': '🔬',
  'Photon': '⚙️',
  'Zernike': '💻',
  'Ernst': '✓',
  'Kanban': '📦',
  'Deming': '✅',
  'unknown': '❓'
};

const EVENT_LABELS = {
  task_created: { label: 'Created Task', color: '#10B981' },
  task_assigned: { label: 'Assigned', color: '#6366F1' },
  task_moved: { label: 'Moved Task', color: '#6366F1' },
  task_completed: { label: 'Completed', color: '#10B981' },
  task_verified: { label: 'Verified ✓', color: '#10B981' },
  task_rejected: { label: 'Returned ✗', color: '#EF4444' },
  message_sent: { label: 'Comment', color: '#8B5CF6' },
  document_created: { label: 'Document', color: '#8B5CF6' },
  agent_status_changed: { label: 'Status', color: '#6B7280' },
  mention: { label: '@Mention', color: '#F59E0B' },
  priority_requested: { label: 'Priority Request', color: '#F59E0B' }
};

let activityData = [];
let useConvex = false;

async function loadActivityLog() {
  try {
    // Try Convex first (must be both available AND initialized)
    if (window.Convex && window.Convex.isReady && window.Convex.isReady()) {
      useConvex = true;
      activityData = await window.Convex.activities.list(100);
    } else {
      // Fallback to localStorage
      const stored = localStorage.getItem('activities');
      if (stored) {
        activityData = JSON.parse(stored);
      }
    }
    renderActivityLog();
  } catch (err) {
    console.error('Failed to load activity log:', err);
    // Fallback to localStorage
    const stored = localStorage.getItem('activities');
    if (stored) {
      activityData = JSON.parse(stored);
      renderActivityLog();
    }
  }
}

function setupRealtimeActivities() {
  if (!window.Convex) return;
  
  // Subscribe to real-time activity updates
  window.Convex.activities.onChange((activities) => {
    console.log("🔄 Activities updated (real-time):", activities.length);
    activityData = activities;
    renderActivityLog();
    
    // Flash the log badge
    const badge = document.getElementById('log-count');
    if (badge) {
      badge.classList.add('pulse');
      setTimeout(() => badge.classList.remove('pulse'), 1000);
    }
  });
  
  // Also listen for custom events
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
  
  if (filterAgent) {
    filtered = filtered.filter(a => a.agentName === filterAgent || a.agent_id === filterAgent);
  }
  if (filterType) {
    filtered = filtered.filter(a => a.type === filterType);
  }
  
  // Sort by timestamp descending (Convex uses _creationTime)
  filtered.sort((a, b) => {
    const timeA = a._creationTime || a.created_at || 0;
    const timeB = b._creationTime || b.created_at || 0;
    return timeB - timeA;
  });
  
  // Update badge
  const badge = document.getElementById('log-count');
  if (badge) {
    badge.textContent = activityData.length;
  }
  
  if (filtered.length === 0) {
    container.innerHTML = `<div class="log-empty">No activity logged yet. Events will appear here when agents interact.</div>`;
    return;
  }
  
  container.innerHTML = filtered.map(activity => {
    const eventInfo = EVENT_LABELS[activity.type] || { label: activity.type, color: '#6B7280' };
    const agentName = activity.agentName || activity.agent_id || 'unknown';
    const icon = AGENT_ICONS[agentName] || AGENT_ICONS.unknown;
    
    // Handle both Convex timestamps and legacy timestamps
    let time = 'Unknown';
    if (activity._creationTime) {
      time = formatTime(activity._creationTime);
    } else if (activity.created_at) {
      time = formatTime(activity.created_at * 1000);
    }
    
    // Parse metadata
    let metadata = activity.metadata;
    if (typeof metadata === 'string') {
      try { metadata = JSON.parse(metadata); } catch (e) { metadata = null; }
    }
    
    let details = '';
    if (metadata) {
      if (metadata.from && metadata.to) {
        details = `<span class="log-detail">${metadata.from} → ${metadata.to}</span>`;
      }
      if (metadata.feedback) {
        details += `<span class="log-detail log-feedback">"${metadata.feedback}"</span>`;
      }
      if (metadata.deliverables) {
        const truncated = metadata.deliverables.length > 100 
          ? metadata.deliverables.slice(0, 100) + '...' 
          : metadata.deliverables;
        details += `<span class="log-detail">📦 ${truncated}</span>`;
      }
    }
    
    return `
      <div class="log-entry">
        <div class="log-icon" title="${agentName}">${icon}</div>
        <div class="log-content">
          <div class="log-header">
            <span class="log-agent">${agentName}</span>
            <span class="log-type" style="background: ${eventInfo.color}20; color: ${eventInfo.color};">${eventInfo.label}</span>
            <span class="log-time">${time}</span>
          </div>
          <div class="log-message">${escapeHtml(activity.message)}</div>
          ${details ? `<div class="log-details">${details}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function addActivity(activity) {
  activityData.unshift({
    id: `act_${Date.now()}`,
    _creationTime: Date.now(),
    ...activity
  });
  
  // Persist to localStorage as backup
  localStorage.setItem('activities', JSON.stringify(activityData.slice(0, 500)));
  
  renderActivityLog();
  
  // Flash the log badge
  const badge = document.getElementById('log-count');
  if (badge) {
    badge.classList.add('pulse');
    setTimeout(() => badge.classList.remove('pulse'), 1000);
  }
}

function clearActivityLog() {
  if (confirm('Clear all activity logs?')) {
    activityData = [];
    localStorage.removeItem('activities');
    renderActivityLog();
  }
}

// Populate agent filter dropdown
function populateAgentFilter() {
  const select = document.getElementById('log-filter-agent');
  if (!select) return;
  
  const agents = [
    { name: 'Abbe', icon: '🧠' },
    { name: 'Ernst', icon: '✓' },
    { name: 'Zernike', icon: '💻' },
    { name: 'Seidel', icon: '💼' },
    { name: 'Iris', icon: '🎨' },
    { name: 'Theia', icon: '🔬' },
    { name: 'Photon', icon: '⚙️' },
    { name: 'Kanban', icon: '📦' },
    { name: 'Deming', icon: '✅' }
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
  
  // Check if Convex is available AND initialized
  // If not ready yet, the real-time subscriptions will be set up later via polling
  if (window.Convex && window.Convex.isReady && window.Convex.isReady()) {
    useConvex = true;
    setupRealtimeActivities();
    console.log("📋 Activity Log: Using Convex (real-time)");
    loadActivityLog();
  } else {
    // Convex not ready yet - will load via polling or wait for ready event
    console.log("📋 Activity Log: Waiting for Convex initialization...");
    // Don't call loadActivityLog yet - will be called when Convex polling starts
  }
  
  // Event listeners
  document.getElementById('refresh-log-btn')?.addEventListener('click', loadActivityLog);
  document.getElementById('clear-log-btn')?.addEventListener('click', clearActivityLog);
  document.getElementById('log-filter-agent')?.addEventListener('change', renderActivityLog);
  document.getElementById('log-filter-type')?.addEventListener('change', renderActivityLog);
});

// Export for other modules
window.ActivityLog = {
  add: addActivity,
  load: loadActivityLog,
  clear: clearActivityLog,
  isRealtime: () => useConvex
};
