// ── Design Guidelines Tab ────────────────────────────────────────────────
// Soft/weighted manufacturing + design constraints. Like memory for the ray tracer.
// Referenced by Qwen during optimization. Compounds over time.

(function() {
  "use strict";

  let allGuidelines = [];
  let activeCategory = "";
  let activeStrength = "";
  let selectedGuideline = null;

  const CATEGORY_ICONS = {
    assembly: "🔧", meniscus: "◗", plano_convex: "▷", plano_concave: "◁",
    bi_convex: "◈", bi_concave: "◇", cemented: "⊕", general: "📏",
    glass: "🔬", coating: "💠", mount: "📦"
  };
  const CATEGORY_LABELS = {
    assembly: "Assembly", meniscus: "Meniscus", plano_convex: "Plano-Convex",
    plano_concave: "Plano-Concave", bi_convex: "Bi-Convex", bi_concave: "Bi-Concave",
    cemented: "Cemented", general: "General", glass: "Glass", coating: "Coating", mount: "Mount"
  };
  const STRENGTH_COLORS = {
    hard: "var(--accent-red)", strong: "var(--accent-amber)",
    moderate: "var(--accent-blue)", soft: "var(--accent-green)"
  };
  const STRENGTH_ICONS = { hard: "🚫", strong: "⚠️", moderate: "📏", soft: "💡" };

  function escHtml(s) {
    if (!s) return "";
    return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }
  function fmtDate(ts) {
    if (!ts) return "—";
    return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  // ── Render guideline card ────────────────────────────────────────
  function renderGuidelineCard(g) {
    const icon = CATEGORY_ICONS[g.category] || "📏";
    const sIcon = STRENGTH_ICONS[g.strength] || "";
    const sColor = STRENGTH_COLORS[g.strength] || "var(--text-secondary)";
    const applied = g.timesApplied || 0;
    const violated = g.timesViolated || 0;
    const complianceRate = applied > 0 ? ((applied - violated) / applied * 100).toFixed(0) : "—";
    
    const ruleStr = g.rule ? `<div class="gl-rule mono">${escHtml(g.rule)}</div>` : "";
    const rangeStr = (g.minValue !== undefined || g.maxValue !== undefined)
      ? `<div class="gl-range mono">${g.minValue !== undefined ? g.minValue : "—"} ≤ ${escHtml(g.parameterName || "value")} ≤ ${g.maxValue !== undefined ? g.maxValue : "—"} ${escHtml(g.unit || "")}</div>`
      : "";

    return `
      <div class="guideline-card" data-id="${g._id}">
        <div class="gl-card-header">
          <div class="gl-card-left">
            <span class="gl-icon">${icon}</span>
            <div>
              <div class="gl-name">${escHtml(g.name)}</div>
              <div class="gl-category">${CATEGORY_LABELS[g.category] || g.category}</div>
            </div>
          </div>
          <div class="gl-card-right">
            <span class="gl-strength-badge" style="color:${sColor};border-color:${sColor}">${sIcon} ${g.strength}</span>
            <div class="gl-weight-bar" title="Weight: ${g.weight}">
              <div class="gl-weight-fill" style="width:${g.weight * 100}%;background:${sColor}"></div>
            </div>
          </div>
        </div>
        
        <div class="gl-description">${escHtml(g.description)}</div>
        ${ruleStr}
        ${rangeStr}
        
        <div class="gl-card-footer">
          <span class="gl-stat">Applied: ${applied}×</span>
          ${applied > 0 ? `<span class="gl-stat">Compliance: ${complianceRate}%</span>` : ""}
          ${g.source ? `<span class="gl-stat">Source: ${escHtml(g.source)}</span>` : ""}
          <span class="gl-stat">${fmtDate(g.updatedAt)}</span>
        </div>
        
        ${g.tags && g.tags.length ? `
        <div class="gl-tags">
          ${g.tags.map(t => `<span class="gl-tag">${escHtml(t)}</span>`).join("")}
        </div>` : ""}
      </div>
    `;
  }

  // ── Render guideline detail panel ────────────────────────────────
  function renderDetail(g) {
    selectedGuideline = g;
    const panel = document.getElementById("guideline-detail");
    const title = document.getElementById("guideline-detail-title");
    const body  = document.getElementById("guideline-detail-body");
    if (!panel || !body) return;

    title.textContent = g.name;
    panel.classList.remove("hidden");

    const sColor = STRENGTH_COLORS[g.strength] || "var(--text-secondary)";
    const applied = g.timesApplied || 0;
    const violated = g.timesViolated || 0;

    body.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:16px">
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <span class="badge" style="border-color:${sColor};color:${sColor}">${STRENGTH_ICONS[g.strength]} ${g.strength}</span>
          <span class="badge badge-initial">${CATEGORY_ICONS[g.category]} ${CATEGORY_LABELS[g.category]}</span>
          <span class="badge" style="font-family:var(--font-mono)">weight: ${g.weight}</span>
        </div>

        <div>
          <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;font-weight:600;margin-bottom:4px">Description</div>
          <p style="font-size:12px;color:var(--text-secondary);line-height:1.6">${escHtml(g.description)}</p>
        </div>

        ${g.rationale ? `
        <div>
          <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;font-weight:600;margin-bottom:4px">Rationale / Failure Mode</div>
          <p style="font-size:12px;color:var(--text-secondary);line-height:1.6">${escHtml(g.rationale)}</p>
        </div>` : ""}

        ${g.rule ? `
        <div>
          <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;font-weight:600;margin-bottom:4px">Rule (machine-readable)</div>
          <code style="display:block;padding:8px 12px;background:var(--bg-elevated);border:1px solid var(--border-default);border-radius:4px;font-size:12px">${escHtml(g.rule)}</code>
        </div>` : ""}

        ${(g.minValue !== undefined || g.maxValue !== undefined) ? `
        <div class="spec-grid" style="grid-template-columns:auto 1fr;gap:4px 16px;font-size:12px">
          <span class="spec-label">Parameter</span><span class="mono">${escHtml(g.parameterName || "—")}</span>
          <span class="spec-label">Min</span><span class="mono">${g.minValue !== undefined ? g.minValue + " " + (g.unit||"") : "—"}</span>
          <span class="spec-label">Max</span><span class="mono">${g.maxValue !== undefined ? g.maxValue + " " + (g.unit||"") : "—"}</span>
        </div>` : ""}

        <div>
          <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;font-weight:600;margin-bottom:8px">Usage Statistics</div>
          <div class="spec-grid" style="grid-template-columns:auto 1fr;gap:4px 16px;font-size:12px">
            <span class="spec-label">Times applied</span><span>${applied}</span>
            <span class="spec-label">Times violated</span><span style="color:${violated > 0 ? 'var(--accent-red)' : 'var(--text-secondary)'}">${violated}</span>
            <span class="spec-label">Compliance</span><span>${applied > 0 ? ((applied-violated)/applied*100).toFixed(0) + "%" : "—"}</span>
            <span class="spec-label">Last applied</span><span>${fmtDate(g.lastAppliedAt)}</span>
          </div>
        </div>

        <div class="spec-grid" style="grid-template-columns:auto 1fr;gap:4px 16px;font-size:12px">
          <span class="spec-label">Source</span><span>${escHtml(g.source || "—")}</span>
          <span class="spec-label">Added by</span><span>${escHtml(g.addedByName || "—")}</span>
          <span class="spec-label">Created</span><span>${fmtDate(g.createdAt)}</span>
          <span class="spec-label">Updated</span><span>${fmtDate(g.updatedAt)}</span>
        </div>

        ${g.tags && g.tags.length ? `
        <div>
          <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;font-weight:600;margin-bottom:4px">Tags</div>
          <div class="gl-tags">${g.tags.map(t => `<span class="gl-tag">${escHtml(t)}</span>`).join("")}</div>
        </div>` : ""}

        <div style="display:flex;gap:8px;margin-top:8px">
          <button class="btn btn-ghost btn-sm" onclick="editGuideline('${g._id}')">✏️ Edit</button>
          <button class="btn btn-ghost btn-sm" style="color:var(--accent-red)" onclick="archiveGuideline('${g._id}')">Archive</button>
        </div>
      </div>
    `;
  }

  // ── Filter + Render list ─────────────────────────────────────────
  function applyFilters() {
    let result = allGuidelines.filter(g => g.active);
    if (activeCategory) result = result.filter(g => g.category === activeCategory);
    if (activeStrength) result = result.filter(g => g.strength === activeStrength);
    const q = document.getElementById("guideline-search")?.value?.toLowerCase().trim();
    if (q) result = result.filter(g =>
      g.name?.toLowerCase().includes(q) ||
      g.description?.toLowerCase().includes(q) ||
      g.rule?.toLowerCase().includes(q) ||
      (g.tags || []).some(t => t.toLowerCase().includes(q))
    );
    return result;
  }

  function renderList() {
    const list = document.getElementById("guideline-list");
    const badge = document.getElementById("guideline-count");
    if (!list) return;

    const filtered = applyFilters();
    const activeAll = allGuidelines.filter(g => g.active);
    badge && (badge.textContent = activeAll.length);
    badge && (badge.style.display = activeAll.length ? "" : "none");

    if (!filtered.length) {
      list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📐</div><p>No guidelines match filters.</p><p style="font-size:11px;color:var(--text-muted)">Add design guidelines to build manufacturing knowledge over time.</p></div>`;
      return;
    }

    // Group by category
    const grouped = {};
    filtered.forEach(g => {
      if (!grouped[g.category]) grouped[g.category] = [];
      grouped[g.category].push(g);
    });

    let html = "";
    for (const [cat, items] of Object.entries(grouped)) {
      const icon = CATEGORY_ICONS[cat] || "📏";
      const label = CATEGORY_LABELS[cat] || cat;
      html += `<div class="gl-group-header">${icon} ${label} <span class="gl-group-count">${items.length}</span></div>`;
      html += items.map(renderGuidelineCard).join("");
    }
    list.innerHTML = html;

    list.querySelectorAll(".guideline-card").forEach(card => {
      card.addEventListener("click", () => {
        const g = allGuidelines.find(g => g._id === card.dataset.id);
        if (g) renderDetail(g);
      });
    });
  }

  // ── New guideline modal ──────────────────────────────────────────
  function setupModal() {
    const btn      = document.getElementById("add-guideline-btn");
    const overlay  = document.getElementById("guideline-modal-overlay");
    const closeBtn = document.getElementById("close-guideline-modal");
    const cancelBtn= document.getElementById("cancel-guideline");
    const submitBtn= document.getElementById("submit-guideline");
    if (!btn || !overlay) return;

    btn.addEventListener("click", () => overlay.classList.remove("hidden"));
    [closeBtn, cancelBtn].forEach(b => b?.addEventListener("click", () => overlay.classList.add("hidden")));
    overlay.addEventListener("click", e => { if (e.target === overlay) overlay.classList.add("hidden"); });

    submitBtn?.addEventListener("click", async () => {
      const name = document.getElementById("gl-name")?.value?.trim();
      const desc = document.getElementById("gl-description")?.value?.trim();
      if (!name || !desc) { alert("Name and description are required."); return; }

      const args = {
        name,
        category: document.getElementById("gl-category")?.value || "general",
        strength: document.getElementById("gl-strength")?.value || "moderate",
        weight: parseFloat(document.getElementById("gl-weight")?.value) || 0.5,
        rule: document.getElementById("gl-rule")?.value?.trim() || undefined,
        minValue: parseFloatOrUndef("gl-min"),
        maxValue: parseFloatOrUndef("gl-max"),
        unit: document.getElementById("gl-unit")?.value?.trim() || undefined,
        description: desc,
        source: document.getElementById("gl-source")?.value?.trim() || undefined,
      };

      try {
        await window.DB.mutation("designGuidelines:create", args);
        overlay.classList.add("hidden");
        clearForm();
      } catch (e) { alert("Error: " + e.message); }
    });
  }

  function clearForm() {
    ["gl-name","gl-rule","gl-min","gl-max","gl-unit","gl-description","gl-source"]
      .forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
    const w = document.getElementById("gl-weight"); if (w) w.value = "0.5";
  }

  function parseFloatOrUndef(id) {
    const v = parseFloat(document.getElementById(id)?.value || "");
    return isNaN(v) ? undefined : v;
  }

  // ── Global functions for detail panel buttons ────────────────────
  window.editGuideline = function(id) {
    // TODO: populate modal with existing values for editing
    alert("Edit mode coming soon — for now, archive and re-create.");
  };
  window.archiveGuideline = async function(id) {
    if (!confirm("Archive this guideline? It will no longer be active.")) return;
    try {
      await window.DB.mutation("designGuidelines:update", { id, active: false });
    } catch (e) { alert("Error: " + e.message); }
  };

  // ── Init ─────────────────────────────────────────────────────────
  function initDesignGuidelines() {
    // Filter pills
    document.getElementById("guideline-category-filter")?.addEventListener("click", e => {
      const pill = e.target.closest(".pill");
      if (!pill) return;
      document.querySelectorAll("#guideline-category-filter .pill").forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      activeCategory = pill.dataset.value || "";
      renderList();
    });
    document.getElementById("guideline-strength-filter")?.addEventListener("click", e => {
      const pill = e.target.closest(".pill");
      if (!pill) return;
      document.querySelectorAll("#guideline-strength-filter .pill").forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      activeStrength = pill.dataset.value || "";
      renderList();
    });

    // Search
    document.getElementById("guideline-search")?.addEventListener("input", renderList);

    // Close detail
    document.getElementById("close-guideline-detail")?.addEventListener("click", () => {
      document.getElementById("guideline-detail")?.classList.add("hidden");
    });

    setupModal();

    // Subscribe
    window.DB.subscribe("designGuidelines:list", {}, guidelines => {
      allGuidelines = guidelines || [];
      renderList();
    });
  }

  window.initDesignGuidelines = initDesignGuidelines;
})();
