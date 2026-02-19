#!/usr/bin/env node
/**
 * Seed real data into Convex for Calendar + Memory Browser.
 * Run: cd ~/clawd/projects/abbe-command-center && node scripts/seed-data.js
 */

const { ConvexHttpClient } = require("convex/browser");
const fs = require("fs");
const path = require("path");

const CONVEX_URL = "https://quick-whale-641.convex.cloud";
const client = new ConvexHttpClient(CONVEX_URL);

// We need the api module
const { api } = require("../convex/_generated/api.js");

// ============================================================
// CALENDAR: Seed from real OpenClaw cron jobs
// ============================================================

const cronJobs = [
  {
    name: "abbe-heartbeat",
    type: "heartbeat",
    schedule: "0 3,9,15,21 * * *",
    scheduleKind: "cron",
    agentName: "Abbe",
    enabled: false,
    lastRunAt: 1771455600006,
    lastRunResult: "success",
    nextRunAt: 1771498800000,
  },
  {
    name: "zernike-heartbeat",
    type: "heartbeat",
    schedule: "0 5,11,17,23 * * *",
    scheduleKind: "cron",
    agentName: "Zernike",
    enabled: true,
    lastRunAt: 1771462800011,
    lastRunResult: "success",
    nextRunAt: 1771484400000,
  },
  {
    name: "iris-heartbeat",
    type: "heartbeat",
    schedule: "0 7,13,19,1 * * *",
    scheduleKind: "cron",
    agentName: "Iris",
    enabled: true,
    lastRunAt: 1771470000015,
    lastRunResult: "success",
    nextRunAt: 1771491600000,
  },
  {
    name: "ernst-heartbeat",
    type: "heartbeat",
    schedule: "0 3,9,15,21 * * *",
    scheduleKind: "cron",
    agentName: "Ernst",
    enabled: true,
    lastRunAt: 1771477200013,
    lastRunResult: "success",
    nextRunAt: 1771498800000,
  },
  {
    name: "seidel-heartbeat",
    type: "heartbeat",
    schedule: "20 3,9,15,21 * * *",
    scheduleKind: "cron",
    agentName: "Seidel",
    enabled: true,
    lastRunAt: 1771478400014,
    lastRunResult: "success",
    nextRunAt: 1771500000000,
  },
  {
    name: "kanban-heartbeat",
    type: "heartbeat",
    schedule: "40 3,9,15,21 * * *",
    scheduleKind: "cron",
    agentName: "Kanban",
    enabled: true,
    lastRunAt: 1771479600004,
    lastRunResult: "success",
    nextRunAt: 1771501200000,
  },
  {
    name: "deming-heartbeat",
    type: "heartbeat",
    schedule: "50 3,9,15,21 * * *",
    scheduleKind: "cron",
    agentName: "Deming",
    enabled: true,
    lastRunAt: 1771480200012,
    lastRunResult: "success",
    nextRunAt: 1771501800000,
  },
  {
    name: "OpenClaw Backup 2am",
    type: "cron",
    schedule: "0 2 * * *",
    scheduleKind: "cron",
    agentName: "Abbe",
    enabled: true,
    lastRunAt: 1770285600001,
    lastRunResult: "success",
    nextRunAt: 1771495200000,
  },
  {
    name: "nightly-build",
    type: "cron",
    schedule: "0 23 * * *",
    scheduleKind: "cron",
    agentName: "Abbe",
    enabled: false,
    lastRunAt: 1770274800004,
    lastRunResult: "failure",
  },
  {
    name: "Remind: fix gh workflow scope",
    type: "task",
    schedule: "2026-02-19T15:30:00.000Z",
    scheduleKind: "at",
    agentName: "Abbe",
    enabled: true,
    nextRunAt: 1771515000000,
  },
];

// ============================================================
// MEMORY: Seed from real workspace files
// ============================================================

function readFileIfExists(filePath) {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }
}

function extractSections(content) {
  const sections = [];
  const lines = content.split("\n");
  let currentHeading = null;
  let currentContent = [];

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,4}\s+(.+)/);
    if (headingMatch) {
      if (currentHeading) {
        sections.push({ heading: currentHeading, content: currentContent.join("\n").trim() });
      }
      currentHeading = headingMatch[1];
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }
  if (currentHeading) {
    sections.push({ heading: currentHeading, content: currentContent.join("\n").trim() });
  }
  return sections;
}

function getDateFromFilename(filename) {
  const match = filename.match(/(\d{4}-\d{2}-\d{2})/);
  if (match) return new Date(match[1]).getTime();
  return Date.now();
}

const memoryFiles = [
  // Abbe long-term memory
  {
    agentName: "Abbe",
    sourcePath: "~/clawd/clawd/MEMORY.md",
    sourceType: "longterm",
    filePath: path.join(process.env.HOME, "clawd/clawd/MEMORY.md"),
  },
  // Zernike daily
  {
    agentName: "Zernike",
    sourcePath: "~/clawd-zernike/memory/2026-02-09.md",
    sourceType: "daily",
    filePath: path.join(process.env.HOME, "clawd-zernike/memory/2026-02-09.md"),
  },
  // Zernike working
  {
    agentName: "Zernike",
    sourcePath: "~/clawd-zernike/memory/WORKING.md",
    sourceType: "working",
    filePath: path.join(process.env.HOME, "clawd-zernike/memory/WORKING.md"),
  },
];

async function main() {
  console.log("🗓️  Seeding Calendar (scheduledEvents)...");
  
  for (const job of cronJobs) {
    try {
      await client.mutation(api.scheduledEvents.upsert, {
        name: job.name,
        type: job.type,
        schedule: job.schedule,
        scheduleKind: job.scheduleKind,
        agentName: job.agentName,
        enabled: job.enabled,
        nextRunAt: job.nextRunAt,
        metadata: {
          lastRunAt: job.lastRunAt,
          lastRunResult: job.lastRunResult,
        },
      });
      console.log(`  ✅ ${job.name} (${job.type})`);
    } catch (err) {
      console.error(`  ❌ ${job.name}: ${err.message}`);
    }
  }

  console.log("\n🧠 Seeding Memory Browser (memories)...");

  for (const mem of memoryFiles) {
    const content = readFileIfExists(mem.filePath);
    if (!content) {
      console.log(`  ⏭️  Skipping ${mem.sourcePath} (not found)`);
      continue;
    }
    
    const sections = extractSections(content);
    const date = mem.sourceType === "daily"
      ? getDateFromFilename(mem.filePath)
      : fs.statSync(mem.filePath).mtimeMs;

    try {
      await client.mutation(api.memories.sync, {
        agentName: mem.agentName,
        sourcePath: mem.sourcePath,
        sourceType: mem.sourceType,
        content: content,
        date: date,
        sections: sections.length > 0 ? sections : undefined,
      });
      console.log(`  ✅ ${mem.agentName} — ${mem.sourcePath} (${content.length} chars, ${sections.length} sections)`);
    } catch (err) {
      console.error(`  ❌ ${mem.sourcePath}: ${err.message}`);
    }
  }

  console.log("\n✨ Done!");
}

main().catch(console.error);
