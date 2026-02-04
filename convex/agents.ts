import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get all agents
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("agents").collect();
  },
});

// Get agent by session key
export const getBySession = query({
  args: { sessionKey: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agents")
      .withIndex("by_session", (q) => q.eq("sessionKey", args.sessionKey))
      .first();
  },
});

// Create or update agent
export const upsert = mutation({
  args: {
    sessionKey: v.string(),
    name: v.string(),
    role: v.string(),
    emoji: v.string(),
    discordChannel: v.optional(v.string()),
    model: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("agents")
      .withIndex("by_session", (q) => q.eq("sessionKey", args.sessionKey))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        role: args.role,
        emoji: args.emoji,
        discordChannel: args.discordChannel,
        model: args.model,
        lastActiveAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("agents", {
      ...args,
      status: "idle",
      lastActiveAt: Date.now(),
    });
  },
});

// Update agent status
export const updateStatus = mutation({
  args: {
    sessionKey: v.string(),
    status: v.union(v.literal("idle"), v.literal("active"), v.literal("blocked")),
    currentTaskId: v.optional(v.id("tasks")),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_session", (q) => q.eq("sessionKey", args.sessionKey))
      .first();

    if (!agent) throw new Error(`Agent not found: ${args.sessionKey}`);

    await ctx.db.patch(agent._id, {
      status: args.status,
      currentTaskId: args.currentTaskId,
      lastActiveAt: Date.now(),
    });

    // Log activity
    await ctx.db.insert("activities", {
      type: "agent_status_changed",
      agentId: agent._id,
      agentName: agent.name,
      message: `${agent.name} is now ${args.status}`,
      metadata: { previousStatus: agent.status, newStatus: args.status },
    });

    return agent._id;
  },
});

// Update context usage (call before sleep)
export const updateContext = mutation({
  args: {
    sessionKey: v.string(),
    contextUsed: v.number(),
    contextCap: v.number(),
    sleepNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_session", (q) => q.eq("sessionKey", args.sessionKey))
      .first();

    if (!agent) throw new Error(`Agent not found: ${args.sessionKey}`);

    const contextPercent = Math.round((args.contextUsed / args.contextCap) * 100);

    await ctx.db.patch(agent._id, {
      contextUsed: args.contextUsed,
      contextCap: args.contextCap,
      contextPercent,
      lastSleepAt: Date.now(),
      lastSleepNote: args.sleepNote,
      status: "idle",
      lastActiveAt: Date.now(),
    });

    // Log activity if context is high
    if (contextPercent >= 80) {
      await ctx.db.insert("activities", {
        type: "agent_status_changed",
        agentId: agent._id,
        agentName: agent.name,
        message: `⚠️ ${agent.name} context at ${contextPercent}% (${args.contextUsed.toLocaleString()}/${args.contextCap.toLocaleString()} tokens)`,
        metadata: { contextUsed: args.contextUsed, contextCap: args.contextCap, contextPercent },
      });
    }

    return agent._id;
  },
});

// Sleep protocol - agent going to sleep
export const sleep = mutation({
  args: {
    sessionKey: v.string(),
    contextUsed: v.number(),
    contextCap: v.number(),
    workingOn: v.optional(v.string()),
    nextSteps: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_session", (q) => q.eq("sessionKey", args.sessionKey))
      .first();

    if (!agent) throw new Error(`Agent not found: ${args.sessionKey}`);

    const contextPercent = Math.round((args.contextUsed / args.contextCap) * 100);
    const sleepNote = [
      args.workingOn ? `Working on: ${args.workingOn}` : null,
      args.nextSteps ? `Next: ${args.nextSteps}` : null,
    ].filter(Boolean).join(' | ');

    await ctx.db.patch(agent._id, {
      contextUsed: args.contextUsed,
      contextCap: args.contextCap,
      contextPercent,
      lastSleepAt: Date.now(),
      lastSleepNote: sleepNote || undefined,
      status: "idle",
      currentTaskId: undefined,
      lastActiveAt: Date.now(),
    });

    // Log the sleep
    await ctx.db.insert("activities", {
      type: "agent_status_changed",
      agentId: agent._id,
      agentName: agent.name,
      message: `${agent.name} went to sleep (${contextPercent}% context used)${sleepNote ? ` - ${sleepNote}` : ''}`,
      metadata: { 
        contextUsed: args.contextUsed, 
        contextCap: args.contextCap, 
        contextPercent,
        workingOn: args.workingOn,
        nextSteps: args.nextSteps,
      },
    });

    return agent._id;
  },
});

// Lightweight ping - just update lastActiveAt (for heartbeats)
export const ping = mutation({
  args: {
    sessionKey: v.string(),
    status: v.optional(v.union(v.literal("idle"), v.literal("active"), v.literal("blocked"))),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_session", (q) => q.eq("sessionKey", args.sessionKey))
      .first();

    if (!agent) throw new Error(`Agent not found: ${args.sessionKey}`);

    const updates: Record<string, unknown> = {
      lastActiveAt: Date.now(),
    };
    
    if (args.status && args.status !== agent.status) {
      updates.status = args.status;
    }

    await ctx.db.patch(agent._id, updates);
    return agent._id;
  },
});

// Seed initial agents
export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const agents = [
      { sessionKey: "agent:main:main", name: "Abbe", role: "Squad Lead", emoji: "🧠", discordChannel: "#general", model: "opus" },
      { sessionKey: "agent:seidel:main", name: "Seidel", role: "Sales Operations", emoji: "💼", discordChannel: "#sales", model: "sonnet" },
      { sessionKey: "agent:iris:main", name: "Iris", role: "Marketing", emoji: "🎨", discordChannel: "#marketing", model: "sonnet" },
      { sessionKey: "agent:theia:main", name: "Theia", role: "Engineering", emoji: "🔬", model: "sonnet" },
      { sessionKey: "agent:photon:main", name: "Photon", role: "Operations", emoji: "⚙️", discordChannel: "#operations", model: "sonnet" },
      { sessionKey: "agent:zernike:main", name: "Zernike", role: "Software Dev", emoji: "💻", discordChannel: "#dev", model: "codex" },
      { sessionKey: "agent:kanban:main", name: "Kanban", role: "Warehouse", emoji: "📦", discordChannel: "#warehouse", model: "sonnet" },
      { sessionKey: "agent:deming:main", name: "Deming", role: "Quality", emoji: "✅", discordChannel: "#quality", model: "sonnet" },
      { sessionKey: "agent:ernst:main", name: "Ernst", role: "Task Verification", emoji: "✓", model: "sonnet" },
    ];

    let seededCount = 0;
    for (const agent of agents) {
      const existing = await ctx.db
        .query("agents")
        .withIndex("by_session", (q) => q.eq("sessionKey", agent.sessionKey))
        .first();

      if (!existing) {
        await ctx.db.insert("agents", {
          ...agent,
          status: "idle",
          lastActiveAt: Date.now(),
        });
        seededCount++;
      }
    }

    return { seeded: seededCount, total: agents.length };
  },
});
