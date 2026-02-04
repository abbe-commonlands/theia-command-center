/**
 * Notifications Module
 * Handles @mentions and agent alerts
 */
(() => {
  const AGENTS = ['Abbe', 'Zernike', 'Seidel', 'Iris', 'Photon', 'Kanban', 'Deming', 'Ernst', 'Theia'];
  const MENTION_REGEX = new RegExp(`@(${AGENTS.join('|')})`, 'gi');
  
  let notifications = [];
  let isOpen = false;

  function $(selector) {
    return document.querySelector(selector);
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }

  function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  }

  /**
   * Parse @mentions from text
   */
  function parseMentions(text) {
    const mentions = [];
    let match;
    while ((match = MENTION_REGEX.exec(text)) !== null) {
      mentions.push(match[1]);
    }
    return [...new Set(mentions)]; // dedupe
  }

  /**
   * Highlight @mentions in text
   */
  function highlightMentions(text) {
    return escapeHtml(text).replace(
      MENTION_REGEX,
      '<span class="mention">@$1</span>'
    );
  }

  /**
   * Create a notification
   */
  async function createNotification({ mentionedAgent, fromAgent, content, taskId, messageId }) {
    const notification = {
      id: Date.now().toString(),
      mentionedAgent,
      fromAgent,
      content,
      taskId,
      messageId,
      delivered: false,
      createdAt: Date.now(),
    };

    // Try Convex first
    if (window.Convex) {
      try {
        await window.Convex.notifications.create(notification);
      } catch (err) {
        console.warn('Convex notification failed, using local:', err);
        notifications.unshift(notification);
      }
    } else {
      notifications.unshift(notification);
    }

    updateBadge();
    
    // Show toast
    if (window.Mission?.showToast) {
      window.Mission.showToast(`@${mentionedAgent} was mentioned by ${fromAgent}`, 'info');
    }
  }

  /**
   * Get notifications for an agent
   */
  async function getNotifications(agentName, unreadOnly = false) {
    if (window.Convex) {
      try {
        return await window.Convex.notifications.list({ agentName, unreadOnly });
      } catch (err) {
        console.warn('Convex fetch failed:', err);
      }
    }
    
    let result = notifications;
    if (agentName) {
      result = result.filter(n => n.mentionedAgent === agentName);
    }
    if (unreadOnly) {
      result = result.filter(n => !n.delivered);
    }
    return result;
  }

  /**
   * Mark notification as read
   */
  async function markRead(notificationId) {
    if (window.Convex) {
      try {
        await window.Convex.notifications.markRead({ id: notificationId });
        return;
      } catch (err) {
        console.warn('Convex markRead failed:', err);
      }
    }
    
    const notification = notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.delivered = true;
      notification.readAt = Date.now();
    }
    updateBadge();
  }

  /**
   * Mark all as read
   */
  async function markAllRead(agentName) {
    if (window.Convex) {
      try {
        await window.Convex.notifications.markAllRead({ agentName });
        return;
      } catch (err) {
        console.warn('Convex markAllRead failed:', err);
      }
    }
    
    notifications.forEach(n => {
      if (!agentName || n.mentionedAgent === agentName) {
        n.delivered = true;
        n.readAt = Date.now();
      }
    });
    updateBadge();
    render();
  }

  /**
   * Update the notification badge count
   */
  function updateBadge() {
    const badge = $('#notification-badge');
    if (!badge) return;
    
    // For now, show all unread (in production, filter by current agent)
    const unread = notifications.filter(n => !n.delivered).length;
    badge.textContent = unread > 0 ? (unread > 99 ? '99+' : unread) : '';
  }

  /**
   * Render notification panel
   */
  function render() {
    const list = $('#notification-list');
    if (!list) return;

    if (notifications.length === 0) {
      list.innerHTML = '<div class="notification-empty">No notifications yet</div>';
      return;
    }

    list.innerHTML = notifications.slice(0, 20).map(n => `
      <div class="notification-item ${n.delivered ? '' : 'unread'}" data-id="${n.id}">
        <div class="notification-avatar">💬</div>
        <div class="notification-body">
          <div class="notification-text">
            <strong>${escapeHtml(n.fromAgent)}</strong> mentioned 
            <span class="mention">@${escapeHtml(n.mentionedAgent)}</span>
          </div>
          <div class="notification-preview" style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
            ${escapeHtml(n.content?.slice(0, 60))}${n.content?.length > 60 ? '...' : ''}
          </div>
          <div class="notification-time">${formatTime(n.createdAt)}</div>
        </div>
      </div>
    `).join('');

    // Bind click handlers
    list.querySelectorAll('.notification-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.dataset.id;
        markRead(id);
        item.classList.remove('unread');
        
        // If has taskId, could open task detail
        const notification = notifications.find(n => n.id === id);
        if (notification?.taskId) {
          // TODO: Open task detail
        }
      });
    });
  }

  /**
   * Toggle notification panel
   */
  function toggle() {
    const panel = $('#notification-panel');
    if (!panel) return;
    
    isOpen = !isOpen;
    panel.classList.toggle('open', isOpen);
    
    if (isOpen) {
      render();
    }
  }

  /**
   * Close panel
   */
  function close() {
    const panel = $('#notification-panel');
    if (panel) {
      panel.classList.remove('open');
      isOpen = false;
    }
  }

  /**
   * Initialize
   */
  function init() {
    // Create notification UI if not exists
    const header = $('.header-inner');
    if (header && !$('#notification-bell')) {
      const notifContainer = document.createElement('div');
      notifContainer.style.cssText = 'position: relative; margin-left: auto;';
      notifContainer.innerHTML = `
        <button class="notification-bell" id="notification-bell" aria-label="Notifications">
          🔔
          <span class="notification-badge" id="notification-badge"></span>
        </button>
        <div class="notification-panel" id="notification-panel">
          <div class="notification-panel-header">
            <span class="notification-panel-title">Notifications</span>
            <button class="btn btn-ghost btn-sm" id="mark-all-read">Mark all read</button>
          </div>
          <div class="notification-list" id="notification-list">
            <div class="notification-empty">No notifications yet</div>
          </div>
        </div>
      `;
      
      // Insert before nav-tabs
      const nav = header.querySelector('.nav-tabs');
      if (nav) {
        header.insertBefore(notifContainer, nav);
      } else {
        header.appendChild(notifContainer);
      }
    }

    // Bind events
    const bell = $('#notification-bell');
    if (bell) {
      bell.addEventListener('click', (e) => {
        e.stopPropagation();
        toggle();
      });
    }

    const markAllBtn = $('#mark-all-read');
    if (markAllBtn) {
      markAllBtn.addEventListener('click', () => markAllRead());
    }

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (isOpen && !e.target.closest('.notification-panel') && !e.target.closest('.notification-bell')) {
        close();
      }
    });

    // Subscribe to Convex notifications if available
    if (window.Convex) {
      window.Convex.notifications?.onChange?.((data) => {
        notifications = data || [];
        updateBadge();
        if (isOpen) render();
      });
    }

    updateBadge();
  }

  // Export
  window.Notifications = {
    init,
    create: createNotification,
    get: getNotifications,
    markRead,
    markAllRead,
    parseMentions,
    highlightMentions,
    toggle,
    close,
  };
})();
