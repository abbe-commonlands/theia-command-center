// ── Tolerance Tracker Tab ────────────────────────────────────────────────
(function() {
  "use strict";

  let latestAnalyses = [];
  let designs = [];

  function escHtml(s) {
    if (!s) return ""; return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }
  function fmtDate(ts) {
    if (!ts) return "—";
    return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function yieldClass(pct) {
    if (pct === undefined || pct === null) return "";
    if (pct >= 95) return "yield-high";
    if (pct >= 80) return "yield-medium";
    return "yield-low";
  }
  function riskBadge(risk) {
    if (!risk) return "";
    const colors = { low: "var(--accent-green)", medium: "var(--accent-amber)", high: "var(--accent-red)", unacceptable: "var(--accent-red)" };
    const icons  = { low: "✅", medium: "⚠️", high: "🔴", unacceptable: "🚫" };
    return `<span class="badge" style="color:${colors[risk]};border-color:${colors[risk]}">${icons[risk]} ${risk}</span>`;
  }

  // ── Render tolerance card ────────────────────────────────────────
  function renderTolCard(analysis) {
    const yPct = analysis.yieldPercent;
    const yStr = yPct !== undefined ? `${yPct.toFixed(0)}%` : "—";

    return `
      <div class="tol-card" data-id="${analysis._id}">
        <div class="tol-card-header">
          <span class="tol-card-name">${escHtml(analysis.designName)}</span>
          ${riskBadge(analysis.mfgRisk)}
        </div>

        <div class="tol-yield ${yieldClass(yPct)}">${yStr}</div>
        <div style="text-align:center;font-size:11px;color:var(--text-muted);margin-bottom:12px">predicted yield</div>

        <div class="tol-card-meta">
          ${analysis.rssRmsSpotUm !== undefined ? `<span>RSS RMS: ${analysis.rssRmsSpotUm.toFixed(1)} µm @ 3σ</span>` : ""}
          <span>Run ${fmtDate(analysis.runAt)}</span>
          <span>by ${escHtml(analysis.runByName)}</span>
        </div>

        ${analysis.worstCaseSensitivity ? `
        <div class="tol-worst">Worst: <span style="color:var(--accent-amber)">${escHtml(analysis.worstCaseSensitivity)}</span></div>` : ""}

        <div style="margin-top:8px;font-size:11px;color:var(--text-link)">Click for detail →</div>
      </div>
    `;
  }

  // ── Render modal body ────────────────────────────────────────────
  function renderTolModal(analysis) {
    const overlay = document.getElementById("tol-modal-overlay");
    const title   = document.getElementById("tol-modal-title");
    const body    = document.getElementById("tol-modal-body");
    if (!overlay || !body) return;

    title.textContent = `${analysis.designName} — Tolerance Analysis`;
    overlay.classList.remove("hidden");

    const crits = analysis.criticalTolerances || [];
    const tableHtml = crits.length ? `
      <table class="tol-critical-table">
        <thead>
          <tr>
            <th>Parameter</th>
            <th>Nominal</th>
            <th>+Tol</th>
            <th>-Tol</th>
            <th>Sensitivity</th>
            <th>Risk</th>
          </tr>
        </thead>
        <tbody>
          ${crits.map(c => `
            <tr>
              <td>${escHtml(c.parameter)}</td>
              <td>${c.nominalValue.toFixed(4)}</td>
              <td>+${c.tolerancePlus.toFixed(4)}</td>
              <td>-${c.toleranceMinus.toFixed(4)}</td>
              <td>${c.sensitivity.toFixed(4)}</td>
              <td class="risk-${c.riskLevel}">${c.riskLevel.toUpperCase()}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    ` : `<div style="color:var(--text-muted);font-size:12px">No critical tolerances logged.</div>`;

    body.innerHTML = `
      <div style="display:flex;gap:24px;flex-wrap:wrap;margin-bottom:16px">
        <div class="opt-stat">
          <span class="tol-yield ${analysis.yieldPercent >= 95 ? 'yield-high' : analysis.yieldPercent >= 80 ? 'yield-medium' : 'yield-low'}" style="font-size:28px">
            ${analysis.yieldPercent !== undefined ? analysis.yieldPercent.toFixed(0) + "%" : "—"}
          </span>
          <span class="opt-stat-label">Predicted Yield</span>
        </div>
        <div class="opt-stat">
          <span class="opt-stat-value" style="font-size:20px">${analysis.rssRmsSpotUm !== undefined ? analysis.rssRmsSpotUm.toFixed(1) + " µm" : "—"}</span>
          <span class="opt-stat-label">RSS RMS Spot @ 3σ</span>
        </div>
        <div>
          ${riskBadge(analysis.mfgRisk)}
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px">Mfg Risk</div>
        </div>
      </div>

      ${analysis.worstCaseSensitivity ? `
      <div style="margin-bottom:12px;padding:8px 12px;background:var(--accent-amber-bg);border:1px solid var(--accent-amber);border-radius:6px;font-size:12px">
        ⚠️ Worst sensitivity: <strong>${escHtml(analysis.worstCaseSensitivity)}</strong>
      </div>` : ""}

      <div style="margin-bottom:16px">
        <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;font-weight:600;margin-bottom:8px">Critical Tolerances</div>
        ${tableHtml}
      </div>

      ${analysis.recommendation ? `
      <div style="margin-bottom:12px;padding:12px;background:var(--bg-elevated);border-radius:6px;border:1px solid var(--border-default)">
        <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;font-weight:600;margin-bottom:4px">Recommendation</div>
        <p style="font-size:12px;color:var(--text-secondary);line-height:1.6">${escHtml(analysis.recommendation)}</p>
      </div>` : ""}

      ${analysis.notes ? `<p style="font-size:11px;color:var(--text-muted)">${escHtml(analysis.notes)}</p>` : ""}

      <div style="font-size:11px;color:var(--text-muted);margin-top:8px">
        Run by ${escHtml(analysis.runByName)} on ${fmtDate(analysis.runAt)}
      </div>
    `;
  }

  // ── Render grid ──────────────────────────────────────────────────
  function renderGrid() {
    const grid = document.getElementById("tol-grid");
    if (!grid) return;
    const designId = document.getElementById("tol-design-filter")?.value;
    let filtered = latestAnalyses;
    if (designId) filtered = filtered.filter(a => a.designId === designId);

    // Update risk badge count
    const riskCount = filtered.filter(a => a.mfgRisk === "high" || a.mfgRisk === "unacceptable").length;
    const badge = document.getElementById("tol-risk-count");
    if (badge) { badge.textContent = riskCount; badge.style.display = riskCount ? "" : "none"; }

    if (!filtered.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">📐</div><p>No tolerance analyses yet.<br><span style="font-size:11px">Quark or Photon will log results here.</span></p></div>`;
      return;
    }
    grid.innerHTML = filtered.map(renderTolCard).join("");
    grid.querySelectorAll(".tol-card").forEach(card => {
      card.addEventListener("click", () => {
        const a = latestAnalyses.find(a => a._id === card.dataset.id);
        if (a) renderTolModal(a);
      });
    });
  }

  // ── Populate design filter dropdown ─────────────────────────────
  function populateDesignFilter() {
    const sel = document.getElementById("tol-design-filter");
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = '<option value="">All designs</option>' +
      designs.map(d => `<option value="${d._id}" ${d._id === cur ? "selected" : ""}>${escHtml(d.name)}</option>`).join("");
  }

  // ── Init ─────────────────────────────────────────────────────────
  function initToleranceTracker() {
    document.getElementById("tol-design-filter")?.addEventListener("change", renderGrid);
    document.getElementById("close-tol-modal")?.addEventListener("click", () => {
      document.getElementById("tol-modal-overlay")?.classList.add("hidden");
    });
    document.getElementById("tol-modal-overlay")?.addEventListener("click", e => {
      if (e.target === document.getElementById("tol-modal-overlay")) {
        document.getElementById("tol-modal-overlay").classList.add("hidden");
      }
    });

    window.DB.subscribe("toleranceAnalyses:latestPerDesign", {}, analyses => {
      latestAnalyses = analyses || [];
      renderGrid();
    });
    window.DB.subscribe("lensDesigns:list", {}, d => {
      designs = d || [];
      populateDesignFilter();
    });
  }

  window.initToleranceTracker = initToleranceTracker;
})();
