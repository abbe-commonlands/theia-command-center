import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get unread notifications for an agent
export const listUnread = query({
  args: { agentSession: v.string() },
  handler: async (ctx, args) => {
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_session", (q) => q.eq("sessionKey", args.agentSession))
      .first();

    if (!agent) return [];

    return await ctx.db
      .query("notifications")
      .withIndex("by_unread", (q) => 
        q.eq("mentionedAgentId", agent._id).eq("delivered", false)
      )
      .collect();
  },
});

// Get all notifications for an agent
export const listAll = query({
  args: { agentSession: v.string() },
  handler: async (ctx, args) => {
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_session", (q) => q.eq("sessionKey", args.agentSession))
      .first();

    if (!agent) return [];

    return await ctx.db
      .query("notifications")
      .withIndex("by_agent", (q) => q.eq("mentionedAgentId", agent._id))
      .collect();
  },
});

// Mark notification as delivered
export const markDelivered = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { delivered: true });
    return args.id;
  },
});

// Mark notification as read
export const markRead = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { 
      delivered: true,
      readAt: Date.now(),
    });
    return args.id;
  },
});

// Mark all notifications as read for an agent
export const markAllRead = mutation({
  args: { agentSession: v.string() },
  handler: async (ctx, args) => {
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_session", (q) => q.eq("sessionKey", args.agentSession))
      .first();

    if (!agent) return 0;

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_unread", (q) => 
        q.eq("mentionedAgentId", agent._id).eq("delivered", false)
      )
      .collect();

    for (const notif of unread) {
      await ctx.db.patch(notif._id, { 
        delivered: true,
        readAt: Date.now(),
      });
    }

    return unread.length;
  },
});
