import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get recent activities (real-time feed)
export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const activities = await ctx.db
      .query("activities")
      .order("desc")
      .take(args.limit ?? 50);
    return activities;
  },
});

// Get activities for a specific task
export const listByTask = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("activities")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();
  },
});

// Get activities for a specific agent
export const listByAgent = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("activities")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .collect();
  },
});

// Get activities by type
export const listByType = query({
  args: { type: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("activities")
      .withIndex("by_type", (q) => q.eq("type", args.type as any))
      .collect();
  },
});

// Create a new activity
export const create = mutation({
  args: {
    type: v.string(),
    agentId: v.optional(v.id("agents")),
    agentName: v.optional(v.string()),
    taskId: v.optional(v.id("tasks")),
    taskTitle: v.optional(v.string()),
    message: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("activities", {
      type: args.type as any,
      agentId: args.agentId,
      agentName: args.agentName,
      taskId: args.taskId,
      taskTitle: args.taskTitle,
      message: args.message,
      metadata: args.metadata,
    });
  },
});

// Log agent-to-agent message (convenience mutation)
export const logAgentMessage = mutation({
  args: {
    fromAgent: v.string(),    // Name of sending agent
    toAgent: v.string(),      // Name of receiving agent
    summary: v.string(),      // Brief summary of message content
  },
  handler: async (ctx, args) => {
    // Try to find the sending agent's ID
    const fromAgentRecord = await ctx.db
      .query("agents")
      .filter((q) => q.eq(q.field("name"), args.fromAgent))
      .first();

    return await ctx.db.insert("activities", {
      type: "agent_message",
      agentId: fromAgentRecord?._id,
      agentName: args.fromAgent,
      message: `${args.fromAgent} → ${args.toAgent}: ${args.summary}`,
      metadata: {
        from: args.fromAgent,
        to: args.toAgent,
        summary: args.summary,
      },
    });
  },
});

