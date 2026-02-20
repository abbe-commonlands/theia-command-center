// Skills Registry - Scans actual agent workspaces for skills

const SKILLS_CONFIG = {
  sharedPath: '~/.openclaw/skills/',
  globalSkillsPath: '~/openclaw/skills/',
  agents: [
    { id: 'abbe', name: 'Abbe', emoji: '🧠', workspace: '~/clawd/clawd', color: '#00D4FF', model: 'codex', channel: 'telegram' },
    { id: 'seidel', name: 'Seidel', emoji: '🎯', workspace: '~/clawd/clawd-seidel', color: '#22C55E', model: 'codex', channel: 'telegram' },
    { id: 'iris', name: 'Iris', emoji: '📡', workspace: '~/clawd/clawd-iris', color: '#A855F7', model: 'codex', channel: 'telegram' },
    { id: 'zernike', name: 'Zernike', emoji: '💻', workspace: '~/clawd/clawd-zernike', color: '#EC4899', model: 'codex', channel: 'telegram' },
    { id: 'kanban', name: 'Kanban', emoji: '📦', workspace: '~/clawd/clawd-kanban', color: '#14B8A6', model: 'codex', channel: 'telegram' },
    { id: 'deming', name: 'Deming', emoji: '✅', workspace: '~/clawd/clawd-deming', color: '#6366F1', model: 'codex', channel: 'telegram' },
    { id: 'ernst', name: 'Ernst', emoji: '🔍', workspace: '~/clawd/clawd-ernst', color: '#F59E0B', model: 'codex', channel: 'telegram' },
  ]
};

const AVAILABLE_MODELS = [
  { value: 'opus', label: 'Claude Opus 4', color: '#00D4FF' },
  { value: 'sonnet', label: 'Claude Sonnet 4', color: '#A855F7' },
  { value: 'codex', label: 'GPT-5.3 Codex', color: '#F97316' },
];

// Skills data - will be populated by API or file scan
let skillsData = {
  shared: [],
  perAgent: {}
};

let cronsData = [];

// Initialize perAgent for each agent
SKILLS_CONFIG.agents.forEach(agent => {
  skillsData.perAgent[agent.id] = [];
});

function renderSkillCard(skill, agentColor = null, location = 'shared', agentId = null) {
  const borderColor = agentColor ? `border-left: 3px solid ${agentColor};` : '';
  const moveButtons = location === 'shared' 
    ? `<div class="skill-actions">
        <select class="skill-move-select input select" data-skill="${skill.name}" data-from="shared" style="font-size: 11px; padding: 4px 8px; min-height: 28px;">
          <option value="">Move to agent...</option>
          ${SKILLS_CONFIG.agents.map(a => `<option value="${a.id}">${a.emoji} ${a.name}</option>`).join('')}
        </select>
       </div>`
    : `<div class="skill-actions">
        <button class="btn btn-sm skill-move-btn" data-skill="${skill.name}" data-from="${agentId}" data-to="shared" style="font-size: 11px; padding: 4px 8px;">
          → Shared
        </button>
       </div>`;
  
  return `
    <div class="skill-card" style="${borderColor}">
      <div class="skill-icon">${skill.icon || '🛠️'}</div>
      <div class="skill-info">
        <div class="skill-name">${skill.name}</div>
        <div class="skill-desc">${skill.description || 'No description'}</div>
        ${moveButtons}
      </div>
    </div>
  `;
}

function renderSharedSkills() {
  const container = document.getElementById('shared-skills');
  if (!container) return;
  
  if (skillsData.shared.length === 0) {
    container.innerHTML = `
      <div class="skills-empty">
        <p>No shared skills detected</p>
        <p style="font-size: var(--text-caption); color: var(--text-muted);">
          Skills in ~/.clawdbot/skills/ will appear here
        </p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = skillsData.shared.map(s => renderSkillCard(s, null, 'shared')).join('');
  bindSkillMoveEvents();
}

function renderAgentSkills() {
  const container = document.getElementById('agent-skills');
  if (!container) return;
  
  const html = SKILLS_CONFIG.agents.map(agent => {
    const skills = skillsData.perAgent[agent.id] || [];
    const skillsHtml = skills.length > 0
      ? `<div class="skills-grid">${skills.map(s => renderSkillCard(s, agent.color, 'agent', agent.id)).join('')}</div>`
      : `<div class="skills-empty-inline">No agent-specific skills</div>`;
    
    const modelOptions = AVAILABLE_MODELS.map(m => 
      `<option value="${m.value}" ${agent.model === m.value ? 'selected' : ''}>${m.label}</option>`
    ).join('');
    
    const channelBadge = agent.channel 
      ? `<span style="background: rgba(0,212,255,0.1); color: var(--accent-cyan); font-size: 11px; padding: 2px 8px; border-radius: 4px; margin-left: 8px;">
           ${agent.channel}
         </span>`
      : `<span style="background: var(--bg-primary); color: var(--text-muted); font-size: 11px; padding: 2px 8px; border-radius: 4px; margin-left: 8px;">
           No channel
         </span>`;
    
    return `
      <div class="agent-skill-section" style="border-left: 3px solid ${agent.color};">
        <div class="agent-skill-header">
          <span class="agent-skill-emoji">${agent.emoji}</span>
          <span class="agent-skill-name">${agent.name}</span>
          <select class="agent-model-select input select" data-agent="${agent.id}" style="font-size: 12px; padding: 4px 8px; min-height: 28px; min-width: 140px; background: var(--bg-primary);">
            ${modelOptions}
          </select>
          ${channelBadge}
          <span class="agent-skill-count" style="background: ${agent.color}20; color: ${agent.color};">${skills.length} skill${skills.length !== 1 ? 's' : ''}</span>
        </div>
        ${skillsHtml}
      </div>
    `;
  }).join('');
  
  container.innerHTML = html;
  bindModelSelectEvents();
  bindSkillMoveEvents();
}

function bindModelSelectEvents() {
  document.querySelectorAll('.agent-model-select').forEach(select => {
    select.addEventListener('change', async (e) => {
      const agentId = e.target.dataset.agent;
      const newModel = e.target.value;
      
      // Update local config
      const agent = SKILLS_CONFIG.agents.find(a => a.id === agentId);
      if (agent) {
        agent.model = newModel;
      }
      
      // Call gateway API to update model
      try {
        const response = await fetch('http://127.0.0.1:18789/api/config/agent-model', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentId, model: newModel })
        });
        
        if (response.ok) {
          showToast(`${agent?.name || agentId} model changed to ${newModel}`, 'success');
        } else {
          // API might not exist, show manual instructions
          showToast(`Model change requires manual config update. Set ${agentId} to ${newModel} in clawdbot.json`, 'warning');
        }
      } catch (e) {
        // API not available, show command
        const modelMap = {
          'opus': 'anthropic/claude-opus-4-5',
          'sonnet': 'anthropic/claude-sonnet-4-5', 
          'haiku': 'anthropic/claude-haiku-3-5',
          'codex': 'codex'
        };
        showToast(`Update model manually: edit ~/.clawdbot/clawdbot.json → agents.list → ${agentId} → model: "${modelMap[newModel] || newModel}"`, 'info');
      }
    });
  });
}

function bindSkillMoveEvents() {
  // Handle move-to-agent dropdown
  document.querySelectorAll('.skill-move-select').forEach(select => {
    select.addEventListener('change', async (e) => {
      const skillName = e.target.dataset.skill;
      const fromLocation = e.target.dataset.from;
      const toAgentId = e.target.value;
      
      if (!toAgentId) return;
      
      await moveSkill(skillName, fromLocation, toAgentId);
      e.target.value = ''; // Reset dropdown
    });
  });
  
  // Handle move-to-shared buttons
  document.querySelectorAll('.skill-move-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const skillName = e.target.dataset.skill;
      const fromAgentId = e.target.dataset.from;
      const toLocation = e.target.dataset.to;
      
      await moveSkill(skillName, fromAgentId, toLocation);
    });
  });
}

async function moveSkill(skillName, from, to) {
  const fromPath = from === 'shared' 
    ? `~/.clawdbot/skills/${skillName}`
    : `~/clawd-${from}/skills/${skillName}`;
  
  const toPath = to === 'shared'
    ? `~/.clawdbot/skills/${skillName}`
    : `~/clawd-${to}/skills/${skillName}`;
  
  const cmd = `mv ${fromPath} ${toPath}`;
  
  // Try to execute via gateway API first
  try {
    const response = await fetch('http://127.0.0.1:18789/api/exec', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: cmd })
    });
    
    if (response.ok) {
      showToast(`✓ Moved ${skillName} from ${from} to ${to}`, 'success');
      // Refresh skills display
      await fetchSkillsData();
      renderSharedSkills();
      renderAgentSkills();
      return;
    }
  } catch (e) {
    // API not available
  }
  
  // Fallback: show command for manual execution
  showToast(`Run in terminal: ${cmd}`, 'info');
}

// Check if running locally
function isLocalhost() {
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
}

// Fetch skills data from API endpoint (if available) or use defaults
async function fetchSkillsData() {
  // Skip gateway API calls when running remotely (Vercel)
  if (!isLocalhost()) {
    console.log('Running remotely, using static skills data');
    useStaticSkillsData();
    return;
  }
  
  try {
    // Try to fetch from Clawdbot gateway API
    const response = await fetch('http://127.0.0.1:18789/api/skills', { 
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    if (response.ok) {
      const data = await response.json();
      if (data.skills) {
        processSkillsFromAPI(data.skills);
        return;
      }
    }
  } catch (e) {
    console.log('Gateway API not available, using static scan');
  }
  
  // Fallback: use known skills from last scan
  useStaticSkillsData();
}

async function fetchCronsData() {
  // Skip gateway API calls when running remotely (Vercel)
  if (!isLocalhost()) {
    cronsData = [];
    return;
  }
  
  try {
    const response = await fetch('http://127.0.0.1:18789/api/cron/list', {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    if (response.ok) {
      const data = await response.json();
      const crons = Array.isArray(data) ? data : (data.crons || data.jobs || []);
      cronsData = Array.isArray(crons) ? crons : [];
      return;
    }
  } catch (e) {
    console.log('Cron API not available, using empty list');
  }
  cronsData = [];
}

function renderCrons() {
  const container = document.getElementById('crons-list');
  if (!container) return;
  
  // Check if running remotely (not localhost)
  const isRemote = !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1');

  if (!cronsData.length) {
    container.innerHTML = `
      <div class="skills-empty">
        <p>${isRemote ? 'Cron jobs only visible locally' : 'No cron jobs detected'}</p>
        <p style="font-size: var(--text-caption); color: var(--text-muted);">
          ${isRemote ? 'Connect to local gateway to view crons' : 'Gateway cron registry will appear here'}
        </p>
      </div>
    `;
    return;
  }

  const rows = cronsData.map((cron) => {
    const name = cron.name || cron.id || cron.job || 'Unnamed cron';
    const schedule = cron.schedule || cron.cron || cron.expression || '—';
    const status = cron.enabled === false ? 'disabled' : (cron.status || 'active');
    const lastRun = cron.lastRun || cron.last_run || cron.lastExecuted || '';
    const details = lastRun ? `<div style="font-size: var(--text-caption); color: var(--text-muted);">Last run: ${lastRun}</div>` : '';

    return `
      <div class="skill-card">
        <div class="skill-icon">⏱️</div>
        <div class="skill-info">
          <div class="skill-name">${name}</div>
          <div class="skill-desc">${schedule}</div>
          <div style="font-size: var(--text-caption); color: var(--accent-cyan); margin-top: 4px;">${status}</div>
          ${details}
        </div>
      </div>
    `;
  });

  container.innerHTML = rows.join('');
}

function processSkillsFromAPI(skills) {
  // Clear existing
  skillsData.shared = [];
  SKILLS_CONFIG.agents.forEach(agent => {
    skillsData.perAgent[agent.id] = [];
  });
  
  // Process skills from API
  skills.forEach(skill => {
    const skillObj = {
      name: skill.name,
      description: skill.description || '',
      icon: getSkillIcon(skill.name)
    };
    
    if (skill.shared) {
      skillsData.shared.push(skillObj);
    } else if (skill.agentId && skillsData.perAgent[skill.agentId]) {
      skillsData.perAgent[skill.agentId].push(skillObj);
    }
  });
}

function getSkillIcon(name) {
  const icons = {
    'agent-protocol': '🔗',
    'backend-patterns': '🏗️',
    'docx-skill': '📄',
    'pptx-creator': '📊',
    'xlsx': '📈',
    'github': '🐙',
    'gog': '📧',
    '1password': '🔐',
    'bird': '🐦',
    'slack': '💬',
    'notion': '📝',
    'discord': '💬',
    'summarize': '📋',
    'weather': '🌤️',
    'codex-orchestration': '🎭',
    'frontend-design': '🎨',
    'mineru-pdf': '📑',
    'coding-agent': '🤖',
    'marketing-mode': '📣',
    'humanizer': '✍️',
    'geo-optimization': '🔍',
    'shopify-marketing-expert': '🛒',
    'vercel-react-best-practices': '⚛️',
    'hubspot': '📊',
    'google-ads': '📈',
    'next-best-practices': '⚛️',
    'coding-discipline': '🧠',
    'executing-plans': '📋',
  };
  return icons[name] || '🛠️';
}

function useStaticSkillsData() {
  // Static data from installed skills — updated 2026-02-19
  // Shared: ~/.openclaw/skills/  |  Bundled: ~/openclaw/skills/
  skillsData = {
    shared: [
      { name: 'agent-protocol', description: 'Agent-to-agent communication protocol', icon: '🔗' },
      { name: 'backend-patterns', description: 'Backend architecture & API design patterns', icon: '🏗️' },
      { name: 'coding-discipline', description: 'Rules to avoid subtle coding errors', icon: '🧠' },
      { name: 'executing-plans', description: 'Execute implementation plans with checkpoints', icon: '📋' },
      { name: 'frontend-design', description: 'Build production-grade UIs', icon: '🎨' },
      { name: 'gitclassic', description: 'Fast GitHub browser for AI agents', icon: '🐙' },
      { name: 'hubspot', description: 'HubSpot CRM & CMS API integration', icon: '📊' },
      { name: 'google-ads', description: 'Google Ads campaign audit & optimization', icon: '📈' },
      { name: 'humanizer', description: 'Remove AI writing patterns', icon: '✍️' },
      { name: 'jq-json-processor', description: 'Process JSON with jq', icon: '🔍' },
      { name: 'mineru-pdf', description: 'Parse PDFs to Markdown (OCR)', icon: '📑' },
      { name: 'mission-control', description: 'Wake/sleep lifecycle reporting', icon: '📡' },
      { name: 'next-best-practices', description: 'Next.js best practices & conventions', icon: '⚛️' },
      { name: 'pptx-creator', description: 'Create PowerPoint presentations', icon: '📊' },
      { name: 'task-system', description: 'Create, move, complete tasks on board', icon: '✅' },
      { name: 'ux-audit', description: 'Automated UX design audits', icon: '👁️' },
      { name: 'vercel-react-best-practices', description: 'React/Next.js performance optimization', icon: '⚛️' },
      { name: 'xlsx', description: 'Create and analyze Excel spreadsheets', icon: '📈' },
    ],
    perAgent: {
      abbe: [],
      seidel: [
        { name: 'apollo-enrichment', description: 'Apollo.io contact/company enrichment for sales prospecting', icon: '🎯' },
        { name: 'firecrawler', description: 'Web scraping & competitor intelligence via Firecrawl', icon: '🔥' },
        { name: 'hubspot', description: 'HubSpot CRM contacts, deals, companies', icon: '📊' },
        { name: 'phantombuster', description: 'LinkedIn automation & lead generation', icon: '👻' },
      ],
      iris: [
        { name: 'geo-optimization', description: 'GEO audit, schema markup, llms.txt, AI search monitoring', icon: '🔍' },
        { name: 'google-ads', description: 'Google Ads campaign audit & optimization', icon: '📈' },
        { name: 'google-analytics', description: 'GA4 + Google Search Console queries & reporting', icon: '📊' },
        { name: 'marketing-mode', description: 'B2B technical marketing playbooks & content strategy', icon: '📣' },
      ],
      zernike: [],
      kanban: [],
      deming: [],
      ernst: [
        { name: 'hubspot', description: 'HubSpot CRM contacts, deals, companies', icon: '📊' },
      ],
    }
  };

  // Also include bundled OpenClaw skills
  const bundled = [
    { name: '1password', description: '1Password CLI integration', icon: '🔐' },
    { name: 'blogwatcher', description: 'Monitor blogs and RSS feeds', icon: '📰' },
    { name: 'coding-agent', description: 'Run Codex/Claude Code agents', icon: '🤖' },
    { name: 'github', description: 'GitHub CLI (gh) integration', icon: '🐙' },
    { name: 'gog', description: 'Google Workspace (Gmail, Calendar, Drive)', icon: '📧' },
    { name: 'healthcheck', description: 'Host security hardening', icon: '🛡️' },
    { name: 'skill-creator', description: 'Create or update agent skills', icon: '🛠️' },
    { name: 'summarize', description: 'Summarize URLs, podcasts, files', icon: '📋' },
    { name: 'tmux', description: 'Remote-control tmux sessions', icon: '🖥️' },
    { name: 'video-frames', description: 'Extract frames from videos', icon: '🎬' },
    { name: 'weather', description: 'Current weather and forecasts', icon: '🌤️' },
  ];
  skillsData.shared.push(...bundled);
}

function showToast(message, type = 'info') {
  if (window.Components?.Toasts) {
    Components.Toasts.show(message, type);
  } else if (window.Mission?.showToast) {
    window.Mission.showToast(message, type);
  } else {
    console.log(`[${type}] ${message}`);
  }
}

function initSkills() {
  Promise.all([fetchSkillsData(), fetchCronsData()]).then(() => {
    renderSharedSkills();
    renderAgentSkills();
    renderCrons();
  });
  
  // Refresh button
  const refreshBtn = document.getElementById('refresh-skills-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      Promise.all([fetchSkillsData(), fetchCronsData()]).then(() => {
        renderSharedSkills();
        renderAgentSkills();
        renderCrons();
        showToast('Skills + crons refreshed', 'success');
      });
    });
  }
}

// Initialize when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSkills);
} else {
  initSkills();
}

// Export for other modules
window.Skills = { 
  init: initSkills, 
  render: { shared: renderSharedSkills, agents: renderAgentSkills, crons: renderCrons },
  config: SKILLS_CONFIG,
  data: skillsData,
  crons: cronsData,
  moveSkill
};
