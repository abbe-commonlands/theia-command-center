/**
 * Activity Log - Agent-to-agent interaction viewer
 */

const AGENT_ICONS = {
  abbe: '🧠',
  seidel: '💼',
  iris: '🎨',
  theia: '🔬',
  photon: '⚡',
  zernike: '💻',
  ernst: '✓',
  kanban: '📊',
  deming: '📈',
  unknown: '❓'
};

const EVENT_LABELS = {
  task_created: { label: 'Created Task', color: '#10B981' },
  task_moved: { label: 'Moved Task', color: '#6366F1' },
  task_review_requested: { label: 'Review Requested', color: '#F59E0B' },
  task_verified: { label: 'Verified ✓', color: '#10B981' },
  task_rejected: { label: 'Rejected ✗', color: '#EF4444' },
  task_completed: { label: 'Completed', color: '#10B981' },
  message_sent: { label: 'Comment', color: '#8B5CF6' },
  priority_requested: { label: 'Priority Request', color: '#F59E0B' }
};

let activityData = [];

async function loadActivityLog() {
  try {
    // In browser, we'll fetch from a simple API or use localStorage for demo
    // For now, poll the activities from seed data or localStorage
    const stored = localStorage.getItem('activities');
    if (stored) {
      activityData = JSON.parse(stored);
    }
    renderActivityLog();
  } catch (err) {
    console.error('Failed to load activity log:', err);
  }
}

function renderActivityLog() {
  const container = document.getElementById('activity-log');
  const filterAgent = document.getElementById('log-filter-agent')?.value || '';
  const filterType = document.getElementById('log-filter-type')?.value || '';
  
  let filtered = activityData;
  
  if (filterAgent) {
    filtered = filtered.filter(a => a.agent_id === filterAgent);
  }
  if (filterType) {
    filtered = filtered.filter(a => a.type === filterType);
  }
  
  // Sort by timestamp descending
  filtered.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
  
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
    const icon = AGENT_ICONS[activity.agent_id] || AGENT_ICONS.unknown;
    const time = activity.created_at ? formatTime(activity.created_at) : 'Unknown';
    const metadata = activity.metadata ? JSON.parse(activity.metadata) : null;
    
    let details = '';
    if (metadata) {
      if (metadata.from && metadata.to) {
        details = `<span class="log-detail">${metadata.from} → ${metadata.to}</span>`;
      }
      if (metadata.feedback) {
        details += `<span class="log-detail log-feedback">"${metadata.feedback}"</span>`;
      }
      if (metadata.deliverables) {
        details += `<span class="log-detail">Deliverables: ${metadata.deliverables}</span>`;
      }
    }
    
    return `
      <div class="log-entry">
        <div class="log-icon" title="${activity.agent_id}">${icon}</div>
        <div class="log-content">
          <div class="log-header">
            <span class="log-agent">${activity.agent_id}</span>
            <span class="log-type" style="background: ${eventInfo.color}20; color: ${eventInfo.color};">${eventInfo.label}</span>
            <span class="log-time">${time}</span>
          </div>
          <div class="log-message">${activity.message}</div>
          ${details ? `<div class="log-details">${details}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function formatTime(timestamp) {
  const date = new Date(timestamp * 1000);
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
    created_at: Math.floor(Date.now() / 1000),
    ...activity
  });
  
  // Persist to localStorage
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
  
  const agents = ['abbe', 'ernst', 'zernike', 'seidel', 'iris', 'theia', 'photon', 'kanban', 'deming'];
  agents.forEach(agent => {
    const option = document.createElement('option');
    option.value = agent;
    option.textContent = `${AGENT_ICONS[agent]} ${agent}`;
    select.appendChild(option);
  });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  populateAgentFilter();
  loadActivityLog();
  
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
  clear: clearActivityLog
};
