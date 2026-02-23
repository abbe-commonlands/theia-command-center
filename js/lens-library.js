// ── Lens Library Tab ─────────────────────────────────────────────────────
// Manages design catalog: grid view, filters, detail panel, new design modal.

(function() {
  "use strict";

  let allDesigns = [];
  let agents = [];
  let filters = { mount: "", status: "", patentClearance: "", assignedTo: "" };

  // ── Status helpers ───────────────────────────────────────────────
  const STATUS_LABELS = {
    concept: "Concept", initial_design: "Initial Design", optimizing: "Optimizing",
    tolerance_analysis: "Tolerance", ready_for_mfg: "Ready for Mfg",
    released: "Released", archived: "Archived"
  };
  const PATENT_ICONS = {
    clear: '<span class="patent-dot patent-dot-clear" title="Patent clear"></span>',
    risk:  '<span class="patent-dot patent-dot-risk" title="Patent risk"></span>',
    blocked: '<span class="patent-dot patent-dot-blocked" title="Patent blocked"></span>',
    not_checked: '<span class="patent-dot patent-dot-not_checked" title="Patent unchecked"></span>',
  };

  function statusBadge(status) {
    const label = STATUS_LABELS[status] || status;
    return `<span class="badge badge-${status}">${label}</span>`;
  }
  function mountBadge(mount) {
    return `<span class="badge badge-initial" style="font-family:var(--font-mono)">${mount}</span>`;
  }
  function fmt(val, unit = "", dp = 1) {
    if (val === undefined || val === null) return "—";
    return typeof val === "number" ? `${val.toFixed(dp)}${unit}` : `${val}${unit}`;
  }
  function fmtDate(ts) {
    if (!ts) return "—";
    return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  // ── Render design card ───────────────────────────────────────────
  function renderDesignCard(d) {
    const patentIcon = PATENT_ICONS[d.patentClearance || "not_checked"] || "";
    const mfStr  = d.currentMFValue !== undefined ? d.currentMFValue.toFixed(3) : "—";
    const rmsStr = d.rmsSpotUm !== undefined ? `${d.rmsSpotUm.toFixed(1)} µm` : "—";
    return `
      <div class="design-card" data-id="${d._id}">
        <div class="design-card-header">
          <div>
            <div class="design-card-name">${escHtml(d.name)}</div>
            <div class="design-card-form">${escHtml(d.designForm)}</div>
          </div>
          <div class="design-card-badges">
            ${patentIcon}
            ${mountBadge(d.mount)}
            ${statusBadge(d.status)}
          </div>
        </div>
        <div class="spec-grid">
          <span class="spec-label">f/#</span>     <span class="spec-value">${fmt(d.fNumber, "", 1)}</span>
          <span class="spec-label">FOV</span>     <span class="spec-value">${fmt(d.fovDeg, "°", 1)}</span>
          <span class="spec-label">FL</span>      <span class="spec-value">${fmt(d.focalLength, " mm", 1)}</span>
          <span class="spec-label">Sensor</span>  <span class="spec-value">${d.sensorFormat || "—"}</span>
          <span class="spec-label">Elements</span><span class="spec-value">${d.elementCount !== undefined ? d.elementCount + "E" + (d.groupCount ? "/" + d.groupCount + "G" : "") : "—"}</span>
          <span class="spec-label">Stop</span>    <span class="spec-value">${d.stopPosition || "—"}</span>
        </div>
        <div class="design-card-footer">
          <div class="perf-metric">
            <span class="perf-metric-value">${mfStr}</span>
            <span class="perf-metric-label">MF</span>
          </div>
          <div class="perf-metric">
            <span class="perf-metric-value">${rmsStr}</span>
            <span class="perf-metric-label">RMS spot</span>
          </div>
          <div class="perf-metric">
            <span class="perf-metric-value">${fmt(d.mtfAt100, "", 2)}</span>
            <span class="perf-metric-label">MTF@100</span>
          </div>
          <span style="font-size:11px;color:var(--text-muted)">${fmtDate(d.updatedAt)}</span>
        </div>
      </div>
    `;
  }

  // ── Render design detail panel ───────────────────────────────────
  function renderDesignDetail(d) {
    const panel = document.getElementById("design-detail-panel");
    const title = document.getElementById("design-detail-name");
    const body  = document.getElementById("design-detail-body");
    if (!panel || !body) return;

    title.textContent = d.name;
    panel.classList.remove("hidden");

    body.innerHTML = `
      <div class="design-detail-section">
        <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
          ${mountBadge(d.mount)} ${statusBadge(d.status)}
          ${(PATENT_ICONS[d.patentClearance || "not_checked"] || "")}
          <span class="text-xs text-muted">Patent: ${d.patentClearance || "not checked"}</span>
        </div>
        <div class="spec-grid" style="grid-template-columns:1fr 1fr;gap:4px 24px">
          <span class="spec-label">Design Form</span><span class="spec-value">${escHtml(d.designForm)}</span>
          <span class="spec-label">Focal Length</span><span class="spec-value">${fmt(d.focalLength, " mm")}</span>
          <span class="spec-label">f/#</span><span class="spec-value">${fmt(d.fNumber)}</span>
          <span class="spec-label">FOV (diag)</span><span class="spec-value">${fmt(d.fovDeg, "°")}</span>
          <span class="spec-label">Image Circle</span><span class="spec-value">${fmt(d.imageCircleMm, " mm")}</span>
          <span class="spec-label">Sensor Format</span><span class="spec-value">${d.sensorFormat || "—"}</span>
          <span class="spec-label">Elements/Groups</span><span class="spec-value">${d.elementCount !== undefined ? d.elementCount + "E" + (d.groupCount ? " / " + d.groupCount + "G" : "") : "—"}</span>
          <span class="spec-label">Stop</span><span class="spec-value">${d.stopPosition || "—"}</span>
          <span class="spec-label">TTL</span><span class="spec-value">${fmt(d.ttlMm, " mm")}</span>
          <span class="spec-label">Zemax File</span><span class="spec-value mono" style="font-size:10px">${d.zemaxFile ? d.zemaxFile.split(/[/\\]/).pop() : "—"}</span>
        </div>
      </div>

      <div class="design-detail-section">
        <h4>Performance</h4>
        <div class="spec-grid" style="grid-template-columns:1fr 1fr;gap:4px 24px">
          <span class="spec-label">Merit Function</span><span class="spec-value mono">${fmt(d.currentMFValue, "", 4)}</span>
          <span class="spec-label">RMS Spot</span><span class="spec-value">${fmt(d.rmsSpotUm, " µm")}</span>
          <span class="spec-label">MTF @ 100 lp/mm</span><span class="spec-value">${fmt(d.mtfAt100, "", 3)}</span>
          <span class="spec-label">Max Distortion</span><span class="spec-value">${fmt(d.distortionPct, "%")}</span>
        </div>
      </div>

      ${d.notes ? `
      <div class="design-detail-section">
        <h4>Notes</h4>
        <p style="font-size:12px;color:var(--text-secondary);line-height:1.6">${escHtml(d.notes)}</p>
      </div>` : ""}

      <div class="design-detail-section">
        <h4>Quick Actions</h4>
        <div style="display:flex;flex-direction:column;gap:8px">
          <button class="btn btn-ghost btn-sm" onclick="switchToTab('optimization-log')">⚡ View Optimization Runs</button>
          <button class="btn btn-ghost btn-sm" onclick="switchToTab('tolerance-tracker')">📐 View Tolerance Analysis</button>
          <button class="btn btn-ghost btn-sm" onclick="switchToTab('patent-map')">📋 Patent Map</button>
        </div>
      </div>
    `;
  }

  // ── Filter + Render grid ─────────────────────────────────────────
  function applyFilters() {
    let result = allDesigns;
    if (filters.mount)          result = result.filter(d => d.mount === filters.mount);
    if (filters.status)         result = result.filter(d => d.status === filters.status);
    if (filters.patentClearance) result = result.filter(d => (d.patentClearance || "not_checked") === filters.patentClearance);
    return result;
  }

  function renderGrid() {
    const grid = document.getElementById("design-grid");
    const countEl = document.getElementById("design-list-count");
    const navBadge = document.getElementById("design-count");
    if (!grid) return;

    const filtered = applyFilters();
    countEl && (countEl.textContent = `${filtered.length} design${filtered.length !== 1 ? "s" : ""}`);
    navBadge && (navBadge.textContent = allDesigns.length);

    if (!filtered.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">🔭</div><p>No designs match filters.</p></div>`;
      return;
    }
    grid.innerHTML = filtered.map(renderDesignCard).join("");
    grid.querySelectorAll(".design-card").forEach(card => {
      card.addEventListener("click", () => {
        const d = allDesigns.find(d => d._id === card.dataset.id);
        if (d) renderDesignDetail(d);
      });
    });
  }

  // ── Active designs sidebar ───────────────────────────────────────
  function renderActiveSidebar(designs) {
    const el = document.getElementById("active-designs-sidebar");
    if (!el) return;
    if (!designs || !designs.length) {
      el.innerHTML = `<div style="font-size:11px;color:var(--text-muted);padding:4px 0">No active designs</div>`;
      return;
    }
    el.innerHTML = designs.map(d => `
      <div class="active-design-item ${d.status}" data-id="${d._id}" title="${escHtml(d.name)}">
        <div class="adi-name truncate">${escHtml(d.name)}</div>
        <div class="adi-meta">
          ${mountBadge(d.mount)} ${statusBadge(d.status)}
        </div>
      </div>
    `).join("");
    el.querySelectorAll(".active-design-item").forEach(el => {
      el.addEventListener("click", () => {
        switchToTab("lens-library");
        setTimeout(() => {
          const d = allDesigns.find(d => d._id === el.dataset.id);
          if (d) renderDesignDetail(d);
        }, 50);
      });
    });
  }

  // ── Filter pill wiring ───────────────────────────────────────────
  function wirePillGroup(containerId, key) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.addEventListener("click", e => {
      const pill = e.target.closest(".pill");
      if (!pill) return;
      container.querySelectorAll(".pill").forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      filters[key] = pill.dataset.value || "";
      renderGrid();
    });
  }

  // ── New design modal ─────────────────────────────────────────────
  function setupNewDesignModal() {
    const btn      = document.getElementById("new-design-btn");
    const overlay  = document.getElementById("new-design-modal-overlay");
    const closeBtn = document.getElementById("close-new-design");
    const cancelBtn= document.getElementById("cancel-new-design");
    const submitBtn= document.getElementById("submit-new-design");
    if (!btn || !overlay) return;

    btn.addEventListener("click", () => {
      populateAssigneeSelects();
      overlay.classList.remove("hidden");
    });
    [closeBtn, cancelBtn].forEach(b => b && b.addEventListener("click", () => overlay.classList.add("hidden")));
    overlay.addEventListener("click", e => { if (e.target === overlay) overlay.classList.add("hidden"); });

    submitBtn && submitBtn.addEventListener("click", async () => {
      const name = document.getElementById("nd-name")?.value?.trim();
      const form = document.getElementById("nd-form")?.value?.trim();
      const mount = document.getElementById("nd-mount")?.value;
      if (!name || !form || !mount) { alert("Name, design form, and mount are required."); return; }

      const args = {
        name, designForm: form, mount,
        status: document.getElementById("nd-status")?.value || "concept",
        focalLength: parseFloatOrUndef("nd-fl"),
        fNumber: parseFloatOrUndef("nd-fno"),
        fovDeg: parseFloatOrUndef("nd-fov"),
        sensorFormat: document.getElementById("nd-sensor")?.value?.trim() || undefined,
        elementCount: parseIntOrUndef("nd-elements"),
        groupCount: parseIntOrUndef("nd-groups"),
        stopPosition: document.getElementById("nd-stop")?.value || undefined,
        assignedTo: document.getElementById("nd-assignee")?.value || undefined,
        notes: document.getElementById("nd-notes")?.value?.trim() || undefined,
      };

      try {
        await window.DB.mutation("lensDesigns:create", args);
        overlay.classList.add("hidden");
        clearNewDesignForm();
      } catch (e) { alert("Error creating design: " + e.message); }
    });
  }

  function clearNewDesignForm() {
    ["nd-name","nd-form","nd-fl","nd-fno","nd-fov","nd-sensor","nd-elements","nd-groups","nd-notes"]
      .forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
  }

  function parseFloatOrUndef(id) {
    const v = parseFloat(document.getElementById(id)?.value || "");
    return isNaN(v) ? undefined : v;
  }
  function parseIntOrUndef(id) {
    const v = parseInt(document.getElementById(id)?.value || "");
    return isNaN(v) ? undefined : v;
  }

  function populateAssigneeSelects() {
    ["nd-assignee", "new-task-assignee"].forEach(id => {
      const sel = document.getElementById(id);
      if (!sel) return;
      sel.innerHTML = '<option value="">Unassigned</option>' +
        agents.map(a => `<option value="${a._id}">${a.emoji} ${a.name}</option>`).join("");
    });
  }

  // ── Subscriptions ────────────────────────────────────────────────
  function initLensLibrary() {
    wirePillGroup("filter-mount", "mount");
    wirePillGroup("filter-status", "status");
    wirePillGroup("filter-patent", "patentClearance");
    setupNewDesignModal();

    document.getElementById("close-design-detail")?.addEventListener("click", () => {
      document.getElementById("design-detail-panel")?.classList.add("hidden");
    });

    // Subscribe to designs
    window.DB.subscribe("lensDesigns:list", {}, designs => {
      allDesigns = designs || [];
      renderGrid();
    });

    // Subscribe to active designs for sidebar
    window.DB.subscribe("lensDesigns:listActive", {}, designs => {
      renderActiveSidebar(designs || []);
    });

    // Subscribe to agents for filter pills + forms
    window.DB.subscribe("agents:list", {}, agentList => {
      agents = agentList || [];
      const filterContainer = document.getElementById("filter-assignee");
      if (filterContainer) {
        filterContainer.innerHTML = '<button class="pill active" data-value="">All</button>' +
          agents.map(a => `<button class="pill" data-value="${a._id}">${a.emoji} ${a.name}</button>`).join("");
        filterContainer.addEventListener("click", e => {
          const pill = e.target.closest(".pill");
          if (!pill) return;
          filterContainer.querySelectorAll(".pill").forEach(p => p.classList.remove("active"));
          pill.classList.add("active");
          filters.assignedTo = pill.dataset.value || "";
          renderGrid();
        });
      }
    });
  }

  // Expose init
  window.initLensLibrary = initLensLibrary;

  function escHtml(s) {
    if (!s) return "";
    return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }
  function switchToTab(tabName) {
    document.querySelector(`[data-tab="${tabName}"]`)?.click();
  }

})();
