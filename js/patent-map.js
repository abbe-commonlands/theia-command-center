// ── Patent Map Tab ───────────────────────────────────────────────────────
(function() {
  "use strict";

  let allPatents = [];
  let activeRelevance = "";
  let activeForm = "";
  let selectedPatent = null;

  const RELEVANCE_ICONS = {
    blocking: "🚫", adjacent: "⚠️", expired: "✓",
    design_around: "🔄", reference: "📚"
  };

  function escHtml(s) {
    if (!s) return "";
    return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }
  function fmtDate(ts) {
    if (!ts) return "—";
    return new Date(ts).toLocaleDateString("en-US", { year: "numeric", month: "short" });
  }
  function relevanceBadge(r) {
    if (!r) return "";
    return `<span class="badge badge-${r}">${RELEVANCE_ICONS[r] || ""} ${r.replace(/_/g," ")}</span>`;
  }

  // ── Filter ───────────────────────────────────────────────────────
  function applyFilters() {
    let result = allPatents;
    if (activeRelevance) result = result.filter(p => p.relevance === activeRelevance);
    if (activeForm)      result = result.filter(p => p.designForm === activeForm);
    const q = document.getElementById("patent-search")?.value?.toLowerCase().trim();
    if (q) result = result.filter(p =>
      p.patentNumber?.toLowerCase().includes(q) ||
      p.title?.toLowerCase().includes(q) ||
      p.assignee?.toLowerCase().includes(q) ||
      p.cpcClass?.toLowerCase().includes(q)
    );
    return result;
  }

  // ── Render table ─────────────────────────────────────────────────
  function renderTable() {
    const tbody = document.getElementById("patent-table-body");
    if (!tbody) return;
    const filtered = applyFilters();
    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:32px">No patents found.</td></tr>`;
      return;
    }
    tbody.innerHTML = filtered.map(p => `
      <tr data-id="${p._id}" style="cursor:pointer">
        <td><span class="patent-num">${escHtml(p.patentNumber)}</span></td>
        <td style="max-width:280px" class="truncate">${escHtml(p.title)}</td>
        <td>${escHtml(p.assignee || "—")}</td>
        <td><span class="mono" style="font-size:11px">${escHtml(p.cpcClass || "—")}</span></td>
        <td>${fmtDate(p.filingDate)}</td>
        <td>${fmtDate(p.expiryDate)}</td>
        <td>${relevanceBadge(p.relevance)}</td>
        <td style="font-size:11px;color:var(--text-secondary)">${escHtml(p.designForm || "—")}</td>
      </tr>
    `).join("");

    tbody.querySelectorAll("tr[data-id]").forEach(row => {
      row.addEventListener("click", () => {
        const p = allPatents.find(p => p._id === row.dataset.id);
        if (p) renderPatentDetail(p);
      });
    });
  }

  // ── Patent detail panel ──────────────────────────────────────────
  function renderPatentDetail(p) {
    selectedPatent = p;
    const panel = document.getElementById("patent-detail");
    const title = document.getElementById("patent-detail-title");
    const body  = document.getElementById("patent-detail-body");
    if (!panel || !body) return;

    title.textContent = p.patentNumber;
    panel.classList.remove("hidden");

    const expiryNote = p.expiryDate
      ? (p.expiryDate < Date.now() ? " <span style='color:var(--accent-green)'>(expired)</span>" : "")
      : "";

    body.innerHTML = `
      <div style="padding:16px;display:flex;flex-direction:column;gap:16px;overflow-y:auto;height:100%">
        <div>
          <h4 style="font-size:13px;font-weight:600;margin-bottom:4px">${escHtml(p.title)}</h4>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
            ${relevanceBadge(p.relevance)}
            ${p.cpcClass ? `<span class="badge" style="font-family:var(--font-mono);font-size:10px">${escHtml(p.cpcClass)}</span>` : ""}
          </div>
        </div>

        <div class="spec-grid" style="grid-template-columns:auto 1fr;gap:4px 16px;font-size:12px">
          <span class="spec-label">Assignee</span>   <span>${escHtml(p.assignee || "—")}</span>
          <span class="spec-label">Filed</span>       <span>${fmtDate(p.filingDate)}</span>
          <span class="spec-label">Issued</span>      <span>${fmtDate(p.issueDate)}</span>
          <span class="spec-label">Expires</span>     <span>${fmtDate(p.expiryDate)}${expiryNote}</span>
          <span class="spec-label">Design Form</span> <span>${escHtml(p.designForm || "—")}</span>
        </div>

        ${p.url ? `<a href="${escHtml(p.url)}" target="_blank" class="btn btn-ghost btn-sm">🔗 View Patent</a>` : ""}

        ${p.summary ? `
        <div>
          <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;font-weight:600;margin-bottom:8px">Photon's Summary</div>
          <div class="markdown-content" style="font-size:12px">${window.marked ? window.marked.parse(p.summary) : escHtml(p.summary)}</div>
        </div>` : `<div style="color:var(--text-muted);font-size:12px">No summary yet — Photon can add one.</div>`}

        ${p.notes ? `
        <div>
          <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;font-weight:600;margin-bottom:4px">Notes</div>
          <p style="font-size:12px;color:var(--text-secondary)">${escHtml(p.notes)}</p>
        </div>` : ""}
      </div>
    `;
  }

  // ── Coverage heatmap ─────────────────────────────────────────────
  function renderHeatmap(coverage) {
    const el = document.getElementById("patent-heatmap");
    if (!el || !coverage) return;
    if (!coverage.length) { el.innerHTML = `<span style="font-size:12px;color:var(--text-muted)">No designs yet.</span>`; return; }
    el.innerHTML = coverage.map(c => `
      <div class="heatmap-row">
        <span class="heatmap-label" title="${escHtml(c.form)}">${escHtml(c.form)}</span>
        <span class="heatmap-dot heatmap-dot-${c.status}" title="${c.status}"></span>
        <span style="font-size:10px;color:var(--text-muted)">${c.patentCount} patent${c.patentCount !== 1 ? "s" : ""}</span>
      </div>
    `).join("");
  }

  // ── Design form filter pills ─────────────────────────────────────
  function renderFormFilter(patents) {
    const forms = [...new Set(patents.map(p => p.designForm).filter(Boolean))];
    const container = document.getElementById("patent-form-filter");
    if (!container) return;
    const pills = ['<button class="pill active" data-form="">All forms</button>',
      ...forms.map(f => `<button class="pill" data-form="${escHtml(f)}">${escHtml(f)}</button>`)
    ].join("");
    const existing = container.querySelector(".form-pills");
    if (existing) existing.innerHTML = pills.replace(/class="pill/g, 'class="pill');
    else {
      const wrap = document.createElement("div");
      wrap.className = "filter-pills form-pills";
      wrap.innerHTML = pills;
      container.appendChild(wrap);
      wrap.addEventListener("click", e => {
        const pill = e.target.closest(".pill");
        if (!pill) return;
        wrap.querySelectorAll(".pill").forEach(p => p.classList.remove("active"));
        pill.classList.add("active");
        activeForm = pill.dataset.form || "";
        renderTable();
      });
    }
  }

  // ── Risk badge count for nav ─────────────────────────────────────
  function updateRiskBadge(patents) {
    const count = patents.filter(p => p.relevance === "blocking" || p.relevance === "adjacent").length;
    const badge = document.getElementById("patent-risk-count");
    if (badge) { badge.textContent = count; badge.style.display = count ? "" : "none"; }
  }

  // ── Add patent modal (minimal — Photon usually does this via API) ──
  function setupAddPatentModal() {
    document.getElementById("add-patent-btn")?.addEventListener("click", () => {
      const num = prompt("Patent number (e.g. US10234567B2):");
      if (!num) return;
      const title = prompt("Title:");
      if (!title) return;
      const relevance = prompt("Relevance (blocking/adjacent/expired/design_around/reference):", "reference");
      // Find first agent as fallback addedBy
      window.DB.query("agents:list", {}).then(agents => {
        if (!agents || !agents.length) { alert("No agents found."); return; }
        window.DB.mutation("patents:create", {
          patentNumber: num.trim(),
          title: title.trim(),
          relevance: relevance?.trim() || "reference",
          addedBy: agents[0]._id,
        }).catch(e => alert("Error: " + e.message));
      });
    });
  }

  // ── Init ─────────────────────────────────────────────────────────
  function initPatentMap() {
    // Search
    document.getElementById("patent-search")?.addEventListener("input", renderTable);

    // Relevance filter
    document.getElementById("patent-relevance-filter")?.addEventListener("click", e => {
      const pill = e.target.closest(".pill");
      if (!pill) return;
      document.querySelectorAll("#patent-relevance-filter .pill").forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      activeRelevance = pill.dataset.value || "";
      renderTable();
    });

    // Close detail
    document.getElementById("close-patent-detail")?.addEventListener("click", () => {
      document.getElementById("patent-detail")?.classList.add("hidden");
    });

    setupAddPatentModal();

    // Subscribe to patents
    window.DB.subscribe("patents:list", {}, patents => {
      allPatents = patents || [];
      renderTable();
      renderFormFilter(allPatents);
      updateRiskBadge(allPatents);
    });

    // Subscribe to coverage heatmap
    window.DB.subscribe("patents:coverageByForm", {}, coverage => {
      renderHeatmap(coverage);
    });
  }

  window.initPatentMap = initPatentMap;
})();
