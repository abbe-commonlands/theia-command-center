import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// List all documents
export const list = query({
  args: { type: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.type) {
      return await ctx.db
        .query("documents")
        .withIndex("by_type", (q) => q.eq("type", args.type as any))
        .collect();
    }
    return await ctx.db.query("documents").collect();
  },
});

// Get documents for a task
export const listByTask = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("documents")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();
  },
});

// Get a single document
export const get = query({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create a document
export const create = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    type: v.union(
      v.literal("deliverable"),
      v.literal("research"),
      v.literal("protocol"),
      v.literal("note")
    ),
    taskId: v.optional(v.id("tasks")),
    agentSession: v.string(),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_session", (q) => q.eq("sessionKey", args.agentSession))
      .first();

    if (!agent) throw new Error(`Agent not found: ${args.agentSession}`);

    const docId = await ctx.db.insert("documents", {
      title: args.title,
      content: args.content,
      type: args.type,
      taskId: args.taskId,
      createdBy: agent._id,
      createdByName: agent.name,
    });

    // Log activity
    await ctx.db.insert("activities", {
      type: "document_created",
      agentId: agent._id,
      agentName: agent.name,
      taskId: args.taskId,
      message: `${agent.name} created document: ${args.title}`,
      metadata: { type: args.type },
    });

    return docId;
  },
});

// Update a document
export const update = mutation({
  args: {
    id: v.id("documents"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updates: any = {};
    if (args.title) updates.title = args.title;
    if (args.content) updates.content = args.content;
    
    await ctx.db.patch(args.id, updates);
    return args.id;
  },
});
