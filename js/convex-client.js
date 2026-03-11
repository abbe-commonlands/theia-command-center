/**
 * Convex Client for Mission Control
 * Real-time database with subscriptions
 * 
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  ACTIVE: https://peaceful-frog-360.convex.cloud                    ║
 * ║  Project: theiacommandcenter (Theia Engineering Command Center)    ║
 * ║                                                                     ║
 * ║  To deploy schema/functions:                                        ║
 * ║    npx convex login  (select theiacommandcenter project)           ║
 * ║    npx convex deploy --prod                                         ║
 * ║                                                                     ║
 * ║  RETIRED: aromatic-trout-929 — Abbe business command center       ║
 * ║  RETIRED: quick-whale-641   — old dev deployment                   ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */
(() => {
  // Production Convex — Theia Engineering Command Center
  const CONVEX_URL = "https://peaceful-frog-360.convex.cloud";
  
  let client = null;
  let listeners = new Map();
  let pollInterval = null;
  let isReady = false;

  // Initialize Convex client
  async function init() {
    // The Convex browser bundle exposes window.convex
    // Access ConvexHttpClient via convex.ConvexHttpClient
    const convexBundle = window.convex;
    
    if (convexBundle && typeof convexBundle.ConvexHttpClient !== 'undefined') {
      client = new convexBundle.ConvexHttpClient(CONVEX_URL);
      console.log("✅ Convex HTTP client initialized:", CONVEX_URL);
    } else if (convexBundle && typeof convexBundle.ConvexClient !== 'undefined') {
      client = new convexBundle.ConvexClient(CONVEX_URL);
      console.log("✅ Convex real-time client initialized:", CONVEX_URL);
    } else {
      console.error("❌ Convex client not loaded. window.convex =", convexBundle, "Falling back to IndexedDB.");
      return false;
    }
    
    // Mark as ready and start polling
    isReady = true;
    startPolling();
    
    return true;
  }

  // Poll for updates every 2 seconds
  function startPolling() {
    if (pollInterval) return;
    
    pollInterval = setInterval(async () => {
      try {
        // Fetch latest data
        const [agentsData, tasksData, activitiesData] = await Promise.all([
          query("agents:list", {}),
          query("tasks:list", {}),
          query("activities:list", { limit: 100 })
        ]);
        
        notifyListeners("agents", agentsData || []);
        notifyListeners("tasks", tasksData || []);
        notifyListeners("activities", activitiesData || []);
      } catch (err) {
        console.warn("Polling error:", err);
      }
    }, 2000);
  }

  function stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  }

  // Register a listener for data changes
  function onDataChange(storeName, callback) {
    if (!listeners.has(storeName)) {
      listeners.set(storeName, new Set());
    }
    listeners.get(storeName).add(callback);
    
    // Return unsubscribe function
    return () => listeners.get(storeName).delete(callback);
  }

  // Notify all listeners for a store
  function notifyListeners(storeName, data) {
    const storeListeners = listeners.get(storeName);
    if (storeListeners) {
      storeListeners.forEach(cb => {
        try {
          cb(data);
        } catch (err) {
          console.error(`Listener error for ${storeName}:`, err);
        }
      });
    }
    
    // Also dispatch a custom event for legacy code
    window.dispatchEvent(new CustomEvent(`convex:${storeName}`, { detail: data }));
  }

  // Query wrapper
  async function query(path, args = {}) {
    if (!client) throw new Error("Convex not initialized");
    
    // ConvexHttpClient expects "module:function" format (e.g., "agents:list")
    // Do NOT convert to dot notation
    return await client.query(path, args);
  }

  // Mutation wrapper
  async function mutate(path, args = {}) {
    if (!client) throw new Error("Convex not initialized");
    
    return await client.mutation(path, args);
  }

  // ===== AGENTS API =====
  const agents = {
    async list() {
      return await query("agents:list", {});
    },
    
    async get(sessionKey) {
      return await query("agents:getBySession", { sessionKey });
    },
    
    async upsert(agent) {
      return await mutate("agents:upsert", agent);
    },
    
    async updateStatus(sessionKey, status, currentTaskId) {
      return await mutate("agents:updateStatus", { sessionKey, status, currentTaskId });
    },
    
    async updateContext(sessionKey, contextUsed, contextCap, sleepNote) {
      return await mutate("agents:updateContext", { sessionKey, contextUsed, contextCap, sleepNote });
    },
    
    async sleep(sessionKey, contextUsed, contextCap, workingOn, nextSteps) {
      return await mutate("agents:sleep", { sessionKey, contextUsed, contextCap, workingOn, nextSteps });
    },
    
    async seed() {
      return await mutate("agents:seed", {});
    },

    onChange(callback) {
      return onDataChange("agents", callback);
    }
  };

  // ===== TASKS API =====
  const tasks = {
    async list(status) {
      return await query("tasks:list", status ? { status } : {});
    },
    
    async get(id) {
      return await query("tasks:get", { id });
    },
    
    async add(task) {
      return await mutate("tasks:create", {
        title: task.title,
        description: task.description,
        priority: task.priority,
        assigneeIds: task.assigneeIds,
        status: task.status,
        relatedDesignId: task.relatedDesignId,
        dueAt: task.dueAt,
        blockedReason: task.blockedReason,
        createdBySession: task.createdBySession,
      });
    },
    
    async update(id, updates) {
      console.log("tasks.update called with:", { id, updates });
      const updateKeys = Object.keys(updates || {});
      const statusOnly = updateKeys.length > 0 && updateKeys.every(k => ["status", "agentSession", "notes"].includes(k));
      const priorityOnly = updateKeys.length === 1 && updateKeys[0] === "priority";
      const assigneeOnly = updateKeys.length > 0 && updateKeys.every(k => ["assigneeIds", "assignerSession"].includes(k));

      if (statusOnly && updates.status !== undefined) {
        const args = { 
          id, 
          status: updates.status,
          agentSession: updates.agentSession,
          notes: updates.notes 
        };
        console.log("Calling tasks:updateStatus with:", args);
        const result = await mutate("tasks:updateStatus", args);
        console.log("tasks:updateStatus result:", result);
        return result;
      }
      if (priorityOnly) {
        return await mutate("tasks:updatePriority", { id, priority: updates.priority });
      }
      if (assigneeOnly && updates.assigneeIds !== undefined) {
        return await mutate("tasks:assign", { 
          id, 
          assigneeIds: updates.assigneeIds,
          assignerSession: updates.assignerSession 
        });
      }

      return await mutate("tasks:update", {
        id,
        status: updates.status,
        priority: updates.priority,
        title: updates.title,
        description: updates.description,
        assigneeIds: updates.assigneeIds,
        relatedDesignId: updates.relatedDesignId,
        dueAt: updates.dueAt,
        blockedReason: updates.blockedReason,
        agentSession: updates.agentSession,
      });
    },
    
    async complete(id, deliverables, agentSession) {
      return await mutate("tasks:complete", { id, deliverables, agentSession });
    },
    
    async verify(id, approved, feedback) {
      return await mutate("tasks:verify", { id, approved, feedback });
    },
    
    async remove(id) {
      console.warn("Task deletion not implemented in Convex yet");
    },

    onChange(callback) {
      return onDataChange("tasks", callback);
    }
  };

  // ===== ACTIVITIES API =====
  const activities = {
    async list(limit = 50) {
      return await query("activities:list", { limit });
    },
    
    async listByTask(taskId) {
      return await query("activities:listByTask", { taskId });
    },
    
    async listByAgent(agentId) {
      return await query("activities:listByAgent", { agentId });
    },
    
    async create(activity) {
      return await mutate("activities:create", {
        type: activity.type || 'message_sent',
        agentName: activity.agentName || activity.agent_id,
        taskId: activity.taskId,
        taskTitle: activity.taskTitle,
        message: activity.message || '',
        metadata: activity.metadata,
      });
    },

    onChange(callback) {
      return onDataChange("activities", callback);
    }
  };

  // ===== MESSAGES API =====
  const messages = {
    async list() {
      return await query("messages:list", {});
    },
    
    async listByTask(args) {
      return await query("messages:listByTask", args);
    },
    
    async add(message) {
      return await mutate("messages:send", message);
    },
    
    async create(comment) {
      // Map from comment format to message format.
      // Engineering team sessions use agent:<name>:main.
      // If Max leaves a comment, route it through Theia's engineering session.
      const agentName = comment.fromAgent?.toLowerCase() || 'theia';
      let sessionKey;
      if (agentName === 'max') {
        sessionKey = 'agent:theia:main';
      } else {
        sessionKey = `agent:${agentName}:main`;
      }
      
      return await mutate("messages:create", {
        taskId: comment.taskId,
        content: comment.content,
        agentSession: sessionKey,
      });
    },

    onChange(callback) {
      return onDataChange("messages", callback);
    }
  };

  // ===== SESSION HISTORY API =====
  const sessionHistory = {
    async listByAgent(agentId, limit = 20) {
      return await query("sessionHistory:listByAgent", { agentId, limit });
    },
    async listRecent(limit = 50) {
      return await query("sessionHistory:listRecent", { limit });
    },
  };

  // ===== SCHEDULED EVENTS API =====
  const scheduledEvents = {
    async list(type) {
      return await query("scheduledEvents:list", type ? { type } : {});
    },
    async upsert(event) {
      return await mutate("scheduledEvents:upsert", event);
    },
    async recordRun(id, result, durationMs, nextRunAt) {
      return await mutate("scheduledEvents:recordRun", { id, result, durationMs, nextRunAt });
    },
    async remove(id) {
      return await mutate("scheduledEvents:remove", { id });
    },
  };

  // ===== MEMORIES API =====
  const memories = {
    async search(q, agentName, sourceType, limit = 40) {
      return await query("memories:search", { q, agentName, sourceType, limit });
    },
    async list(agentName, sourceType, limit = 40) {
      return await query("memories:list", { agentName, sourceType, limit });
    },
    async get(id) {
      return await query("memories:get", { id });
    },
    async sync(memory) {
      return await mutate("memories:sync", memory);
    },
    async remove(id) {
      return await mutate("memories:remove", { id });
    },
  };

  // ===== DOCUMENTS API =====
  const documents = {
    async list() {
      return await query("documents:list", {});
    },
    
    async add(doc) {
      return await mutate("documents:create", doc);
    },

    onChange(callback) {
      return onDataChange("documents", callback);
    }
  };

  // Cleanup on page unload
  window.addEventListener("beforeunload", () => {
    stopPolling();
    listeners.clear();
  });

  // Export to window.Convex
  window.Convex = {
    init,
    query,
    mutate,
    agents,
    tasks,
    activities,
    messages,
    documents,
    sessionHistory,
    scheduledEvents,
    memories,
    onDataChange,
    stopPolling,
    
    // For debugging
    getClient: () => client,
    getUrl: () => CONVEX_URL,
    isReady: () => isReady,
  };
})();
// Cache bust: 1770265046
