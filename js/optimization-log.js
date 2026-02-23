// ── Optimization Log Tab ─────────────────────────────────────────────────
(function() {
  "use strict";

  let allRuns = [];
  let designs = [];
  let agents  = [];

  function escHtml(s) {
    if (!s) return "";
    return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }

  function fmtDuration(ms) {
    if (!ms) return "—";
    if (ms < 60000) return `${(ms/1000).toFixed(0)}s`;
    if (ms < 3600000) return `${(ms/60000).toFixed(1)}m`;
    return `${(ms/3600000).toFixed(1)}h`;
  }

  function fmtTime(ts) {
    if (!ts) return "—";
    return new Date(ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  }

  function fmtDate(ts) {
    if (!ts) return "—";
    const d = new Date(ts);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return `Today ${fmtTime(ts)}`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " + fmtTime(ts);
  }

  function statusBadge(status) {
    const colors = {
      running: "var(--accent-amber)", converged: "var(--accent-green)",
      stopped: "var(--text-muted)", failed: "var(--accent-red)"
    };
    return `<span class="badge" style="border-color:${colors[status]||"var(--border-default)"};color:${colors[status]||"var(--text-secondary)"}">${status}</span>`;
  }

  // ── Render single run card ───────────────────────────────────────
  function renderRunCard(run) {
    const isRunning  = run.status === "running";
    const improvement = run.mfImprovement;
    const impColor = improvement > 0 ? "var(--accent-green)" : improvement < 0 ? "var(--accent-red)" : "var(--text-muted)";
    const impSign  = improvement > 0 ? "▼" : improvement < 0 ? "▲" : "";
    const impStr   = improvement !== undefined
      ? `<span style="color:${impColor};font-weight:700">${impSign}${Math.abs(improvement).toFixed(1)}%</span>`
      : "—";

    const mfBefore = run.mfValueBefore?.toFixed(4) ?? "—";
    const mfAfter  = run.mfValueAfter?.toFixed(4)  ?? (isRunning ? "…" : "—");
    const rmsAfter = run.rmsSpotAfter  !== undefined ? `${run.rmsSpotAfter.toFixed(1)} µm` : (isRunning ? "…" : "—");

    return `
      <div class="opt-run-card ${isRunning ? "running" : ""}">
        <div>
          <div class="opt-run-name">${escHtml(run.designName)}</div>
          <div class="opt-run-meta">
            <span>by ${escHtml(run.runByName)}</span>
            <span>${run.algorithm || "DLS"}</span>
            <span>${run.meritFunction ? escHtml(run.meritFunction) : ""}</span>
            <span>${fmtDate(run.startedAt)}</span>
            ${run.iterationsCount ? `<span>${run.iterationsCount} iters</span>` : ""}
          </div>
          ${run.outputSummary ? `<div style="font-size:11px;color:var(--text-secondary);margin-top:4px;font-style:italic">${escHtml(run.outputSummary.slice(0,120))}${run.outputSummary.length > 120 ? "…" : ""}</div>` : ""}
        </div>

        <div class="opt-mf-change">
          ${mfBefore !== "—" ? `<span class="opt-mf-before">${mfBefore}</span>` : ""}
          <span class="opt-mf-after" style="color:${run.mfValueAfter !== undefined ? "var(--accent-blue)" : "var(--text-muted)"}">${mfAfter}</span>
          <span style="font-size:10px;color:var(--text-muted)">MF</span>
        </div>

        <div style="text-align:center;min-width:60px">
          ${impStr}
          <div style="font-size:10px;color:var(--text-muted)">improvement</div>
        </div>

        <div style="text-align:right;min-width:80px">
          ${statusBadge(run.status)}
          <div class="opt-duration" style="margin-top:4px">${fmtDuration(run.durationMs || (isRunning ? Date.now() - run.startedAt : undefined))}</div>
          <div style="font-size:10px;color:var(--text-muted);margin-top:2px">${rmsAfter}</div>
        </div>
      </div>
    `;
  }

  // ── Update summary bar ───────────────────────────────────────────
  function updateSummary(runs) {
    const today = new Date().toDateString();
    const todayRuns = runs.filter(r => new Date(r.startedAt).toDateString() === today);
    document.getElementById("opt-runs-today") && (document.getElementById("opt-runs-today").textContent = todayRuns.length);

    const completed = runs.filter(r => r.mfImprovement !== undefined && r.mfImprovement > 0);
    const best = completed.length ? Math.max(...completed.map(r => r.mfImprovement)) : null;
    const bestEl = document.getElementById("opt-best-improvement");
    if (bestEl) bestEl.textContent = best !== null ? `${best.toFixed(1)}%` : "—";

    const running = runs.filter(r => r.status === "running");
    const badge   = document.getElementById("opt-running-count");
    const label   = document.getElementById("opt-running-label");
    const indicator = document.getElementById("opt-running-indicator");
    if (badge) { badge.textContent = running.length; badge.style.display = running.length ? "" : "none"; }
    if (label) label.textContent = running.length ? `${running.length} running` : "None running";
    if (indicator) indicator.style.opacity = running.length ? "1" : "0.4";
  }

  // ── Apply filters ────────────────────────────────────────────────
  function applyFilters(runs) {
    const designId = document.getElementById("opt-design-filter")?.value;
    const agentId  = document.getElementById("opt-agent-filter")?.value;
    if (designId) runs = runs.filter(r => r.designId === designId);
    if (agentId)  runs = runs.filter(r => r.runBy === agentId);
    return runs;
  }

  // ── Render list ──────────────────────────────────────────────────
  function renderList() {
    const list = document.getElementById("opt-runs-list");
    if (!list) return;
    const filtered = applyFilters(allRuns);
    if (!filtered.length) {
      list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚡</div><p>No optimization runs yet.<br><span style="font-size:11px">Photon or Quark will log runs here.</span></p></div>`;
      return;
    }
    list.innerHTML = filtered.map(renderRunCard).join("");
  }

  // ── Populate filter dropdowns ────────────────────────────────────
  function populateFilters() {
    const designSel = document.getElementById("opt-design-filter");
    const agentSel  = document.getElementById("opt-agent-filter");
    if (designSel) {
      const cur = designSel.value;
      designSel.innerHTML = '<option value="">All designs</option>' +
        designs.map(d => `<option value="${d._id}" ${d._id === cur ? "selected" : ""}>${escHtml(d.name)}</option>`).join("");
    }
    if (agentSel) {
      const cur = agentSel.value;
      agentSel.innerHTML = '<option value="">All agents</option>' +
        agents.map(a => `<option value="${a._id}" ${a._id === cur ? "selected" : ""}>${a.emoji} ${a.name}</option>`).join("");
    }
  }

  // ── Init ─────────────────────────────────────────────────────────
  function initOptimizationLog() {
    document.getElementById("opt-design-filter")?.addEventListener("change", renderList);
    document.getElementById("opt-agent-filter")?.addEventListener("change", renderList);

    window.DB.subscribe("optimizationRuns:list", {}, runs => {
      allRuns = runs || [];
      updateSummary(allRuns);
      renderList();
    });
    window.DB.subscribe("lensDesigns:list", {}, d => { designs = d || []; populateFilters(); });
    window.DB.subscribe("agents:list", {}, a => { agents = a || []; populateFilters(); });

    // Auto-refresh running cards every 30s (update elapsed time)
    setInterval(() => {
      if (allRuns.some(r => r.status === "running")) renderList();
    }, 30000);
  }

  window.initOptimizationLog = initOptimizationLog;
})();
