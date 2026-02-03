(() => {
  const STATUS_COLUMNS = ["inbox", "assigned", "in_progress", "review", "done"];
  const STATUS_LABELS = {
    inbox: "Inbox",
    assigned: "Assigned",
    in_progress: "In Progress",
    review: "Review",
    done: "Done",
  };
  const PRIORITY_COLORS = {
    1: "badge-neutral",
    2: "badge-neutral",
    3: "badge-neutral",
    4: "badge-cyan",
    5: "badge-cyan",
    6: "badge-cyan",
    7: "badge-amber",
    8: "badge-amber",
    9: "badge-red",
    10: "badge-red",
  };

  let cachedAgents = [];
  let cachedTasks = [];
  let editingTaskId = null;
  let draggedTask = null;
  let useConvex = false;

  function $(selector) {
    return document.querySelector(selector);
  }

  function createEl(tag, className, html) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (html) el.innerHTML = html;
    return el;
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text || "";
    return div.innerHTML;
  }

  // Get the database interface (Convex or IndexedDB)
  function getDB() {
    if (useConvex && window.Convex) {
      return window.Convex;
    }
    return window.DB;
  }

  // ============ Real-Time Subscriptions ============

  function setupRealtimeSubscriptions() {
    if (!window.Convex) return;

    // Subscribe to agents changes
    window.Convex.agents.onChange((agents) => {
      console.log("🔄 Agents updated (real-time):", agents.length);
      cachedAgents = agents;
      renderAgents();
      populateAssigneeSelect();
    });

    // Subscribe to tasks changes
    window.Convex.tasks.onChange((tasks) => {
      console.log("🔄 Tasks updated (real-time):", tasks.length);
      cachedTasks = tasks;
      renderKanban();
      updateTaskCount();
    });

    // Also listen for custom events (backup)
    window.addEventListener("convex:agents", (e) => {
      cachedAgents = e.detail || [];
      renderAgents();
      populateAssigneeSelect();
    });

    window.addEventListener("convex:tasks", (e) => {
      cachedTasks = e.detail || [];
      renderKanban();
      updateTaskCount();
    });
  }

  // ============ Agents ============

  async function loadAgents() {
    const db = getDB();
    if (!db) return;
    
    try {
      cachedAgents = await db.agents.list();
      renderAgents();
      populateAssigneeSelect();
    } catch (err) {
      console.error("Failed to load agents:", err);
      showToast("Failed to load agents", "error");
    }
  }

  function renderAgents() {
    const container = $("#agent-grid");
    if (!container) return;
    container.innerHTML = "";

    cachedAgents.forEach((agent) => {
      const card = createEl("div", "agent-card");
      card.dataset.id = agent._id || agent.id;
      
      // Context usage display
      const contextPercent = agent.contextPercent || 0;
      const contextColor = contextPercent >= 80 ? 'var(--accent-red)' : 
                          contextPercent >= 50 ? 'var(--accent-amber)' : 
                          'var(--accent-green)';
      const contextBar = agent.contextUsed ? `
        <div style="margin-top: var(--space-xs); width: 100%;">
          <div style="display: flex; justify-content: space-between; font-size: 10px; color: var(--text-muted); margin-bottom: 2px;">
            <span>Context</span>
            <span style="color: ${contextColor};">${contextPercent}%</span>
          </div>
          <div style="height: 4px; background: var(--bg-primary); border-radius: 2px; overflow: hidden;">
            <div style="height: 100%; width: ${contextPercent}%; background: ${contextColor}; transition: width 0.3s;"></div>
          </div>
        </div>
      ` : '';
      
      card.innerHTML = `
        <div class="agent-icon">${agent.emoji || "🤖"}</div>
        <div class="agent-name">${agent.name}</div>
        <div class="agent-role">${agent.role}</div>
        <div class="agent-status">
          <span class="status-dot ${agent.status || "idle"}"></span>
          <span>${agent.status || "idle"}</span>
        </div>
        <div style="margin-top: var(--space-xs); font-size: var(--text-caption); color: var(--accent-cyan);">
          ${agent.model || "sonnet"}
        </div>
        ${contextBar}
      `;
      
      card.addEventListener("click", () => openAgentSession(agent));
      container.appendChild(card);
    });
  }

  function openAgentSession(agent) {
    const modal = $("#task-modal");
    const title = $("#modal-title");
    const form = $("#task-form");
    const footer = $(".modal-footer");
    
    title.textContent = `${agent.emoji} ${agent.name}`;
    
    // Get tasks assigned to this agent
    const agentId = agent._id || agent.id;
    const agentTasks = cachedTasks.filter(t => 
      t.assigneeIds?.includes(agentId) && t.status !== 'done'
    );
    
    // Context usage display
    const contextPercent = agent.contextPercent || 0;
    const contextUsed = agent.contextUsed || 0;
    const contextCap = agent.contextCap || 200000;
    const contextColor = contextPercent >= 80 ? 'var(--accent-red)' : 
                        contextPercent >= 50 ? 'var(--accent-amber)' : 
                        'var(--accent-green)';
    const lastSleep = agent.lastSleepAt ? new Date(agent.lastSleepAt).toLocaleString() : 'Never';
    
    form.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: var(--space-md);">
        <div class="form-group">
          <label class="form-label">Role</label>
          <div style="color: var(--text-primary);">${agent.role}</div>
        </div>
        <div class="form-group">
          <label class="form-label">Session Key</label>
          <code style="background: var(--bg-primary); padding: 8px 12px; border-radius: var(--radius-sm); font-family: var(--font-mono); font-size: var(--text-caption); color: var(--accent-cyan); display: block;">
            ${agent.sessionKey}
          </code>
        </div>
        <div class="form-group">
          <label class="form-label">Model</label>
          <span class="badge badge-cyan">${agent.model || "sonnet"}</span>
        </div>
        <div class="form-group">
          <label class="form-label">Status</label>
          <div style="display: flex; align-items: center; gap: var(--space-xs);">
            <span class="status-dot ${agent.status || 'idle'}" style="width: 10px; height: 10px;"></span>
            <span style="text-transform: capitalize;">${agent.status || 'idle'}</span>
          </div>
        </div>
        
        <!-- Context Usage Section -->
        <div class="form-group">
          <label class="form-label" style="color: ${contextColor};">
            ${contextPercent >= 80 ? '⚠️' : '📊'} Context Usage
          </label>
          <div style="background: var(--bg-primary); padding: var(--space-sm); border-radius: var(--radius-sm);">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span style="font-size: var(--text-caption); color: var(--text-muted);">
                ${contextUsed.toLocaleString()} / ${contextCap.toLocaleString()} tokens
              </span>
              <span style="font-size: var(--text-caption); font-weight: 600; color: ${contextColor};">
                ${contextPercent}%
              </span>
            </div>
            <div style="height: 8px; background: var(--bg-secondary); border-radius: 4px; overflow: hidden;">
              <div style="height: 100%; width: ${contextPercent}%; background: ${contextColor}; transition: width 0.3s;"></div>
            </div>
            <div style="margin-top: 8px; font-size: 11px; color: var(--text-muted);">
              Last sleep: ${lastSleep}
              ${agent.lastSleepNote ? `<br><em>"${escapeHtml(agent.lastSleepNote)}"</em>` : ''}
            </div>
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">Assigned Tasks (${agentTasks.length})</label>
          <div id="agent-tasks" style="max-height: 120px; overflow-y: auto;">
            ${agentTasks.length === 0 
              ? `<p style="color: var(--text-muted); font-size: var(--text-caption);">No active tasks</p>`
              : agentTasks.map(t => `
                  <div style="padding: 8px; background: var(--bg-primary); border-radius: var(--radius-sm); margin-bottom: 4px; font-size: var(--text-caption);">
                    <span class="badge ${PRIORITY_COLORS[t.priority] || 'badge-neutral'}" style="font-size: 10px;">${t.priority}</span>
                    ${escapeHtml(t.title)}
                  </div>
                `).join('')
            }
          </div>
        </div>
      </div>
    `;
    
    footer.innerHTML = `
      <button type="button" class="btn btn-secondary" id="modal-cancel">Close</button>
    `;
    
    $("#modal-cancel").addEventListener("click", closeTaskModal);
    modal.classList.add("open");
  }

  function populateAssigneeSelect() {
    const select = $("#task-assignee");
    if (!select) return;
    
    while (select.options.length > 1) {
      select.remove(1);
    }
    
    cachedAgents.forEach((agent) => {
      const option = document.createElement("option");
      option.value = agent._id || agent.id;
      option.textContent = `${agent.emoji} ${agent.name}`;
      select.appendChild(option);
    });
  }

  // ============ Tasks ============

  async function loadTasks() {
    const db = getDB();
    if (!db) return;
    
    try {
      cachedTasks = await db.tasks.list();
      renderKanban();
      updateTaskCount();
    } catch (err) {
      console.error("Failed to load tasks:", err);
      showToast("Failed to load tasks", "error");
    }
  }

  function renderKanban() {
    const container = $("#kanban-board");
    if (!container) return;
    container.innerHTML = "";

    STATUS_COLUMNS.forEach((status) => {
      const tasks = cachedTasks.filter((t) => t.status === status);
      // Sort by priority (high to low)
      tasks.sort((a, b) => (b.priority || 5) - (a.priority || 5));
      
      const column = createEl("div", "kanban-column");
      column.dataset.status = status;
      
      column.innerHTML = `
        <div class="kanban-header">
          <span class="kanban-title">${STATUS_LABELS[status]}</span>
          <span class="kanban-count">${tasks.length}</span>
        </div>
        <div class="kanban-tasks" data-status="${status}"></div>
      `;
      
      const tasksContainer = column.querySelector(".kanban-tasks");
      
      // Drag and drop events
      tasksContainer.addEventListener("dragover", handleDragOver);
      tasksContainer.addEventListener("dragenter", handleDragEnter);
      tasksContainer.addEventListener("dragleave", handleDragLeave);
      tasksContainer.addEventListener("drop", handleDrop);
      
      tasks.forEach((task) => {
        const card = renderTaskCard(task);
        tasksContainer.appendChild(card);
      });
      
      container.appendChild(column);
    });
  }

  function renderTaskCard(task) {
    const taskId = task._id || task.id;
    const assignees = cachedAgents.filter(a => 
      task.assigneeIds?.includes(a._id || a.id)
    );
    
    // Truncate description for card preview
    const descPreview = task.description 
      ? (task.description.length > 80 ? task.description.slice(0, 80) + '...' : task.description)
      : '';
    
    const card = createEl("div", "task-card");
    card.dataset.taskId = taskId;
    card.draggable = true;
    
    card.innerHTML = `
      <div class="task-title">${escapeHtml(task.title)}</div>
      ${descPreview ? `<div class="task-desc" style="font-size: 11px; color: var(--text-muted); margin: 4px 0; line-height: 1.3;">${escapeHtml(descPreview)}</div>` : ''}
      <div class="task-meta">
        <span class="badge ${PRIORITY_COLORS[task.priority] || "badge-cyan"}">${task.priority || 5}</span>
        <span>${assignees.length > 0 ? assignees.map(a => a.emoji).join(' ') : "—"}</span>
      </div>
    `;
    
    card.addEventListener("dragstart", handleDragStart);
    card.addEventListener("dragend", handleDragEnd);
    card.addEventListener("click", () => openTaskDetail(task));
    
    return card;
  }

  // ============ Drag and Drop ============

  function handleDragStart(e) {
    draggedTask = e.target;
    e.target.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", e.target.dataset.taskId);
  }

  function handleDragEnd(e) {
    e.target.classList.remove("dragging");
    draggedTask = null;
    document.querySelectorAll(".kanban-tasks").forEach(col => {
      col.classList.remove("drag-over");
    });
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function handleDragEnter(e) {
    e.preventDefault();
    e.currentTarget.classList.add("drag-over");
  }

  function handleDragLeave(e) {
    e.currentTarget.classList.remove("drag-over");
  }

  async function handleDrop(e) {
    e.preventDefault();
    const column = e.currentTarget;
    column.classList.remove("drag-over");
    
    const taskId = e.dataTransfer.getData("text/plain");
    const newStatus = column.dataset.status;
    
    if (!taskId || !newStatus) return;
    
    try {
      const db = getDB();
      await db.tasks.update(taskId, { status: newStatus });
      showToast(`Task moved to ${STATUS_LABELS[newStatus]}`, "success");
      
      // If not using real-time, refresh manually
      if (!useConvex) {
        await loadTasks();
      }
    } catch (err) {
      console.error("Failed to update task:", err);
      showToast("Failed to move task", "error");
    }
  }

  // ============ Task Detail Modal ============

  function openTaskDetail(task) {
    editingTaskId = task._id || task.id;
    const assignees = cachedAgents.filter(a => 
      task.assigneeIds?.includes(a._id || a.id)
    );
    
    const modal = $("#task-modal");
    const title = $("#modal-title");
    const form = $("#task-form");
    const footer = $(".modal-footer");
    
    title.textContent = task.title;
    
    form.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: var(--space-md);">
        <div class="form-group">
          <label class="form-label">Status</label>
          <div style="display: flex; align-items: center; gap: var(--space-sm);">
            <span class="badge badge-cyan">${STATUS_LABELS[task.status]}</span>
            <span class="badge ${PRIORITY_COLORS[task.priority] || 'badge-cyan'}">${task.priority || 5}</span>
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">Assigned To</label>
          <div style="color: var(--text-primary);">
            ${assignees.length > 0 
              ? assignees.map(a => `${a.emoji} ${a.name}`).join(', ')
              : 'Unassigned'
            }
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">Description</label>
          <div style="color: var(--text-secondary); white-space: pre-wrap; background: var(--bg-primary); padding: var(--space-sm); border-radius: var(--radius-sm); max-height: 120px; overflow-y: auto;">
            ${escapeHtml(task.description) || 'No description'}
          </div>
        </div>
        
        ${task.deliverables ? `
          <div class="form-group">
            <label class="form-label" style="color: var(--accent-green);">📦 Deliverables</label>
            <div style="color: var(--text-secondary); white-space: pre-wrap; background: var(--bg-primary); padding: var(--space-sm); border-radius: var(--radius-sm);">
              ${escapeHtml(task.deliverables)}
            </div>
          </div>
        ` : ''}
        
        ${task.verifiedAt ? `
          <div class="form-group">
            <label class="form-label" style="color: var(--accent-green);">✓ Verified</label>
            <div style="color: var(--text-muted); font-size: var(--text-caption);">
              ${new Date(task.verifiedAt).toLocaleString()}
            </div>
          </div>
        ` : ''}
        
        <div class="form-group">
          <label class="form-label">Created By</label>
          <div style="color: var(--text-muted); font-size: var(--text-caption);">
            ${task.createdByName || 'Unknown'}
          </div>
        </div>
      </div>
    `;
    
    footer.innerHTML = `
      <button type="button" class="btn btn-secondary" id="modal-cancel">Close</button>
      <button type="button" class="btn btn-secondary" id="edit-task-btn">Edit</button>
      ${task.status !== 'done' 
        ? `<button type="button" class="btn btn-primary" id="progress-task-btn">
            ${getNextAction(task.status)}
          </button>`
        : ''
      }
    `;
    
    $("#modal-cancel").addEventListener("click", closeTaskModal);
    $("#edit-task-btn").addEventListener("click", () => {
      closeTaskModal();
      openTaskModal(task);
    });
    
    const progressBtn = $("#progress-task-btn");
    if (progressBtn) {
      progressBtn.addEventListener("click", async () => {
        const nextStatus = getNextStatus(task.status);
        if (nextStatus) {
          try {
            const db = getDB();
            await db.tasks.update(editingTaskId, { status: nextStatus });
            showToast(`Task moved to ${STATUS_LABELS[nextStatus]}`, "success");
            closeTaskModal();
            if (!useConvex) await loadTasks();
          } catch (err) {
            showToast("Failed to update task", "error");
          }
        }
      });
    }
    
    modal.classList.add("open");
  }

  function getNextStatus(currentStatus) {
    const order = ["inbox", "assigned", "in_progress", "review", "done"];
    const idx = order.indexOf(currentStatus);
    return idx < order.length - 1 ? order[idx + 1] : null;
  }

  function getNextAction(currentStatus) {
    const actions = {
      inbox: "Assign →",
      assigned: "Start Work →",
      in_progress: "Submit for Review →",
      review: "Mark Complete ✓",
    };
    return actions[currentStatus] || "Progress →";
  }

  // ============ Edit Task Modal ============

  function openTaskModal(task = null) {
    editingTaskId = task?._id || task?.id || null;
    
    const modal = $("#task-modal");
    const title = $("#modal-title");
    const footer = $(".modal-footer");
    const form = $("#task-form");
    
    title.textContent = task ? "Edit Task" : "New Task";
    
    form.innerHTML = `
      <div class="form-group">
        <label class="form-label" for="task-title-input">Title</label>
        <input type="text" id="task-title-input" class="input" placeholder="Task title" required>
      </div>
      <div class="form-group">
        <label class="form-label" for="task-desc">Description</label>
        <textarea id="task-desc" class="input" rows="3" placeholder="Task details..." style="resize: vertical;"></textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="task-priority">Priority (1-10)</label>
          <select id="task-priority" class="input select">
            <option value="1">1 - Someday</option>
            <option value="2">2 - Low</option>
            <option value="3">3 - Low</option>
            <option value="4">4 - Medium-Low</option>
            <option value="5" selected>5 - Medium</option>
            <option value="6">6 - Medium-High</option>
            <option value="7">7 - High (48h)</option>
            <option value="8">8 - High (24h)</option>
            <option value="9">9 - Urgent (Today)</option>
            <option value="10">10 - CRITICAL</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="task-assignee">Assignee</label>
          <select id="task-assignee" class="input select">
            <option value="">Unassigned</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" for="task-status">Status</label>
        <select id="task-status" class="input select">
          <option value="inbox">Inbox</option>
          <option value="assigned">Assigned</option>
          <option value="in_progress">In Progress</option>
          <option value="review">Review</option>
          <option value="done">Done</option>
        </select>
      </div>
    `;
    
    populateAssigneeSelect();
    
    if (task) {
      $("#task-title-input").value = task.title || "";
      $("#task-desc").value = task.description || "";
      $("#task-priority").value = task.priority || 5;
      $("#task-assignee").value = task.assigneeIds?.[0] || "";
      $("#task-status").value = task.status || "inbox";
    }
    
    footer.innerHTML = `
      <button type="button" class="btn btn-secondary" id="modal-cancel">Cancel</button>
      <button type="submit" form="task-form" class="btn btn-primary" id="modal-save">Save Task</button>
    `;
    
    $("#modal-cancel").addEventListener("click", closeTaskModal);
    form.onsubmit = saveTask;
    
    modal.classList.add("open");
  }

  function closeTaskModal() {
    const modal = $("#task-modal");
    modal.classList.remove("open");
    editingTaskId = null;
  }

  async function saveTask(e) {
    e.preventDefault();
    
    const title = $("#task-title-input").value.trim();
    const description = $("#task-desc").value.trim();
    const priority = parseInt($("#task-priority").value);
    const assigneeId = $("#task-assignee").value || null;
    const status = $("#task-status").value;
    
    if (!title) {
      showToast("Please enter a task title", "warning");
      return;
    }
    
    try {
      const db = getDB();
      
      if (editingTaskId) {
        // Update existing task
        await db.tasks.update(editingTaskId, { status });
        if (priority) {
          await db.tasks.update(editingTaskId, { priority });
        }
        if (assigneeId) {
          await db.tasks.update(editingTaskId, { assigneeIds: [assigneeId] });
        }
        showToast("Task updated", "success");
      } else {
        // Create new task
        await db.tasks.add({
          title,
          description,
          priority,
          createdBySession: "agent:main:main", // Default to Abbe
        });
        showToast("Task created", "success");
      }
      
      closeTaskModal();
      if (!useConvex) await loadTasks();
    } catch (err) {
      showToast("Failed to save task", "error");
      console.error(err);
    }
  }

  function updateTaskCount() {
    const badge = $("#task-count");
    if (badge) {
      const activeTasks = cachedTasks.filter((t) => t.status !== "done").length;
      badge.textContent = activeTasks;
    }
  }

  // ============ Toast ============

  function showToast(message, type = "info") {
    const container = $("#toast-container");
    if (!container) return;
    
    const toast = createEl("div", `toast ${type}`);
    toast.innerHTML = `
      <span style="flex: 1;">${escapeHtml(message)}</span>
      <button class="btn-ghost" style="padding: 4px; font-size: 1.25rem; line-height: 1; min-height: auto;">&times;</button>
    `;
    
    const closeBtn = toast.querySelector("button");
    closeBtn.addEventListener("click", () => toast.remove());
    
    container.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(100%)";
      setTimeout(() => toast.remove(), 200);
    }, 4000);
  }

  // ============ Init ============

  function bindEvents() {
    const newTaskBtn = $("#new-task-btn");
    if (newTaskBtn) {
      newTaskBtn.addEventListener("click", () => openTaskModal());
    }
    
    // Modal close button (X)
    const modalCloseBtn = $("#modal-close");
    if (modalCloseBtn) {
      modalCloseBtn.addEventListener("click", closeTaskModal);
    }
    
    // Click outside modal to close
    const modalBackdrop = $("#task-modal");
    if (modalBackdrop) {
      modalBackdrop.addEventListener("click", (e) => {
        if (e.target === modalBackdrop) closeTaskModal();
      });
    }
    
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeTaskModal();
    });
  }

  async function init() {
    bindEvents();
    
    // Try to use Convex if available
    if (window.Convex) {
      try {
        await window.Convex.init();
        useConvex = true;
        console.log("✅ Using Convex (real-time enabled)");
        
        // Clear IndexedDB to avoid stale data conflicts
        if (window.DB) {
          try {
            await window.DB.agents.clear();
            await window.DB.tasks.clear();
            console.log("✓ Cleared local cache (using Convex)");
          } catch (e) {
            console.warn("Could not clear IndexedDB:", e);
          }
        }
        
        setupRealtimeSubscriptions();
        
        // Seed agents if needed (Convex will skip if already seeded)
        await window.Convex.agents.seed();
      } catch (err) {
        console.warn("Convex init failed, falling back to IndexedDB:", err);
        useConvex = false;
      }
    }
    
    // Initial data load
    await loadAgents();
    await loadTasks();
    
    // Show connection status
    if (useConvex) {
      showToast("🔴 Live: Real-time sync enabled", "success");
    }
  }

  async function refresh() {
    await loadTasks();
    await loadAgents();
  }

  window.Mission = {
    init,
    refresh,
    openTaskModal,
    showToast,
    isRealtime: () => useConvex,
  };
})();
