(() => {
  const TYPE_STYLES = {
    decision: { color: "var(--accent-green)", badge: "badge-green" },
    event: { color: "#A78BFA", badge: "badge-cyan" },
    entity: { color: "var(--accent-amber)", badge: "badge-amber" },
    note: { color: "var(--text-secondary)", badge: "badge-neutral" },
    learning: { color: "var(--accent-cyan)", badge: "badge-cyan" },
    fix: { color: "var(--accent-green)", badge: "badge-green" },
  };

  let memories = [];
  let filteredMemories = [];
  let activeFilters = new Set(["decision", "event", "entity", "note", "learning", "fix"]);
  let searchQuery = "";
  let selectedMemory = null;

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

  function parseMarkdown(content, filename = "uploaded") {
    const entries = [];
    const lines = content.split("\n");
    let currentEntry = null;
    let currentContent = [];

    for (const line of lines) {
      const dateMatch = line.match(/^##\s+(\d{4}-\d{2}-\d{2})/);
      const typeMatch = line.match(/^###?\s+(Decision|Event|Entity|Note|Learning|Fix):\s*(.+)/i);
      const bulletMatch = line.match(/^[-*]\s+\*\*(.+?)\*\*:\s*(.+)/);

      if (dateMatch) {
        if (currentEntry) {
          currentEntry.content = currentContent.join("\n").trim();
          entries.push(currentEntry);
        }
        currentEntry = {
          id: crypto.randomUUID(),
          date: dateMatch[1],
          type: "note",
          title: dateMatch[1],
          content: "",
          source: filename,
        };
        currentContent = [];
      } else if (typeMatch) {
        if (currentEntry) {
          currentEntry.content = currentContent.join("\n").trim();
          entries.push(currentEntry);
        }
        currentEntry = {
          id: crypto.randomUUID(),
          date: currentEntry?.date || new Date().toISOString().split("T")[0],
          type: typeMatch[1].toLowerCase(),
          title: typeMatch[2],
          content: "",
          source: filename,
        };
        currentContent = [];
      } else if (bulletMatch && currentEntry) {
        currentContent.push(`**${bulletMatch[1]}**: ${bulletMatch[2]}`);
      } else if (currentEntry && line.trim()) {
        currentContent.push(line);
      }
    }

    if (currentEntry) {
      currentEntry.content = currentContent.join("\n").trim();
      entries.push(currentEntry);
    }

    if (entries.length === 0 && content.trim()) {
      entries.push({
        id: crypto.randomUUID(),
        date: new Date().toISOString().split("T")[0],
        type: "note",
        title: filename.replace(/\.md$/, ""),
        content: content.trim().slice(0, 500),
        source: filename,
      });
    }

    return entries;
  }

  function applyFilters() {
    filteredMemories = memories.filter((m) => {
      const typeMatch = activeFilters.has(m.type);
      const searchMatch = !searchQuery || 
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.content.toLowerCase().includes(searchQuery.toLowerCase());
      return typeMatch && searchMatch;
    });
    renderMemories();
  }

  function renderMemories() {
    const container = $("#memory-cards");
    const emptyState = $("#memory-empty");
    if (!container) return;

    container.innerHTML = "";

    if (filteredMemories.length === 0) {
      if (emptyState) emptyState.style.display = "flex";
      return;
    }

    if (emptyState) emptyState.style.display = "none";

    // Group by date
    const grouped = {};
    for (const m of filteredMemories) {
      if (!grouped[m.date]) grouped[m.date] = [];
      grouped[m.date].push(m);
    }

    const dates = Object.keys(grouped).sort().reverse();

    for (const date of dates) {
      const dateHeader = createEl("div", "", `
        <span style="font-size: var(--text-caption); font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">
          ${date}
        </span>
      `);
      dateHeader.style.cssText = "grid-column: 1 / -1; margin-top: var(--space-md);";
      container.appendChild(dateHeader);

      for (const memory of grouped[date]) {
        const style = TYPE_STYLES[memory.type] || TYPE_STYLES.note;
        const card = createEl("div", "memory-card");
        
        card.innerHTML = `
          <div class="flex items-center justify-between gap-sm" style="margin-bottom: var(--space-xs);">
            <span class="badge ${style.badge}" style="text-transform: capitalize;">${memory.type}</span>
            <span style="font-size: var(--text-caption); color: var(--text-muted);">${escapeHtml(memory.source)}</span>
          </div>
          <h4 style="font-weight: 500; color: var(--text-primary); margin-bottom: 4px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
            ${escapeHtml(memory.title)}
          </h4>
          <p style="font-size: var(--text-caption); color: var(--text-secondary); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
            ${escapeHtml(memory.content.slice(0, 200))}${memory.content.length > 200 ? "..." : ""}
          </p>
        `;

        card.addEventListener("click", () => selectMemory(memory));
        container.appendChild(card);
      }
    }
  }

  function selectMemory(memory) {
    selectedMemory = memory;
    const sidebar = $("#memory-detail");
    if (!sidebar) return;

    const style = TYPE_STYLES[memory.type] || TYPE_STYLES.note;
    sidebar.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: var(--space-md);">
        <div class="flex items-center gap-sm">
          <span class="badge ${style.badge}" style="text-transform: capitalize;">${memory.type}</span>
          <span style="font-size: var(--text-caption); color: var(--text-muted);">${memory.date}</span>
        </div>
        <h3 style="font-size: var(--text-h2); font-weight: 600; color: var(--text-primary);">
          ${escapeHtml(memory.title)}
        </h3>
        <div style="font-size: var(--text-body); color: var(--text-secondary); white-space: pre-wrap; line-height: 1.7;">
          ${escapeHtml(memory.content)}
        </div>
        <div style="font-size: var(--text-caption); color: var(--text-muted); padding-top: var(--space-sm); border-top: 1px solid var(--border-subtle);">
          Source: ${escapeHtml(memory.source)}
        </div>
      </div>
    `;
  }

  function setupDropZone() {
    const dropzone = $("#memory-viz-area");
    const fileInput = $("#memory-file-input");
    if (!dropzone || !fileInput) return;

    dropzone.addEventListener("click", (e) => {
      if (e.target.closest(".memory-card")) return;
      fileInput.click();
    });

    fileInput.addEventListener("change", (e) => {
      handleFiles(e.target.files);
      fileInput.value = "";
    });

    dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.classList.add("dragover");
    });

    dropzone.addEventListener("dragleave", () => {
      dropzone.classList.remove("dragover");
    });

    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.classList.remove("dragover");
      handleFiles(e.dataTransfer.files);
    });
  }

  async function handleFiles(files) {
    let count = 0;
    for (const file of files) {
      if (!file.name.match(/\.(md|txt)$/i)) continue;
      const text = await file.text();
      const entries = parseMarkdown(text, file.name);
      memories.push(...entries);
      count += entries.length;
    }
    applyFilters();
    
    if (window.Mission?.showToast) {
      window.Mission.showToast(`Loaded ${count} memories from ${files.length} file(s)`, "success");
    }
  }

  function setupFilters() {
    const filterButtons = document.querySelectorAll("[data-memory-filter]");
    filterButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const type = btn.dataset.memoryFilter;
        if (activeFilters.has(type)) {
          activeFilters.delete(type);
          btn.classList.remove("active");
        } else {
          activeFilters.add(type);
          btn.classList.add("active");
        }
        applyFilters();
      });
    });
  }

  function setupSearch() {
    const searchInput = $("#memory-search");
    if (!searchInput) return;

    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value;
      applyFilters();
    });
  }

  function init() {
    setupDropZone();
    setupFilters();
    setupSearch();
    renderMemories();
  }

  window.MemoryViz = {
    init,
    loadFiles: handleFiles,
    getMemories: () => memories,
    search: (q) => { searchQuery = q; applyFilters(); },
  };
})();
