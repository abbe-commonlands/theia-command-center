// 3D Embedding Visualization for Agent Knowledge Spaces
// Uses Three.js for rendering, expects pre-computed UMAP projections

const AGENT_COLORS = {
  abbe: 0x00D4FF,
  seidel: 0x22C55E,
  iris: 0xA855F7,
  theia: 0xEAB308,
  photon: 0xF97316,
  zernike: 0xEC4899,
  kanban: 0x14B8A6,
  deming: 0x6366F1,
  shared: 0xFFFFFF
};

const AGENT_NAMES = {
  abbe: '🧠 Abbe',
  seidel: '💼 Seidel',
  iris: '🎨 Iris',
  theia: '🔬 Theia',
  photon: '⚙️ Photon',
  zernike: '💻 Zernike',
  kanban: '📦 Kanban',
  deming: '✅ Deming',
  shared: '🌐 Shared'
};

const EMBEDDING_MODEL = 'text-embedding-3-small';

function parseMarkdown(content, filename = 'memory') {
  const entries = [];
  const lines = content.split('\n');
  let currentEntry = null;
  let currentContent = [];

  for (const line of lines) {
    const dateMatch = line.match(/^##\s+(\d{4}-\d{2}-\d{2})/);
    const typeMatch = line.match(/^###?\s+(Decision|Event|Entity|Note|Learning|Fix):\s*(.+)/i);

    if (dateMatch) {
      if (currentEntry) {
        currentEntry.content = currentContent.join('\n').trim();
        entries.push(currentEntry);
      }
      currentEntry = {
        id: crypto.randomUUID(),
        date: dateMatch[1],
        type: 'note',
        title: dateMatch[1],
        content: '',
        source: filename
      };
      currentContent = [];
    } else if (typeMatch) {
      if (currentEntry) {
        currentEntry.content = currentContent.join('\n').trim();
        entries.push(currentEntry);
      }
      currentEntry = {
        id: crypto.randomUUID(),
        date: currentEntry?.date || new Date().toISOString().split('T')[0],
        type: typeMatch[1].toLowerCase(),
        title: typeMatch[2],
        content: '',
        source: filename
      };
      currentContent = [];
    } else if (currentEntry && line.trim()) {
      currentContent.push(line);
    }
  }

  if (currentEntry) {
    currentEntry.content = currentContent.join('\n').trim();
    entries.push(currentEntry);
  }

  if (entries.length === 0 && content.trim()) {
    entries.push({
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      type: 'note',
      title: filename.replace(/\.md$/, ''),
      content: content.trim().slice(0, 500),
      source: filename
    });
  }

  return entries;
}

async function selectMemoryFiles() {
  const input = document.createElement('input');
  input.type = 'file';
  input.multiple = true;
  input.accept = '.md,.txt';
  input.webkitdirectory = true;

  return new Promise((resolve) => {
    input.addEventListener('change', () => {
      resolve(Array.from(input.files || []));
    });
    input.click();
  });
}

async function getOpenAiApiKey() {
  const stored = localStorage.getItem('openai_api_key');
  if (stored) return stored;
  const key = window.prompt('Enter your OpenAI API key (stored locally)');
  if (key) {
    localStorage.setItem('openai_api_key', key.trim());
    return key.trim();
  }
  return null;
}

async function fetchEmbeddings(texts, apiKey) {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: texts
    })
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Embeddings failed: ${response.status} ${errorText}`);
  }
  const data = await response.json();
  return data.data.map((item) => item.embedding);
}

async function saveEmbeddingsFile(payload) {
  const json = JSON.stringify(payload, null, 2);
  if (window.showSaveFilePicker) {
    const handle = await window.showSaveFilePicker({
      suggestedName: 'embeddings.json',
      types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }]
    });
    const writable = await handle.createWritable();
    await writable.write(json);
    await writable.close();
    return true;
  }

  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'embeddings.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return false;
}

class EmbeddingViz {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;
    
    this.points = [];
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.hoveredPoint = null;
    this.selectedAgent = null;
    
    this.init();
    this.loadData();
  }
  
  init() {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1E1E24);
    
    // Camera
    const width = this.container.clientWidth;
    const height = this.container.clientHeight || 500;
    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    this.camera.position.set(0, 0, 50);
    
    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.container.appendChild(this.renderer.domElement);
    
    // Controls
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    
    // Tooltip
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'embedding-tooltip';
    this.tooltip.style.cssText = `
      position: absolute;
      background: rgba(30, 30, 36, 0.95);
      border: 1px solid var(--border-subtle);
      border-radius: 6px;
      padding: 8px 12px;
      font-size: 13px;
      pointer-events: none;
      display: none;
      z-index: 100;
      max-width: 300px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    this.container.style.position = 'relative';
    this.container.appendChild(this.tooltip);
    
    // Events
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('resize', this.onResize.bind(this));
    
    // Start animation loop
    this.animate();
  }
  
  async loadData() {
    // Try to load embeddings from file or API
    try {
      const response = await fetch('data/embeddings.json');
      if (response.ok) {
        const data = await response.json();
        this.createPointCloud(data.points);
        return;
      }
    } catch (e) {
      console.log('No embeddings file, using demo data');
    }
    
    // Generate demo data showing agent knowledge domains
    this.createDemoData();
  }

  async generateEmbeddings() {
    if (!window.UMAP) {
      throw new Error('UMAP-js not loaded');
    }

    const files = await selectMemoryFiles();
    if (!files.length) {
      throw new Error('No memory files selected');
    }

    const contents = await Promise.all(files.map((file) => file.text()));
    const entries = contents.flatMap((content, idx) => {
      const file = files[idx];
      const source = file.webkitRelativePath || file.name;
      return parseMarkdown(content, source);
    });

    const texts = entries.map((entry) => `${entry.title}\n${entry.content}`);
    const apiKey = await getOpenAiApiKey();
    if (!apiKey) {
      throw new Error('OpenAI API key required');
    }

    const embeddings = await fetchEmbeddings(texts, apiKey);
    const umap = new window.UMAP({
      nComponents: 3,
      nNeighbors: 15,
      minDist: 0.1
    });
    const projected = umap.fit(embeddings);

    const points = projected.map((coords, idx) => ({
      id: entries[idx].id,
      agent: 'shared',
      label: entries[idx].title,
      x: coords[0],
      y: coords[1],
      z: coords[2]
    }));

    const payload = {
      generatedAt: new Date().toISOString(),
      model: EMBEDDING_MODEL,
      points
    };

    await saveEmbeddingsFile(payload);
    this.createPointCloud(points);
  }
  
  createDemoData() {
    // Create clustered demo data for each agent
    // Shared resources in CENTER, agents in a RING around them
    const points = [];
    const agentList = ['abbe', 'seidel', 'iris', 'theia', 'photon', 'zernike', 'kanban', 'deming'];
    
    // SHARED skills in the CENTER (accessible to all)
    const numShared = 25;
    for (let i = 0; i < numShared; i++) {
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = 2 * Math.PI * Math.random();
      const r = 8 * Math.cbrt(Math.random()); // Uniform sphere distribution
      points.push({
        id: `shared-${i}`,
        agent: 'shared',
        label: this.getDemoLabel('shared', i),
        x: r * Math.sin(phi) * Math.cos(theta),
        y: r * Math.sin(phi) * Math.sin(theta),
        z: r * Math.cos(phi)
      });
    }
    
    // AGENTS in a ring around the shared center
    agentList.forEach((agent, idx) => {
      const angle = (idx / agentList.length) * Math.PI * 2;
      const radius = 25; // Ring radius
      const cx = Math.cos(angle) * radius;
      const cy = Math.sin(angle) * radius;
      const cz = 0;
      
      // Generate points clustered around agent position
      const numPoints = 15;
      for (let i = 0; i < numPoints; i++) {
        const spread = 6;
        points.push({
          id: `${agent}-${i}`,
          agent: agent,
          label: this.getDemoLabel(agent, i),
          x: cx + (Math.random() - 0.5) * spread,
          y: cy + (Math.random() - 0.5) * spread,
          z: cz + (Math.random() - 0.5) * spread
        });
      }
      
      // Add connection points between agent and shared center
      // (representing agent's access to shared resources)
      for (let i = 0; i < 3; i++) {
        const t = 0.3 + Math.random() * 0.3; // Between agent and center
        points.push({
          id: `connection-${agent}-${i}`,
          agent: agent,
          label: `${AGENT_NAMES[agent]} ↔ Shared`,
          x: cx * t + (Math.random() - 0.5) * 3,
          y: cy * t + (Math.random() - 0.5) * 3,
          z: (Math.random() - 0.5) * 3
        });
      }
    });
    
    this.createPointCloud(points);
  }
  
  getDemoLabel(agent, idx) {
    const labels = {
      abbe: ['Squad coordination', 'Memory management', 'Agent orchestration', 'Project tracking', 'Discord integration', 'Telegram routing', 'Heartbeat monitoring', 'Task delegation', 'Context sharing', 'System architecture'],
      seidel: ['Lead management', 'HubSpot pipeline', 'Customer outreach', 'Sales forecasting', 'Quote generation', 'Deal tracking', 'Apollo prospecting', 'Email sequences', 'Win/loss analysis', 'Territory planning'],
      iris: ['Content marketing', 'Social media', 'SEO optimization', 'Brand guidelines', 'Campaign analytics', 'Twitter @Common_Lands', 'LinkedIn strategy', 'Email newsletters', 'Landing pages', 'Ad copywriting'],
      theia: ['Lens specifications', 'Optical design', 'Zemax simulation', 'MTF analysis', 'Sensor compatibility', 'FOV calculations', 'Technical support', 'Application engineering', 'Spec sheets', 'Custom designs'],
      photon: ['Inventory management', 'FedEx tracking', 'Receiving inspection', 'Order fulfillment', 'Shipping logistics', 'TIB tracking', 'Duty drawback', 'PO processing', 'Warehouse ops', 'Returns handling'],
      zernike: ['COS development', 'Next.js components', 'API integrations', 'Database schemas', 'Railway deployment', 'Code reviews', 'Bug fixes', 'Feature development', 'TypeScript', 'React Query'],
      kanban: ['Supply chain', 'Vendor management', 'Lead times', 'Demand planning', 'Reorder points', 'MOQ optimization', 'Freight costs', 'Supplier scoring', 'Inventory turns', 'Safety stock'],
      deming: ['ISO9001 compliance', 'QMS documentation', 'MRB disposition', 'CPAR tracking', 'Inspection protocols', 'Calibration', 'Audit preparation', 'Corrective actions', 'Quality metrics', 'Supplier quality'],
      shared: ['Company info', 'Max preferences', 'Security rules', 'Communication style', 'Tool access', 'API credentials', 'Discord channels', 'Project backlog', 'Customer data', 'Product catalog']
    };
    
    const agentLabels = labels[agent] || ['Knowledge point'];
    return agentLabels[idx % agentLabels.length];
  }
  
  createPointCloud(points) {
    this.points = points;

    if (this.pointCloud) {
      this.scene.remove(this.pointCloud);
      this.pointCloud.geometry.dispose();
      this.pointCloud.material.dispose();
    }
    
    // Create geometry
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];
    
    points.forEach(p => {
      positions.push(p.x, p.y, p.z);
      const color = new THREE.Color(AGENT_COLORS[p.agent] || 0xFFFFFF);
      colors.push(color.r, color.g, color.b);
    });
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    
    // Create material
    const material = new THREE.PointsMaterial({
      size: 1.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true
    });
    
    // Create points mesh
    this.pointCloud = new THREE.Points(geometry, material);
    this.scene.add(this.pointCloud);
    
    // Add legend
    this.createLegend();
  }
  
  createLegend() {
    const legend = document.getElementById('embedding-legend');
    if (!legend) return;
    
    legend.innerHTML = Object.entries(AGENT_NAMES).map(([id, name]) => `
      <div class="legend-item" data-agent="${id}" style="cursor: pointer;">
        <span class="legend-color" style="background: #${AGENT_COLORS[id].toString(16).padStart(6, '0')};"></span>
        <span class="legend-label">${name}</span>
      </div>
    `).join('');
    
    // Add click handlers for filtering
    legend.querySelectorAll('.legend-item').forEach(item => {
      item.addEventListener('click', () => {
        const agent = item.dataset.agent;
        this.filterByAgent(agent === this.selectedAgent ? null : agent);
        
        // Update UI
        legend.querySelectorAll('.legend-item').forEach(i => i.classList.remove('active'));
        if (agent !== this.selectedAgent) {
          item.classList.add('active');
        }
        this.selectedAgent = agent === this.selectedAgent ? null : agent;
      });
    });
  }
  
  filterByAgent(agentId) {
    if (!this.pointCloud) return;
    
    const colors = this.pointCloud.geometry.attributes.color;
    
    this.points.forEach((p, i) => {
      const color = new THREE.Color(AGENT_COLORS[p.agent] || 0xFFFFFF);
      const alpha = agentId === null || p.agent === agentId ? 1 : 0.1;
      colors.setXYZ(i, color.r * alpha, color.g * alpha, color.b * alpha);
    });
    
    colors.needsUpdate = true;
  }
  
  onMouseMove(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    if (this.pointCloud) {
      const intersects = this.raycaster.intersectObject(this.pointCloud);
      
      if (intersects.length > 0) {
        const idx = intersects[0].index;
        const point = this.points[idx];
        
        if (point) {
          this.tooltip.innerHTML = `
            <div style="color: #${AGENT_COLORS[point.agent].toString(16).padStart(6, '0')}; font-weight: 600; margin-bottom: 4px;">
              ${AGENT_NAMES[point.agent]}
            </div>
            <div style="color: var(--text-primary);">${point.label}</div>
            ${point.overlap ? `<div style="color: var(--text-muted); font-size: 11px; margin-top: 4px;">Overlaps with ${AGENT_NAMES[point.overlap]}</div>` : ''}
          `;
          this.tooltip.style.display = 'block';
          this.tooltip.style.left = (event.clientX - rect.left + 15) + 'px';
          this.tooltip.style.top = (event.clientY - rect.top + 15) + 'px';
        }
      } else {
        this.tooltip.style.display = 'none';
      }
    }
  }
  
  onResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight || 500;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }
  
  animate() {
    requestAnimationFrame(this.animate.bind(this));
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

// Initialize when tab is shown
function initEmbeddingViz() {
  if (!window.embeddingViz) {
    window.embeddingViz = new EmbeddingViz('embedding-container');
  }

  const generateBtn = document.getElementById('generate-embeddings-btn');
  if (generateBtn && !generateBtn.dataset.bound) {
    generateBtn.dataset.bound = 'true';
    generateBtn.addEventListener('click', async () => {
      // Regenerate demo visualization instead of opening file picker
      if (window.embeddingViz) {
        window.embeddingViz.createDemoData();
        if (window.Components?.Toasts) {
          Components.Toasts.show('Knowledge map refreshed with agent domains', 'success');
        }
      }
    });
  }
}

window.EmbeddingViz = EmbeddingViz;
window.initEmbeddingViz = initEmbeddingViz;
