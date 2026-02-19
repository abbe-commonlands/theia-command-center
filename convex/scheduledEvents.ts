import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * List all scheduled events with optional type filter.
 */
export const list = query({
  args: {
    type: v.optional(v.union(v.literal("cron"), v.literal("task"), v.literal("heartbeat"))),
  },
  handler: async (ctx, args) => {
    if (args.type) {
      return await ctx.db
        .query("scheduledEvents")
        .withIndex("by_type", (q) => q.eq("type", args.type!))
        .collect();
    }
    return await ctx.db.query("scheduledEvents").collect();
  },
});

/**
 * Get upcoming events sorted by nextRunAt.
 */
export const upcoming = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const now = Date.now();
    return await ctx.db
      .query("scheduledEvents")
      .withIndex("by_nextRun")
      .filter((q) => q.gte(q.field("nextRunAt"), now))
      .take(limit);
  },
});

/**
 * Create or update a scheduled event (upsert by name + agentName).
 */
export const upsert = mutation({
  args: {
    name: v.string(),
    type: v.union(v.literal("cron"), v.literal("task"), v.literal("heartbeat")),
    schedule: v.string(),
    scheduleKind: v.union(v.literal("cron"), v.literal("at"), v.literal("every")),
    agentId: v.optional(v.id("agents")),
    agentName: v.optional(v.string()),
    taskId: v.optional(v.id("tasks")),
    enabled: v.optional(v.boolean()),
    nextRunAt: v.optional(v.number()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Find existing by name + agentName
    const existing = await ctx.db
      .query("scheduledEvents")
      .filter((q) =>
        q.and(
          q.eq(q.field("name"), args.name),
          args.agentName
            ? q.eq(q.field("agentName"), args.agentName)
            : q.eq(q.field("agentName"), undefined)
        )
      )
      .first();

    const data = {
      name: args.name,
      type: args.type,
      schedule: args.schedule,
      scheduleKind: args.scheduleKind,
      agentId: args.agentId,
      agentName: args.agentName,
      taskId: args.taskId,
      enabled: args.enabled ?? true,
      nextRunAt: args.nextRunAt,
      metadata: args.metadata,
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);
      return existing._id;
    }
    return await ctx.db.insert("scheduledEvents", data);
  },
});

/**
 * Record the result of a run (updates lastRunAt, lastRunResult, nextRunAt).
 */
export const recordRun = mutation({
  args: {
    id: v.id("scheduledEvents"),
    result: v.union(v.literal("success"), v.literal("failure")),
    durationMs: v.optional(v.number()),
    nextRunAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      lastRunAt: Date.now(),
      lastRunResult: args.result,
      lastRunDurationMs: args.durationMs,
      nextRunAt: args.nextRunAt,
    });
    return args.id;
  },
});

/**
 * Delete a scheduled event.
 */
export const remove = mutation({
  args: { id: v.id("scheduledEvents") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { removed: true };
  },
});
