/**
 * Convex Client for Mission Control
 * Real-time database with subscriptions
 */
(() => {
  const CONVEX_URL = "https://aromatic-trout-929.convex.cloud";
  
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
        createdBySession: task.createdBySession,
      });
    },
    
    async update(id, updates) {
      // Route to appropriate mutation based on what's being updated
      if (updates.status !== undefined) {
        return await mutate("tasks:updateStatus", { 
          id, 
          status: updates.status,
          agentSession: updates.agentSession,
          notes: updates.notes 
        });
      }
      if (updates.priority !== undefined) {
        return await mutate("tasks:updatePriority", { id, priority: updates.priority });
      }
      if (updates.assigneeIds !== undefined) {
        return await mutate("tasks:assign", { 
          id, 
          assigneeIds: updates.assigneeIds,
          assignerSession: updates.assignerSession 
        });
      }
      console.warn("Unknown task update:", updates);
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
      // Map from comment format to message format
      return await mutate("messages:create", {
        taskId: comment.taskId,
        content: comment.content,
        agentSession: `agent:${comment.fromAgent?.toLowerCase() || 'main'}:main`,
      });
    },

    onChange(callback) {
      return onDataChange("messages", callback);
    }
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
    onDataChange,
    stopPolling,
    
    // For debugging
    getClient: () => client,
    getUrl: () => CONVEX_URL,
    isReady: () => isReady,
  };
})();
