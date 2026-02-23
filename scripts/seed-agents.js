#!/usr/bin/env node
// Seeds the three engineering agents into Convex.
// Usage: CONVEX_URL=https://xxx.convex.cloud node scripts/seed-agents.js

const CONVEX_URL = process.env.CONVEX_URL || process.argv[2];
if (!CONVEX_URL) {
  console.error("Usage: CONVEX_URL=https://xxx.convex.cloud node scripts/seed-agents.js");
  process.exit(1);
}

const agents = [
  { name: "Theia",  role: "Optical Design Lead",    emoji: "🔭", status: "idle", sessionKey: "agent:main:main",   model: "claude-sonnet-4-6" },
  { name: "Photon", role: "Optimization & Patents", emoji: "⚡", status: "idle", sessionKey: "agent:photon:main", model: "claude-sonnet-4-6" },
  { name: "Quark",  role: "Zemax Automation",       emoji: "🔬", status: "idle", sessionKey: "agent:quark:main",  model: "gpt-5.3-codex" },
];

async function seed() {
  for (const agent of agents) {
    const res = await fetch(`${CONVEX_URL}/api/mutation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: "agents/upsert", args: agent }),
    });
    const data = await res.json();
    if (data.status === "success") {
      console.log(`✅ ${agent.emoji} ${agent.name} seeded`);
    } else {
      console.error(`❌ ${agent.name} failed:`, JSON.stringify(data));
    }
  }
}

seed().catch(console.error);
