import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Full-text search across all memories with optional agent/type filters.
 */
export const search = query({
  args: {
    q: v.string(),
    agentName: v.optional(v.string()),
    sourceType: v.optional(v.union(
      v.literal("daily"),
      v.literal("longterm"),
      v.literal("working")
    )),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    if (!args.q || args.q.trim().length === 0) {
      // Empty query: fall back to recency list
      return await ctx.db
        .query("memories")
        .withIndex("by_date")
        .order("desc")
        .take(limit);
    }

    let searchQuery = ctx.db
      .query("memories")
      .withSearchIndex("search_content", (q) => {
        let sq = q.search("searchText", args.q.toLowerCase());
        if (args.agentName) sq = sq.eq("agentName", args.agentName);
        if (args.sourceType) sq = sq.eq("sourceType", args.sourceType);
        return sq;
      });

    return await searchQuery.take(limit);
  },
});

/**
 * Paginated list with optional filters (no search term).
 */
export const list = query({
  args: {
    agentName: v.optional(v.string()),
    sourceType: v.optional(v.union(
      v.literal("daily"),
      v.literal("longterm"),
      v.literal("working")
    )),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 30;

    if (args.agentName) {
      let results = await ctx.db
        .query("memories")
        .withIndex("by_agent", (q) => q.eq("agentName", args.agentName!))
        .order("desc")
        .take(limit);
      if (args.sourceType) {
        results = results.filter((m) => m.sourceType === args.sourceType);
      }
      return results;
    }

    if (args.sourceType) {
      return await ctx.db
        .query("memories")
        .withIndex("by_type", (q) => q.eq("sourceType", args.sourceType!))
        .order("desc")
        .take(limit);
    }

    return await ctx.db
      .query("memories")
      .withIndex("by_date")
      .order("desc")
      .take(limit);
  },
});

/**
 * Get a single memory by ID.
 */
export const get = query({
  args: { id: v.id("memories") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Upsert a memory entry (called by agents during sleep protocol).
 * Matches on agentName + sourcePath.
 */
export const sync = mutation({
  args: {
    agentName: v.string(),
    agentId: v.optional(v.id("agents")),
    sourcePath: v.string(),
    sourceType: v.union(
      v.literal("daily"),
      v.literal("longterm"),
      v.literal("working")
    ),
    content: v.string(),
    date: v.number(),
    sections: v.optional(v.array(v.object({
      heading: v.string(),
      content: v.string(),
    }))),
  },
  handler: async (ctx, args) => {
    const searchText = args.content.toLowerCase();

    const existing = await ctx.db
      .query("memories")
      .withIndex("by_agent", (q) => q.eq("agentName", args.agentName))
      .filter((q) => q.eq(q.field("sourcePath"), args.sourcePath))
      .first();

    const data = {
      agentName: args.agentName,
      agentId: args.agentId,
      sourcePath: args.sourcePath,
      sourceType: args.sourceType,
      content: args.content,
      date: args.date,
      sections: args.sections,
      searchText,
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);
      return existing._id;
    }
    return await ctx.db.insert("memories", data);
  },
});

/**
 * Delete a memory entry.
 */
export const remove = mutation({
  args: { id: v.id("memories") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { removed: true };
  },
});
