import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get the session history for a specific agent (most recent first).
 * Returns up to `limit` rows (default 20).
 */
export const listByAgent = query({
  args: {
    agentId: v.id("agents"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    return await ctx.db
      .query("sessionHistory")
      .withIndex("by_agent_time", (q) => q.eq("agentId", args.agentId))
      .order("desc")
      .take(limit);
  },
});

/**
 * Get all recent sessions across all agents (for activity overview).
 */
export const listRecent = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    return await ctx.db
      .query("sessionHistory")
      .order("desc")
      .take(limit);
  },
});
