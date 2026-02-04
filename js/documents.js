/**
 * Documents Module
 * Shared deliverables storage with create/view
 */
(() => {
  const DOCUMENT_TYPES = {
    deliverable: { icon: '📦', label: 'Deliverable' },
    research: { icon: '🔬', label: 'Research' },
    protocol: { icon: '📋', label: 'Protocol' },
    note: { icon: '📝', label: 'Note' },
  };

  let documents = [];
  let currentFilter = null;
  let selectedDocument = null;

  function $(selector) {
    return document.querySelector(selector);
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }

  function formatDate(timestamp) {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  /**
   * Simple markdown to HTML (basic support)
   */
  function renderMarkdown(text) {
    if (!text) return '';
    return escapeHtml(text)
      // Headers
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      // Bold & italic
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Lists
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      // Paragraphs
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(.+)$/gm, '<p>$1</p>')
      // Clean up
      .replace(/<p><\/p>/g, '')
      .replace(/<p>(<h[123]>)/g, '$1')
      .replace(/(<\/h[123]>)<\/p>/g, '$1')
      .replace(/<p>(<li>)/g, '<ul>$1')
      .replace(/(<\/li>)<\/p>/g, '$1</ul>');
  }

  /**
   * Load documents
   */
  async function load() {
    if (window.Convex) {
      try {
        documents = await window.Convex.documents.list({ type: currentFilter }) || [];
        render();
        return;
      } catch (err) {
        console.warn('Convex documents fetch failed:', err);
      }
    }
    
    // Fallback: mock data for demo
    if (documents.length === 0) {
      documents = [
        {
          id: '1',
          title: 'Microsoft SSO Integration Spec',
          content: '# Microsoft SSO Integration\n\n## Overview\nImplement Azure AD authentication for COS dashboard.\n\n## Requirements\n- MSAL.js library\n- Azure AD app registration\n- Redirect URI configuration\n\n## Timeline\n- Week 1: Azure setup\n- Week 2: Frontend integration\n- Week 3: Testing',
          type: 'protocol',
          createdBy: 'Zernike',
          createdAt: Date.now() - 86400000,
        },
        {
          id: '2',
          title: 'Shopify MCP Research',
          content: '# Shopify MCP Integration\n\n## Findings\nShopify offers Model Context Protocol endpoints for:\n- Product catalog sync\n- Order management\n- Inventory updates\n\n## Recommended Approach\nUse the official Shopify MCP SDK with Node.js.',
          type: 'research',
          createdBy: 'Abbe',
          createdAt: Date.now() - 172800000,
        },
        {
          id: '3',
          title: 'Dashboard Wireframes v2',
          content: '# Dashboard Wireframes\n\nUpdated wireframes for the Mission Control dashboard.\n\n## Changes\n- Added notification bell\n- Document panel redesign\n- Activity feed newspaper style\n\n## Feedback\nAwaiting Max review.',
          type: 'deliverable',
          createdBy: 'Iris',
          createdAt: Date.now() - 259200000,
        },
      ];
    }
    render();
  }

  /**
   * Create a document
   */
  async function create({ title, content, type, taskId, createdBy }) {
    const doc = {
      id: Date.now().toString(),
      title,
      content,
      type: type || 'note',
      taskId,
      createdBy: createdBy || 'Unknown',
      createdAt: Date.now(),
    };

    if (window.Convex) {
      try {
        await window.Convex.documents.create(doc);
      } catch (err) {
        console.warn('Convex create failed:', err);
        documents.unshift(doc);
      }
    } else {
      documents.unshift(doc);
    }

    render();
    closeCreateModal();
    
    if (window.Mission?.showToast) {
      window.Mission.showToast('Document created', 'success');
    }
  }

  /**
   * Filter documents by type
   */
  function filterByType(type) {
    currentFilter = type === currentFilter ? null : type;
    
    // Update filter pills
    document.querySelectorAll('.doc-filter-pill').forEach(pill => {
      pill.classList.toggle('active', pill.dataset.type === currentFilter);
    });
    
    load();
  }

  /**
   * Render documents grid
   */
  function render() {
    const container = $('#documents-grid');
    if (!container) return;

    const filtered = currentFilter 
      ? documents.filter(d => d.type === currentFilter)
      : documents;

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="skills-empty" style="grid-column: 1 / -1;">
          <p>No documents yet</p>
          <button class="btn btn-primary" onclick="Documents.openCreateModal()" style="margin-top: var(--space-md);">
            Create First Document
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(doc => {
      const typeInfo = DOCUMENT_TYPES[doc.type] || DOCUMENT_TYPES.note;
      const preview = doc.content?.replace(/[#*`\-]/g, '').slice(0, 100) || '';
      
      return `
        <div class="document-card" data-id="${doc.id}">
          <div class="document-card-header">
            <span class="document-icon">${typeInfo.icon}</span>
            <span class="document-title">${escapeHtml(doc.title)}</span>
            <span class="document-type ${doc.type}">${typeInfo.label}</span>
          </div>
          <div class="document-preview">${escapeHtml(preview)}...</div>
          <div class="document-meta">
            <span>By ${escapeHtml(doc.createdBy)}</span>
            <span>${formatDate(doc.createdAt)}</span>
          </div>
        </div>
      `;
    }).join('');

    // Bind click handlers
    container.querySelectorAll('.document-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.id;
        const doc = documents.find(d => d.id === id);
        if (doc) openViewer(doc);
      });
    });
  }

  /**
   * Open document viewer
   */
  function openViewer(doc) {
    selectedDocument = doc;
    const typeInfo = DOCUMENT_TYPES[doc.type] || DOCUMENT_TYPES.note;
    
    const modal = $('#doc-viewer-modal');
    if (!modal) {
      // Create modal if doesn't exist
      const backdrop = document.createElement('div');
      backdrop.id = 'doc-viewer-modal';
      backdrop.className = 'modal-backdrop';
      backdrop.innerHTML = `
        <div class="modal" style="max-width: 700px;">
          <div class="modal-header">
            <h3 class="modal-title" id="doc-viewer-title"></h3>
            <button class="modal-close" onclick="Documents.closeViewer()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="document-viewer" id="doc-viewer-content"></div>
          </div>
          <div class="modal-footer">
            <span id="doc-viewer-meta" style="flex: 1; font-size: var(--text-caption); color: var(--text-muted);"></span>
            <button class="btn btn-secondary" onclick="Documents.closeViewer()">Close</button>
          </div>
        </div>
      `;
      document.body.appendChild(backdrop);
      
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) closeViewer();
      });
    }

    const viewerModal = $('#doc-viewer-modal');
    $('#doc-viewer-title').innerHTML = `${typeInfo.icon} ${escapeHtml(doc.title)}`;
    $('#doc-viewer-content').innerHTML = renderMarkdown(doc.content);
    $('#doc-viewer-meta').textContent = `Created by ${doc.createdBy} on ${formatDate(doc.createdAt)}`;
    
    viewerModal.classList.add('open');
  }

  /**
   * Close viewer
   */
  function closeViewer() {
    const modal = $('#doc-viewer-modal');
    if (modal) {
      modal.classList.remove('open');
    }
    selectedDocument = null;
  }

  /**
   * Open create modal
   */
  function openCreateModal(taskId = null) {
    const modal = $('#doc-create-modal');
    if (!modal) {
      const backdrop = document.createElement('div');
      backdrop.id = 'doc-create-modal';
      backdrop.className = 'modal-backdrop';
      backdrop.innerHTML = `
        <div class="modal" style="max-width: 600px;">
          <div class="modal-header">
            <h3 class="modal-title">📄 New Document</h3>
            <button class="modal-close" onclick="Documents.closeCreateModal()">&times;</button>
          </div>
          <div class="modal-body">
            <form id="doc-create-form">
              <div class="form-group">
                <label class="form-label">Title</label>
                <input type="text" id="doc-title" class="input" placeholder="Document title" required>
              </div>
              <div class="form-group">
                <label class="form-label">Type</label>
                <select id="doc-type" class="input select">
                  <option value="note">📝 Note</option>
                  <option value="deliverable">📦 Deliverable</option>
                  <option value="research">🔬 Research</option>
                  <option value="protocol">📋 Protocol</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Content (Markdown)</label>
                <textarea id="doc-content" class="input" rows="10" placeholder="# Document Title

Write your content here...

## Section
- Bullet points
- **Bold text**
- *Italic text*" style="font-family: var(--font-mono); resize: vertical;"></textarea>
              </div>
              <div class="form-group">
                <label class="form-label">Author</label>
                <select id="doc-author" class="input select">
                  <option value="Abbe">🧠 Abbe</option>
                  <option value="Zernike">💻 Zernike</option>
                  <option value="Seidel">🔧 Seidel</option>
                  <option value="Iris">🎨 Iris</option>
                  <option value="Photon">📸 Photon</option>
                  <option value="Deming">📊 Deming</option>
                  <option value="Max">👤 Max</option>
                </select>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="Documents.closeCreateModal()">Cancel</button>
            <button type="submit" form="doc-create-form" class="btn btn-primary">Create Document</button>
          </div>
        </div>
      `;
      document.body.appendChild(backdrop);

      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) closeCreateModal();
      });

      $('#doc-create-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const title = $('#doc-title').value.trim();
        const type = $('#doc-type').value;
        const content = $('#doc-content').value;
        const createdBy = $('#doc-author').value;

        if (!title) {
          if (window.Mission?.showToast) {
            window.Mission.showToast('Please enter a title', 'warning');
          }
          return;
        }

        create({ title, content, type, createdBy });
      });
    }

    // Reset form
    const form = $('#doc-create-form');
    if (form) form.reset();

    $('#doc-create-modal').classList.add('open');
  }

  /**
   * Close create modal
   */
  function closeCreateModal() {
    const modal = $('#doc-create-modal');
    if (modal) {
      modal.classList.remove('open');
    }
  }

  /**
   * Initialize
   */
  function init() {
    // Subscribe to Convex if available
    if (window.Convex) {
      window.Convex.documents?.onChange?.((data) => {
        documents = data || [];
        render();
      });
    }

    load();
  }

  // Export
  window.Documents = {
    init,
    load,
    create,
    filterByType,
    render,
    openViewer,
    closeViewer,
    openCreateModal,
    closeCreateModal,
    getAll: () => documents,
    getByTask: (taskId) => documents.filter(d => d.taskId === taskId),
  };
})();
