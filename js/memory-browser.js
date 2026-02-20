/**
 * Memory Browser — Searchable viewer for agent MEMORY.md + daily notes.
 * Renders markdown using marked.js (CDN). No other dependencies.
 */
(() => {
  const AGENTS = ["Abbe", "Zernike", "Seidel", "Iris", "Kanban", "Deming", "Ernst"];
  const SOURCE_LABELS = {
    daily: "📅 Daily Note",
    longterm: "🧠 Long-Term",
    working: "📝 Working",
  };

  let allMemories = [];
  let selectedMemory = null;
  let activeAgent = ""; // "" = All
  let activeType = "";  // "" = All
  let searchQuery = "";
  let searchTimeout = null;

  // ---- DOM helpers ----
  function $(sel) { return document.querySelector(sel); }
  function $$(sel) { return document.querySelectorAll(sel); }

  /** Escape HTML to prevent XSS. */
  function esc(s) {
    const d = document.createElement("div");
    d.textContent = s || "";
    return d.innerHTML;
  }

  /** Format a timestamp as a human-readable date. */
  function fmtDate(ts) {
    return new Date(ts).toLocaleDateString([], {
      year: "numeric", month: "short", day: "numeric"
    });
  }

  /** Format timeago. */
  function timeAgo(ts) {
    const mins = Math.floor((Date.now() - ts) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const h = Math.floor(mins / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
  }

  /** Render markdown to HTML using marked.js if available, else pre-wrap. */
  function renderMarkdown(content) {
    if (window.marked) {
      try {
        return window.marked.parse(content || "");
      } catch (_) {}
    }
    return `<pre style="white-space:pre-wrap;word-break:break-word;">${esc(content)}</pre>`;
  }

  /** Extract a short preview snippet from markdown content. */
  function snippet(content, maxLen = 120) {
    if (!content) return "";
    // Strip markdown syntax for preview
    const plain = content
      .replace(/^#+\s+/gm, "")
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\[(.+?)\]\(.+?\)/g, "$1")
      .replace(/`{1,3}[^`]*`{1,3}/g, "")
      .replace(/\n{2,}/g, " · ")
      .replace(/\n/g, " ")
      .trim();
    return plain.length > maxLen ? plain.slice(0, maxLen) + "…" : plain;
  }

  // ---- Rendering ----

  /** Render the memory list panel. */
  function renderList() {
    const container = $("#memory-list");
    if (!container) return;

    if (allMemories.length === 0) {
      container.innerHTML = `<div class="memory-list-empty">
        <p>No memories synced yet.</p>
        <p style="font-size:11px;color:var(--text-muted);margin-top:8px;">
          Agents sync their MEMORY.md and daily notes via <code>memories:sync</code> during the sleep protocol.
        </p>
      </div>`;
      return;
    }

    container.innerHTML = allMemories.map(m => {
      const isSelected = selectedMemory && selectedMemory._id === m._id;
      const typeLabel = SOURCE_LABELS[m.sourceType] || m.sourceType;
      const preview = snippet(m.content);
      return `<div class="memory-card ${isSelected ? "memory-card-active" : ""}" data-id="${m._id}">
        <div class="memory-card-header">
          <span class="memory-card-agent">${esc(m.agentName)}</span>
          <span class="memory-card-type">${typeLabel}</span>
          <span class="memory-card-date">${fmtDate(m.date)}</span>
        </div>
        <div class="memory-card-path">${esc(m.sourcePath)}</div>
        ${preview ? `<div class="memory-card-preview">${esc(preview)}</div>` : ""}
      </div>`;
    }).join("");

    // Attach click handlers
    container.querySelectorAll(".memory-card").forEach(el => {
      el.addEventListener("click", () => {
        const id = el.dataset.id;
        const m = allMemories.find(x => x._id === id);
        if (m) openMemory(m);
      });
    });
  }

  /** Render the memory detail panel. */
  function openMemory(memory) {
    selectedMemory = memory;
    renderList(); // Refresh selection state

    const panel = $("#memory-detail");
    if (!panel) return;

    const typeLabel = SOURCE_LABELS[memory.sourceType] || memory.sourceType;
    const html = renderMarkdown(memory.content);

    // Build jump-to-section links from sections array
    let jumpLinks = "";
    if (memory.sections && memory.sections.length > 0) {
      jumpLinks = `<div class="memory-jump-links">
        <span style="color:var(--text-muted);font-size:11px;">Jump to: </span>
        ${memory.sections.map(s =>
          `<a href="#" class="memory-jump-link" data-heading="${esc(s.heading)}">${esc(s.heading)}</a>`
        ).join("")}
      </div>`;
    }

    panel.innerHTML = `
      <div class="memory-detail-header">
        <div class="memory-detail-title">
          <span class="memory-detail-agent">${esc(memory.agentName)}</span>
          <span class="memory-detail-separator">·</span>
          <span class="memory-detail-type">${typeLabel}</span>
          <span class="memory-detail-separator">·</span>
          <span class="memory-detail-date">${fmtDate(memory.date)}</span>
        </div>
        <div class="memory-detail-path">${esc(memory.sourcePath)}</div>
        ${jumpLinks}
      </div>
      <div class="memory-detail-content markdown-body">
        ${html}
      </div>
    `;

    // Wire up jump-to-section links
    panel.querySelectorAll(".memory-jump-link").forEach(link => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const heading = link.dataset.heading;
        const contentEl = panel.querySelector(".memory-detail-content");
        if (!contentEl) return;
        // Find heading element by text content
        const headers = contentEl.querySelectorAll("h1,h2,h3,h4,h5,h6");
        for (const h of headers) {
          if (h.textContent.trim() === heading) {
            h.scrollIntoView({ behavior: "smooth", block: "start" });
            break;
          }
        }
      });
    });
  }

  // ---- Data loading ----

  /** Perform a search or list load. */
  async function loadMemories() {
    if (!window.Convex) {
      allMemories = [];
      renderList();
      return;
    }

    try {
      if (searchQuery.trim()) {
        allMemories = await window.Convex.query("memories:search", {
          q: searchQuery,
          agentName: activeAgent || undefined,
          sourceType: activeType || undefined,
          limit: 40,
        });
      } else {
        allMemories = await window.Convex.query("memories:list", {
          agentName: activeAgent || undefined,
          sourceType: activeType || undefined,
          limit: 40,
        });
      }
    } catch (e) {
      console.warn("Memory browser: load error:", e);
      allMemories = [];
    }

    // Reset selection if it's no longer in the list
    if (selectedMemory && !allMemories.find(m => m._id === selectedMemory._id)) {
      selectedMemory = null;
      const panel = $("#memory-detail");
      if (panel) panel.innerHTML = `<p class="memory-detail-placeholder">Select a memory to read it.</p>`;
    }

    renderList();

    // Auto-select first item if nothing selected
    if (!selectedMemory && allMemories.length > 0) {
      openMemory(allMemories[0]);
    }
  }

  /** Debounced search. */
  function onSearchInput(e) {
    searchQuery = e.target.value;
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(loadMemories, 300);
  }

  /** Toggle agent filter pill. */
  function setAgent(agent) {
    activeAgent = agent;
    $$(".memory-filter-pill[data-agent]").forEach(el => {
      el.classList.toggle("active", el.dataset.agent === agent);
    });
    loadMemories();
  }

  /** Toggle type filter pill. */
  function setType(type) {
    activeType = type;
    $$(".memory-filter-pill[data-type]").forEach(el => {
      el.classList.toggle("active", el.dataset.type === type);
    });
    loadMemories();
  }

  // ---- Init ----

  function init() {
    const searchInput = $("#memory-search");
    if (searchInput) searchInput.addEventListener("input", onSearchInput);

    // Bind agent filter pills
    $$(".memory-filter-pill[data-agent]").forEach(el => {
      el.addEventListener("click", () => setAgent(el.dataset.agent));
    });

    // Bind type filter pills
    $$(".memory-filter-pill[data-type]").forEach(el => {
      el.addEventListener("click", () => setType(el.dataset.type));
    });

    // Refresh button
    const refreshBtn = $("#memory-refresh-btn");
    if (refreshBtn) refreshBtn.addEventListener("click", loadMemories);

    loadMemories();
  }

  window.MemoryBrowser = { init, load: loadMemories };
})();
