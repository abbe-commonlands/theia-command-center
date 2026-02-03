#!/usr/bin/env node

const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const https = require('node:https');
const vm = require('node:vm');
const crypto = require('node:crypto');

const AGENT_IDS = ['abbe', 'seidel', 'iris', 'theia', 'photon', 'zernike', 'kanban', 'deming'];
const EMBEDDING_MODEL = 'text-embedding-3-small';
const UMAP_CDN = 'https://cdn.jsdelivr.net/npm/umap-js@latest/dist/umap.min.js';

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

async function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to load ${url}: ${res.statusCode}`));
        res.resume();
        return;
      }
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function loadUmap() {
  const code = await fetchText(UMAP_CDN);
  const sandbox = { window: {}, self: {}, global: {}, exports: {}, module: { exports: {} } };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: 'umap.min.js' });
  const maybe = [
    sandbox.UMAP,
    sandbox.window.UMAP,
    sandbox.self.UMAP,
    sandbox.global.UMAP,
    sandbox.module.exports?.UMAP,
    sandbox.module.exports,
    sandbox.exports.UMAP
  ];
  const UMAP = maybe.find((value) => typeof value === 'function');
  if (!UMAP) {
    throw new Error('UMAP constructor not found in CDN bundle');
  }
  return UMAP;
}

function inferAgent(source) {
  const lower = source.toLowerCase();
  for (const id of AGENT_IDS) {
    if (lower.includes(`/${id}/`) || lower.includes(`${id}-`) || lower.includes(`${id}.`)) {
      return id;
    }
  }
  return 'shared';
}

async function listMemoryFiles(rootDir) {
  const files = [];
  const memoryRoot = path.join(rootDir, 'memory');

  const mainMemory = path.join(rootDir, 'MEMORY.md');
  try {
    await fs.access(mainMemory);
    files.push(mainMemory);
  } catch (error) {
    // ignore if not present
  }

  async function walk(dir) {
    let entries = [];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (error) {
      return;
    }
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile() && /\.(md|txt)$/i.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }

  await walk(memoryRoot);
  return files;
}

async function fetchEmbeddings(texts, apiKey) {
  if (!globalThis.fetch) {
    throw new Error('Node fetch is not available. Use Node 18+ or a fetch polyfill.');
  }

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

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required');
  }

  const memoryRoot = process.env.MEMORY_ROOT || path.join(os.homedir(), 'clawd');
  const files = await listMemoryFiles(memoryRoot);

  if (!files.length) {
    throw new Error(`No memory files found in ${memoryRoot}`);
  }

  const contents = await Promise.all(files.map((file) => fs.readFile(file, 'utf8')));
  const entries = contents.flatMap((content, idx) => {
    const file = files[idx];
    const relative = path.relative(memoryRoot, file) || path.basename(file);
    return parseMarkdown(content, relative);
  });

  const texts = entries.map((entry) => `${entry.title}\n${entry.content}`);
  const embeddings = await fetchEmbeddings(texts, apiKey);
  const UMAP = await loadUmap();

  const umap = new UMAP({
    nComponents: 3,
    nNeighbors: 15,
    minDist: 0.1
  });
  const projected = umap.fit(embeddings);

  const points = projected.map((coords, idx) => ({
    id: entries[idx].id,
    agent: inferAgent(entries[idx].source),
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

  const outputDir = path.join(__dirname, '..', 'data');
  await fs.mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, 'embeddings.json');
  await fs.writeFile(outputPath, JSON.stringify(payload, null, 2));

  console.log(`✓ Wrote ${points.length} embeddings to ${outputPath}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
