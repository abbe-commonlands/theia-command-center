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
    low: "badge-neutral",
    medium: "badge-cyan",
    high: "badge-amber",
    urgent: "badge-red",
  };

  // Agent models mapping
  const AGENT_MODELS = {
    "agent:main:main": { model: "claude-opus-4", displayName: "Claude Opus 4" },
    "agent:sales:main": { model: "claude-sonnet-4", displayName: "Claude Sonnet 4" },
    "agent:marketing:main": { model: "claude-sonnet-4", displayName: "Claude Sonnet 4" },
    "agent:engineering:main": { model: "claude-sonnet-4", displayName: "Claude Sonnet 4" },
    "agent:operations:main": { model: "claude-sonnet-4", displayName: "Claude Sonnet 4" },
    "agent:softwaredeveloper:main": { model: "codex", displayName: "OpenAI Codex" },
  };

  let cachedAgents = [];
  let cachedTasks = [];
  let editingTaskId = null;
  let draggedTask = null;

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

  // ============ Agents ============

  async function loadAgents() {
    if (!window.DB) return;
    cachedAgents = await window.DB.agents.list();
    renderAgents();
    populateAssigneeSelect();
  }

  function renderAgents() {
    const container = $("#agent-grid");
    if (!container) return;
    container.innerHTML = "";

    cachedAgents.forEach((agent) => {
      const modelInfo = AGENT_MODELS[agent.sessionKey] || { model: "unknown", displayName: "Unknown" };
      const card = createEl("div", "agent-card");
      card.dataset.sessionKey = agent.sessionKey;
      card.innerHTML = `
        <div class="agent-icon">${agent.emoji || "🤖"}</div>
        <div class="agent-name">${agent.name}</div>
        <div class="agent-role">${agent.role}</div>
        <div class="agent-status">
          <span class="status-dot ${agent.status || "idle"}"></span>
          <span>${agent.status || "idle"}</span>
        </div>
        <div style="margin-top: var(--space-xs); font-size: var(--text-caption); color: var(--accent-cyan);">
          ${modelInfo.displayName}
        </div>
      `;
      
      // Click to open agent session
      card.addEventListener("click", () => openAgentSession(agent));
      container.appendChild(card);
    });
  }

  function openAgentSession(agent) {
    const modelInfo = AGENT_MODELS[agent.sessionKey] || { model: "unknown", displayName: "Unknown" };
    
    // Show agent detail modal
    const modal = $("#task-modal");
    const title = $("#modal-title");
    const form = $("#task-form");
    const footer = $(".modal-footer");
    
    title.textContent = `${agent.emoji} ${agent.name}`;
    
    // Replace form content with agent info
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
          <div style="display: flex; align-items: center; gap: var(--space-sm);">
            <span class="badge badge-cyan">${modelInfo.displayName}</span>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Status</label>
          <div style="display: flex; align-items: center; gap: var(--space-xs);">
            <span class="status-dot ${agent.status || 'idle'}" style="width: 10px; height: 10px;"></span>
            <span style="text-transform: capitalize;">${agent.status || 'idle'}</span>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Assigned Tasks</label>
          <div id="agent-tasks" style="max-height: 150px; overflow-y: auto;"></div>
        </div>
      </div>
    `;
    
    // Show assigned tasks
    const agentTasks = cachedTasks.filter(t => t.assigneeId === agent.id && t.status !== 'done');
    const tasksContainer = $("#agent-tasks");
    if (agentTasks.length === 0) {
      tasksContainer.innerHTML = `<p style="color: var(--text-muted); font-size: var(--text-caption);">No active tasks</p>`;
    } else {
      tasksContainer.innerHTML = agentTasks.map(t => `
        <div style="padding: 8px; background: var(--bg-primary); border-radius: var(--radius-sm); margin-bottom: 4px; font-size: var(--text-caption);">
          <span class="badge ${PRIORITY_COLORS[t.priority]}" style="font-size: 10px;">${t.priority}</span>
          ${escapeHtml(t.title)}
        </div>
      `).join('');
    }
    
    // Update footer with Open Session button
    footer.innerHTML = `
      <button type="button" class="btn btn-secondary" id="modal-cancel">Close</button>
      <button type="button" class="btn btn-primary" id="open-session-btn">
        Open Session →
      </button>
    `;
    
    $("#modal-cancel").addEventListener("click", closeTaskModal);
    $("#open-session-btn").addEventListener("click", () => {
      // This would integrate with Clawdbot's session system
      showToast(`Opening ${agent.name} session... (${agent.sessionKey})`, "info");
      closeTaskModal();
      // In real integration: window.Clawdbot.openSession(agent.sessionKey)
    });
    
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
      option.value = agent.id;
      option.textContent = `${agent.emoji} ${agent.name}`;
      select.appendChild(option);
    });
  }

  // ============ Tasks ============

  async function loadTasks() {
    if (!window.DB) return;
    cachedTasks = await window.DB.tasks.list();
    renderKanban();
    updateTaskCount();
  }

  function renderKanban() {
    const container = $("#kanban-board");
    if (!container) return;
    container.innerHTML = "";

    STATUS_COLUMNS.forEach((status) => {
      const tasks = cachedTasks.filter((t) => t.status === status);
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
      
      // Drag and drop events on column
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
    const agent = cachedAgents.find((a) => a.id === task.assigneeId);
    const card = createEl("div", "task-card");
    card.dataset.taskId = task.id;
    card.draggable = true;
    
    card.innerHTML = `
      <div class="task-title">${escapeHtml(task.title)}</div>
      <div class="task-meta">
        <span class="badge ${PRIORITY_COLORS[task.priority] || "badge-neutral"}">${task.priority}</span>
        <span>${agent ? agent.emoji : "—"}</span>
      </div>
    `;
    
    // Drag events
    card.addEventListener("dragstart", handleDragStart);
    card.addEventListener("dragend", handleDragEnd);
    
    // Click to show details/blockers
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
    
    // Remove all drag-over highlights
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
    
    // Update task in database
    try {
      await window.DB.tasks.update(taskId, { status: newStatus });
      showToast(`Task moved to ${STATUS_LABELS[newStatus]}`, "success");
      await loadTasks(); // Refresh the board
    } catch (err) {
      console.error("Failed to update task:", err);
      showToast("Failed to move task", "error");
    }
  }

  // ============ Task Detail Modal ============

  function openTaskDetail(task) {
    editingTaskId = task.id;
    const agent = cachedAgents.find(a => a.id === task.assigneeId);
    
    const modal = $("#task-modal");
    const title = $("#modal-title");
    const form = $("#task-form");
    const footer = $(".modal-footer");
    
    title.textContent = task.title;
    
    // Determine blockers based on task state
    let blockers = [];
    if (task.status === "inbox") {
      blockers.push("Not yet assigned or started");
    }
    if (task.description && task.description.toLowerCase().includes("waiting")) {
      blockers.push("Waiting on external dependency");
    }
    if (task.description && task.description.toLowerCase().includes("api key")) {
      blockers.push("Missing API key or credentials");
    }
    if (task.description && task.description.toLowerCase().includes("approval")) {
      blockers.push("Needs approval");
    }
    if (task.description && task.description.toLowerCase().includes("decision")) {
      blockers.push("Pending decision");
    }
    if (task.priority === "urgent" && task.status !== "in_progress") {
      blockers.push("Urgent task not yet in progress");
    }
    
    form.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: var(--space-md);">
        <div class="form-group">
          <label class="form-label">Status</label>
          <div style="display: flex; align-items: center; gap: var(--space-sm);">
            <span class="badge badge-cyan">${STATUS_LABELS[task.status]}</span>
            <span class="badge ${PRIORITY_COLORS[task.priority]}">${task.priority} priority</span>
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">Assigned To</label>
          <div style="color: var(--text-primary);">
            ${agent ? `${agent.emoji} ${agent.name} (${agent.role})` : 'Unassigned'}
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">Description</label>
          <div style="color: var(--text-secondary); white-space: pre-wrap; background: var(--bg-primary); padding: var(--space-sm); border-radius: var(--radius-sm); max-height: 120px; overflow-y: auto;">
            ${escapeHtml(task.description) || 'No description'}
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label" style="color: ${blockers.length > 0 ? 'var(--accent-amber)' : 'var(--accent-green)'};">
            ${blockers.length > 0 ? '⚠️ Blockers' : '✅ No Blockers'}
          </label>
          <div style="display: flex; flex-direction: column; gap: var(--space-xs);">
            ${blockers.length > 0 
              ? blockers.map(b => `
                  <div style="display: flex; align-items: center; gap: var(--space-xs); padding: 8px; background: rgba(255, 184, 0, 0.1); border: 1px solid rgba(255, 184, 0, 0.3); border-radius: var(--radius-sm); font-size: var(--text-caption); color: var(--accent-amber);">
                    <span>🚧</span> ${escapeHtml(b)}
                  </div>
                `).join('')
              : `<div style="padding: 8px; background: rgba(0, 255, 136, 0.1); border: 1px solid rgba(0, 255, 136, 0.3); border-radius: var(--radius-sm); font-size: var(--text-caption); color: var(--accent-green);">
                  Ready to progress
                </div>`
            }
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
          await window.DB.tasks.update(task.id, { status: nextStatus });
          showToast(`Task moved to ${STATUS_LABELS[nextStatus]}`, "success");
          closeTaskModal();
          await loadTasks();
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
    editingTaskId = task?.id || null;
    
    const modal = $("#task-modal");
    const title = $("#modal-title");
    const footer = $(".modal-footer");
    const form = $("#task-form");
    
    title.textContent = task ? "Edit Task" : "New Task";
    
    // Restore original form
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
          <label class="form-label" for="task-priority">Priority</label>
          <select id="task-priority" class="input select">
            <option value="low">Low</option>
            <option value="medium" selected>Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
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
    
    // Repopulate assignee dropdown
    populateAssigneeSelect();
    
    // Populate if editing
    if (task) {
      $("#task-title-input").value = task.title || "";
      $("#task-desc").value = task.description || "";
      $("#task-priority").value = task.priority || "medium";
      $("#task-assignee").value = task.assigneeId || "";
      $("#task-status").value = task.status || "inbox";
    }
    
    // Restore footer
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
    
    const taskData = {
      title: $("#task-title-input").value.trim(),
      description: $("#task-desc").value.trim(),
      priority: $("#task-priority").value,
      assigneeId: $("#task-assignee").value || null,
      status: $("#task-status").value,
    };
    
    if (!taskData.title) {
      showToast("Please enter a task title", "warning");
      return;
    }
    
    try {
      if (editingTaskId) {
        await window.DB.tasks.update(editingTaskId, taskData);
        showToast("Task updated", "success");
      } else {
        await window.DB.tasks.add(taskData);
        showToast("Task created", "success");
      }
      
      closeTaskModal();
      await loadTasks();
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
    
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeTaskModal();
    });
  }

  async function init() {
    bindEvents();
    await loadAgents();
    await loadTasks();
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
  };
})();
