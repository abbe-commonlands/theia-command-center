#!/usr/bin/env node
/**
 * Notification Dispatcher Daemon
 * 
 * Polls Convex for undelivered notifications and sends them to agents
 * via OpenClaw sessions_send.
 * 
 * Run with: pm2 start notification-dispatcher.mjs --name "notif-dispatcher"
 */

import { ConvexHttpClient } from "convex/browser";

// Convex deployment URL
const CONVEX_URL = "https://aromatic-trout-929.convex.cloud";

// Agent session keys mapping
const AGENT_SESSIONS = {
  "Abbe": "agent:main:main",
  "Zernike": "agent:zernike:main",
  "Seidel": "agent:seidel:main",
  "Iris": "agent:iris:main",
  "Photon": "agent:photon:main",
  "Deming": "agent:deming:main",
  "Kanban": "agent:kanban:main",
  "Ernst": "agent:ernst:main",
  "Theia": "agent:theia:main",
};

// OpenClaw Gateway config
const OPENCLAW_GATEWAY = process.env.OPENCLAW_GATEWAY_URL || "http://localhost:4440";
const OPENCLAW_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || "";

const POLL_INTERVAL = 2000; // 2 seconds

// Initialize Convex client
const convex = new ConvexHttpClient(CONVEX_URL);

/**
 * Get all undelivered notifications from Convex
 */
async function getUndeliveredNotifications() {
  try {
    // Query all agents to get their notifications
    const agents = await convex.query("agents:list", {});
    const allNotifications = [];

    for (const agent of agents) {
      const notifications = await convex.query("notifications:listUnread", {
        agentSession: agent.sessionKey,
      });
      
      for (const notif of notifications) {
        allNotifications.push({
          ...notif,
          agentName: agent.name,
          agentSession: agent.sessionKey,
        });
      }
    }

    return allNotifications;
  } catch (err) {
    console.error("[Dispatcher] Failed to fetch notifications:", err.message);
    return [];
  }
}

/**
 * Send notification to agent via OpenClaw gateway
 */
async function sendToAgent(sessionKey, message) {
  const url = `${OPENCLAW_GATEWAY}/api/sessions/send`;
  
  const body = {
    sessionKey,
    message: `📢 **Notification**\n${message}`,
  };

  const headers = {
    "Content-Type": "application/json",
  };

  if (OPENCLAW_TOKEN) {
    headers["Authorization"] = `Bearer ${OPENCLAW_TOKEN}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gateway error: ${response.status} - ${text}`);
  }

  return response.json();
}

/**
 * Mark notification as delivered in Convex
 */
async function markDelivered(notificationId) {
  try {
    await convex.mutation("notifications:markDelivered", { id: notificationId });
    return true;
  } catch (err) {
    console.error("[Dispatcher] Failed to mark delivered:", err.message);
    return false;
  }
}

/**
 * Main polling loop
 */
async function poll() {
  const notifications = await getUndeliveredNotifications();

  if (notifications.length > 0) {
    console.log(`[Dispatcher] Found ${notifications.length} undelivered notification(s)`);
  }

  for (const notif of notifications) {
    const sessionKey = notif.agentSession || AGENT_SESSIONS[notif.agentName];
    
    if (!sessionKey) {
      console.warn(`[Dispatcher] No session key for agent: ${notif.agentName}`);
      continue;
    }

    try {
      console.log(`[Dispatcher] Sending to ${notif.agentName} (${sessionKey})`);
      
      await sendToAgent(sessionKey, notif.content);
      await markDelivered(notif._id);
      
      console.log(`[Dispatcher] ✓ Delivered to ${notif.agentName}`);
    } catch (err) {
      // Agent might be asleep or unavailable - notification stays queued
      console.log(`[Dispatcher] Agent ${notif.agentName} unavailable: ${err.message}`);
    }
  }
}

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main loop
 */
async function main() {
  console.log("[Dispatcher] Starting notification dispatcher daemon");
  console.log(`[Dispatcher] Convex: ${CONVEX_URL}`);
  console.log(`[Dispatcher] Gateway: ${OPENCLAW_GATEWAY}`);
  console.log(`[Dispatcher] Poll interval: ${POLL_INTERVAL}ms`);
  console.log("[Dispatcher] Agents:", Object.keys(AGENT_SESSIONS).join(", "));
  console.log("---");

  while (true) {
    try {
      await poll();
    } catch (err) {
      console.error("[Dispatcher] Poll error:", err.message);
    }
    
    await sleep(POLL_INTERVAL);
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n[Dispatcher] Shutting down...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n[Dispatcher] Shutting down...");
  process.exit(0);
});

// Start
main();
