// ── Mission Control Tab ──────────────────────────────────────────────────
// Agent squad sidebar, kanban task board, task detail panel.

(function() {
  "use strict";

  let agents = [];
  let tasks  = [];
  let selectedTaskId = null;

  function escHtml(s) {
    if (!s) return "";
    return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }
  function timeAgo(ts) {
    if (!ts) return "";
    const mins = Math.floor((Date.now() - ts) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  // ── Agent sidebar ────────────────────────────────────────────────
  function renderAgentsCompact() {
    const list = document.getElementById("agents-compact-list");
    const countEl = document.getElementById("agent-count");
    if (!list) return;

    countEl && (countEl.textContent = `${agents.length} agent${agents.length !== 1 ? "s" : ""}`);

    if (!agents.length) {
      list.innerHTML = `<div style="font-size:11px;color:var(--text-muted);padding:8px">No agents registered</div>`;
      return;
    }
    list.innerHTML = agents.map(a => {
      const ctxPct = a.contextPercent || 0;
      const ctxColor = ctxPct >= 80 ? "var(--accent-red)" : ctxPct >= 60 ? "var(--accent-amber)" : "var(--accent-green)";
      const curTask = tasks.find(t => a.currentTaskId && t._id === a.currentTaskId);
      return `
        <div class="agent-compact-card" data-id="${a._id}">
          <div class="agent-compact-top">
            <span class="agent-compact-emoji">${a.emoji}</span>
            <span class="agent-compact-name">${escHtml(a.name)}</span>
            <span class="agent-status-dot ${a.status}" title="${a.status}"></span>
          </div>
          <div class="agent-compact-meta">
            <span class="agent-compact-role">${escHtml(a.role)}</span>
            <span style="font-size:10px;color:${ctxColor}">${ctxPct > 0 ? ctxPct + "% ctx" : ""}</span>
          </div>
          ${ctxPct > 0 ? `
          <div class="agent-compact-context-row">
            <div class="agent-compact-context">
              <div class="agent-compact-context-bar" style="width:${ctxPct}%;background:${ctxColor}"></div>
            </div>
          </div>` : ""}
          ${curTask ? `<div class="agent-compact-task" title="${escHtml(curTask.title)}">↳ ${escHtml(curTask.title)}</div>` : ""}
          ${a.lastActiveAt ? `<div style="font-size:10px;color:var(--text-muted)">${timeAgo(a.lastActiveAt)}</div>` : ""}
        </div>
      `;
    }).join("");

    list.querySelectorAll(".agent-compact-card").forEach(card => {
      card.addEventListener("click", () => {
        const a = agents.find(a => a._id === card.dataset.id);
        if (a) openAgentModal(a);
      });
    });
  }

  // ── Agent detail modal ────────────────────────────────────────────
  function openAgentModal(agent) {
    const overlay = document.getElementById("agent-modal-overlay");
    const title   = document.getElementById("agent-modal-title");
    const body    = document.getElementById("agent-modal-body");
    if (!overlay || !body) return;

    title.textContent = `${agent.emoji} ${agent.name}`;
    overlay.classList.remove("hidden");

    const ctxPct = agent.contextPercent || 0;
    const ctxColor = ctxPct >= 80 ? "var(--accent-red)" : ctxPct >= 60 ? "var(--accent-amber)" : "var(--accent-green)";
    const agentTasks = tasks.filter(t => t.assigneeIds?.includes(agent._id) && t.status !== "done");

    body.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:16px">
        <div class="spec-grid" style="grid-template-columns:auto 1fr;gap:4px 16px">
          <span class="spec-label">Role</span>     <span>${escHtml(agent.role)}</span>
          <span class="spec-label">Status</span>   <span><span class="agent-status-dot ${agent.status}" style="display:inline-block"></span> ${agent.status}</span>
          <span class="spec-label">Model</span>    <span class="mono" style="font-size:11px">${escHtml(agent.model || "—")}</span>
          <span class="spec-label">Session</span>  <span class="mono" style="font-size:10px">${escHtml(agent.sessionKey)}</span>
          <span class="spec-label">Last active</span><span>${timeAgo(agent.lastActiveAt)}</span>
        </div>

        ${ctxPct > 0 ? `
        <div>
          <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:11px">
            <span style="color:var(--text-muted)">Context usage</span>
            <span style="color:${ctxColor};font-weight:600">${ctxPct}%</span>
          </div>
          <div style="height:6px;background:var(--bg-active);border-radius:3px;overflow:hidden">
            <div style="height:100%;width:${ctxPct}%;background:${ctxColor};border-radius:3px;transition:width 0.3s"></div>
          </div>
          ${agent.contextUsed ? `<div style="font-size:10px;color:var(--text-muted);margin-top:2px">${agent.contextUsed?.toLocaleString()} / ${agent.contextCap?.toLocaleString()} tokens</div>` : ""}
        </div>` : ""}

        ${agent.lastSleepNote ? `
        <div>
          <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;font-weight:600;margin-bottom:4px">Last sleep note</div>
          <p style="font-size:12px;color:var(--text-secondary);line-height:1.5">${escHtml(agent.lastSleepNote)}</p>
        </div>` : ""}

        ${agentTasks.length ? `
        <div>
          <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;font-weight:600;margin-bottom:8px">Active Tasks (${agentTasks.length})</div>
          ${agentTasks.map(t => `
            <div style="padding:6px 8px;background:var(--bg-elevated);border-radius:4px;margin-bottom:4px;font-size:12px;border-left:2px solid var(--accent-blue)">
              ${escHtml(t.title)}
            </div>
          `).join("")}
        </div>` : ""}
      </div>
    `;
  }

  // ── Kanban board ─────────────────────────────────────────────────
  const COLUMNS = ["inbox", "in_progress", "review", "blocked", "done"];

  function priorityClass(p) {
    if (p >= 8) return "priority-high";
    if (p >= 4) return "priority-medium";
    return "priority-low";
  }

  function renderKanban() {
    const taskCount = document.getElementById("task-count");
    const activeTasks = tasks.filter(t => t.status !== "done" && t.status !== "archived");
    taskCount && (taskCount.textContent = activeTasks.length || "");

    COLUMNS.forEach(status => {
      const col = document.getElementById(`col-${status}`);
      const countEl = document.getElementById(`col-count-${status}`);
      if (!col) return;

      const colTasks = tasks.filter(t => t.status === status);
      countEl && (countEl.textContent = colTasks.length);

      if (!colTasks.length) {
        col.innerHTML = `<div style="font-size:11px;color:var(--text-muted);text-align:center;padding:16px">Empty</div>`;
        return;
      }
      col.innerHTML = colTasks
        .sort((a, b) => (b.priority || 5) - (a.priority || 5))
        .map(t => {
          const assigneeNames = (t.assigneeIds || [])
            .map(id => agents.find(a => a._id === id)?.emoji || "")
            .filter(Boolean).join("");
          return `
            <div class="kanban-card ${selectedTaskId === t._id ? "selected" : ""}" data-id="${t._id}">
              <div class="kanban-card-title">${escHtml(t.title)}</div>
              <div class="kanban-card-meta">
                <span class="kanban-card-assignee">${assigneeNames}</span>
                <span class="priority-dot ${priorityClass(t.priority || 5)}" title="Priority ${t.priority}"></span>
              </div>
            </div>
          `;
        }).join("");

      col.querySelectorAll(".kanban-card").forEach(card => {
        card.addEventListener("click", () => openTaskDetail(card.dataset.id));
      });
    });
  }

  // ── Task detail panel ─────────────────────────────────────────────
  function openTaskDetail(taskId) {
    selectedTaskId = taskId;
    const task = tasks.find(t => t._id === taskId);
    const panel = document.getElementById("task-detail-panel");
    const title = document.getElementById("task-detail-title");
    const body  = document.getElementById("task-detail-body");
    if (!panel || !task || !body) return;

    panel.classList.remove("hidden");
    title.textContent = task.title;

    const assignees = (task.assigneeIds || [])
      .map(id => agents.find(a => a._id === id))
      .filter(Boolean);

    const statusOptions = ["inbox","assigned","in_progress","review","done","blocked"]
      .map(s => `<option value="${s}" ${task.status === s ? "selected" : ""}>${s.replace(/_/g," ")}</option>`)
      .join("");

    body.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:16px">
        <div class="spec-grid" style="grid-template-columns:auto 1fr;gap:4px 16px;font-size:12px">
          <span class="spec-label">Status</span>
          <select class="select-input" style="font-size:11px;padding:2px 6px;height:auto" id="task-status-sel">${statusOptions}</select>
          <span class="spec-label">Priority</span>
          <span>${task.priority || "—"} / 10</span>
          <span class="spec-label">Assignees</span>
          <span>${assignees.map(a => `${a.emoji} ${a.name}`).join(", ") || "Unassigned"}</span>
          ${task.dueAt ? `<span class="spec-label">Due</span><span>${new Date(task.dueAt).toLocaleDateString()}</span>` : ""}
        </div>

        ${task.description ? `
        <div>
          <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;font-weight:600;margin-bottom:4px">Description</div>
          <p style="font-size:12px;color:var(--text-secondary);line-height:1.6">${escHtml(task.description)}</p>
        </div>` : ""}

        ${task.blockedReason ? `
        <div style="padding:8px 12px;background:var(--accent-red-bg);border:1px solid var(--accent-red);border-radius:6px;font-size:12px;color:var(--accent-red)">
          🚫 Blocked: ${escHtml(task.blockedReason)}
        </div>` : ""}

        ${task.deliverables ? `
        <div>
          <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;font-weight:600;margin-bottom:4px">Deliverables</div>
          <p style="font-size:12px;color:var(--text-secondary);line-height:1.5">${escHtml(task.deliverables)}</p>
        </div>` : ""}
      </div>
    `;

    // Status change
    document.getElementById("task-status-sel")?.addEventListener("change", async e => {
      try {
        await window.DB.mutation("tasks:updateStatus", { id: taskId, status: e.target.value });
      } catch (err) { console.error("Status update failed:", err); }
    });
  }

  // ── New task modal ────────────────────────────────────────────────
  function setupNewTaskModal() {
    const btn      = document.getElementById("new-task-btn");
    const overlay  = document.getElementById("new-task-modal-overlay");
    const closeBtn = document.getElementById("close-new-task");
    const cancelBtn= document.getElementById("cancel-new-task");
    const submitBtn= document.getElementById("submit-new-task");
    if (!btn) return;

    function openModal() {
      const sel = document.getElementById("new-task-assignee");
      if (sel) {
        sel.innerHTML = '<option value="">Unassigned</option>' +
          agents.map(a => `<option value="${a._id}">${a.emoji} ${a.name}</option>`).join("");
      }
      const dsel = document.getElementById("new-task-design");
      if (dsel) {
        window.DB.query("lensDesigns:list", {}).then(designs => {
          dsel.innerHTML = '<option value="">None</option>' +
            (designs || []).map(d => `<option value="${d._id}">${d.name}</option>`).join("");
        });
      }
      overlay?.classList.remove("hidden");
    }

    btn.addEventListener("click", openModal);
    [closeBtn, cancelBtn].forEach(b => b?.addEventListener("click", () => overlay?.classList.add("hidden")));
    overlay?.addEventListener("click", e => { if (e.target === overlay) overlay.classList.add("hidden"); });

    submitBtn?.addEventListener("click", async () => {
      const title = document.getElementById("new-task-title")?.value?.trim();
      if (!title) { alert("Title is required."); return; }
      const assigneeId = document.getElementById("new-task-assignee")?.value;
      const priority = parseInt(document.getElementById("new-task-priority")?.value) || 5;
      const desc = document.getElementById("new-task-desc")?.value?.trim();
      const designId = document.getElementById("new-task-design")?.value;
      try {
        await window.DB.mutation("tasks:create", {
          title,
          description: desc || undefined,
          priority,
          assigneeIds: assigneeId ? [assigneeId] : [],
          status: "inbox",
          relatedDesignId: designId || undefined,
        });
        overlay?.classList.add("hidden");
        ["new-task-title","new-task-desc"].forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
        document.getElementById("new-task-priority") && (document.getElementById("new-task-priority").value = "5");
      } catch (e) { alert("Error: " + e.message); }
    });
  }

  // ── Mission Control init ──────────────────────────────────────────
  function initMission() {
    // Close panels
    document.getElementById("close-task-detail")?.addEventListener("click", () => {
      document.getElementById("task-detail-panel")?.classList.add("hidden");
      selectedTaskId = null;
    });
    document.getElementById("close-agent-modal")?.addEventListener("click", () => {
      document.getElementById("agent-modal-overlay")?.classList.add("hidden");
    });
    document.getElementById("agent-modal-overlay")?.addEventListener("click", e => {
      if (e.target === document.getElementById("agent-modal-overlay"))
        document.getElementById("agent-modal-overlay").classList.add("hidden");
    });

    setupNewTaskModal();

    window.DB.subscribe("agents:list", {}, a => { agents = a || []; renderAgentsCompact(); renderKanban(); });
    window.DB.subscribe("tasks:list", {}, t => { tasks = t || []; renderKanban(); });
  }

  window.initMission = initMission;

  // Mission control is the default tab — init immediately
  document.addEventListener("DOMContentLoaded", () => initMission());

})();
