/**
 * Comments Module
 * Task discussion threads with @mention support
 */
(() => {
  let comments = {}; // taskId -> comment[]
  
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
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  const AGENT_EMOJIS = {
    Abbe: '🧠',
    Zernike: '💻',
    Seidel: '🔧',
    Iris: '🎨',
    Photon: '📸',
    Kanban: '📋',
    Deming: '📊',
    Ernst: '✅',
    Theia: '🔮',
    Max: '👤',
    Unknown: '🤖',
  };

  /**
   * Load comments for a task
   */
  async function loadForTask(taskId) {
    if (window.Convex) {
      try {
        const result = await window.Convex.messages.listByTask({ taskId });
        comments[taskId] = result || [];
        return comments[taskId];
      } catch (err) {
        console.warn('Convex comments fetch failed:', err);
      }
    }
    
    // Return cached or empty
    return comments[taskId] || [];
  }

  /**
   * Add a comment to a task
   */
  async function add(taskId, { content, fromAgent }) {
    const comment = {
      id: Date.now().toString(),
      taskId,
      content,
      fromAgent: fromAgent || 'Unknown',
      createdAt: Date.now(),
    };

    // Parse mentions and create notifications
    if (window.Notifications) {
      const mentions = window.Notifications.parseMentions(content);
      for (const mentioned of mentions) {
        if (mentioned !== fromAgent) {
          await window.Notifications.create({
            mentionedAgent: mentioned,
            fromAgent: fromAgent || 'Unknown',
            content,
            taskId,
            messageId: comment.id,
          });
        }
      }
    }

    // Save to Convex or local
    if (window.Convex) {
      try {
        await window.Convex.messages.create(comment);
      } catch (err) {
        console.warn('Convex comment save failed:', err);
        if (!comments[taskId]) comments[taskId] = [];
        comments[taskId].push(comment);
      }
    } else {
      if (!comments[taskId]) comments[taskId] = [];
      comments[taskId].push(comment);
    }

    // Log activity
    if (window.ActivityLog) {
      window.ActivityLog.log({
        type: 'message_sent',
        agentName: fromAgent,
        taskId,
        message: `commented on task`,
        metadata: { preview: content.slice(0, 50) },
      });
    }

    return comment;
  }

  /**
   * Render comment thread for a container
   */
  function render(taskId, container) {
    const taskComments = comments[taskId] || [];
    
    if (taskComments.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: var(--space-lg);">
          <p>No comments yet</p>
          <p style="font-size: var(--text-caption);">Be the first to add a comment</p>
        </div>
      `;
      return;
    }

    container.innerHTML = taskComments.map(comment => {
      const emoji = AGENT_EMOJIS[comment.fromAgent] || '🤖';
      const highlighted = window.Notifications 
        ? window.Notifications.highlightMentions(comment.content)
        : escapeHtml(comment.content);
      
      return `
        <div class="comment">
          <div class="comment-avatar">${emoji}</div>
          <div class="comment-body">
            <div class="comment-header">
              <span class="comment-author">${escapeHtml(comment.fromAgent)}</span>
              <span class="comment-time">${formatTime(comment.createdAt)}</span>
            </div>
            <div class="comment-content">${highlighted}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Create a comment form
   */
  function createForm(taskId, onSubmit) {
    const form = document.createElement('div');
    form.className = 'comment-form';
    form.innerHTML = `
      <select class="input select" id="comment-author-${taskId}" style="width: auto; min-width: 120px;">
        <option value="Abbe">🧠 Abbe</option>
        <option value="Zernike">💻 Zernike</option>
        <option value="Seidel">🔧 Seidel</option>
        <option value="Iris">🎨 Iris</option>
        <option value="Photon">📸 Photon</option>
        <option value="Deming">📊 Deming</option>
        <option value="Max">👤 Max</option>
      </select>
      <textarea 
        class="input comment-input" 
        id="comment-input-${taskId}" 
        placeholder="Add a comment... Use @agent to mention"
        rows="2"
      ></textarea>
      <button class="btn btn-primary" id="comment-submit-${taskId}">Send</button>
    `;

    const submitBtn = form.querySelector(`#comment-submit-${taskId}`);
    const textarea = form.querySelector(`#comment-input-${taskId}`);
    const authorSelect = form.querySelector(`#comment-author-${taskId}`);

    async function handleSubmit() {
      const content = textarea.value.trim();
      const fromAgent = authorSelect.value;

      if (!content) return;

      submitBtn.disabled = true;
      submitBtn.textContent = '...';

      try {
        await add(taskId, { content, fromAgent });
        textarea.value = '';
        if (onSubmit) onSubmit();
        
        if (window.Mission?.showToast) {
          window.Mission.showToast('Comment added', 'success');
        }
      } catch (err) {
        console.error('Failed to add comment:', err);
        if (window.Mission?.showToast) {
          window.Mission.showToast('Failed to add comment', 'error');
        }
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send';
      }
    }

    submitBtn.addEventListener('click', handleSubmit);
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSubmit();
      }
    });

    return form;
  }

  /**
   * Get comment count for a task
   */
  function getCount(taskId) {
    return (comments[taskId] || []).length;
  }

  // Export
  window.Comments = {
    loadForTask,
    add,
    render,
    createForm,
    getCount,
  };
})();
