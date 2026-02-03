(() => {
  // Utility component library for Abbe Command Center
  // Most styling is handled by CSS - this provides JS helpers

  function createEl(tag, className, content) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (content) {
      if (typeof content === "string") {
        el.innerHTML = content;
      } else if (content instanceof Node) {
        el.appendChild(content);
      }
    }
    return el;
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text || "";
    return div.innerHTML;
  }

  // Simple toast system (uses CSS from styles.css)
  const Toasts = {
    show(message, type = "info", duration = 8000) {
      const container = document.getElementById("toast-container");
      if (!container) return;

      const toast = createEl("div", `toast ${type}`, `
        <span style="flex: 1;">${escapeHtml(message)}</span>
        <button class="btn-ghost" style="padding: 4px; font-size: 1.25rem; line-height: 1; min-height: auto;">&times;</button>
      `);

      const closeBtn = toast.querySelector("button");
      const remove = () => {
        toast.style.opacity = "0";
        toast.style.transform = "translateX(100%)";
        setTimeout(() => toast.remove(), 200);
      };

      closeBtn.addEventListener("click", remove);
      container.appendChild(toast);

      if (duration > 0) {
        setTimeout(remove, duration);
      }

      return { remove };
    },
  };

  // Format relative time
  function formatTime(isoString) {
    if (!isoString) return "Just now";
    const date = new Date(isoString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    
    return date.toLocaleDateString();
  }

  // Confirm dialog using the modal pattern
  function confirm(options = {}) {
    const { title = "Confirm", message = "Are you sure?", confirmText = "Confirm", cancelText = "Cancel" } = options;

    return new Promise((resolve) => {
      const backdrop = createEl("div", "modal-backdrop open");
      const modal = createEl("div", "modal");
      
      modal.innerHTML = `
        <div class="modal-header">
          <h3 class="modal-title">${escapeHtml(title)}</h3>
        </div>
        <div class="modal-body">
          <p>${escapeHtml(message)}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" data-action="cancel">${escapeHtml(cancelText)}</button>
          <button class="btn btn-primary" data-action="confirm">${escapeHtml(confirmText)}</button>
        </div>
      `;

      backdrop.appendChild(modal);
      document.body.appendChild(backdrop);

      const cleanup = (result) => {
        backdrop.classList.remove("open");
        setTimeout(() => backdrop.remove(), 200);
        resolve(result);
      };

      modal.querySelector('[data-action="cancel"]').addEventListener("click", () => cleanup(false));
      modal.querySelector('[data-action="confirm"]').addEventListener("click", () => cleanup(true));
      backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) cleanup(false);
      });
    });
  }

  // Loading spinner overlay
  const Spinner = {
    overlay: null,

    show(message = "Loading...") {
      if (this.overlay) return;
      
      this.overlay = createEl("div", "", `
        <div style="position: fixed; inset: 0; z-index: 150; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; background: rgba(22, 22, 28, 0.9); backdrop-filter: blur(8px);">
          <div style="width: 48px; height: 48px; border: 3px solid var(--border-subtle); border-top-color: var(--accent-cyan); border-radius: 50%; animation: spin 1s linear infinite;"></div>
          <p style="color: var(--text-secondary);">${escapeHtml(message)}</p>
        </div>
        <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
      `);
      
      document.body.appendChild(this.overlay);
    },

    hide() {
      if (this.overlay) {
        this.overlay.remove();
        this.overlay = null;
      }
    },
  };

  // Export
  window.Components = {
    createEl,
    escapeHtml,
    Toasts,
    confirm,
    Spinner,
    formatTime,
  };
})();
