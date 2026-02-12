import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// List all tasks, optionally filtered by status
export const list = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.status) {
      return await ctx.db
        .query("tasks")
        .withIndex("by_status", (q) => q.eq("status", args.status as any))
        .collect();
    }
    return await ctx.db.query("tasks").collect();
  },
});

// Get a single task
export const get = query({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create a new task
export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    priority: v.optional(v.number()),
    createdBySession: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Look up the creating agent
    let createdBy = undefined;
    let createdByName = "unknown";
    
    if (args.createdBySession) {
      const agent = await ctx.db
        .query("agents")
        .withIndex("by_session", (q) => q.eq("sessionKey", args.createdBySession!))
        .first();
      if (agent) {
        createdBy = agent._id;
        createdByName = agent.name;
      }
    }

    const taskId = await ctx.db.insert("tasks", {
      title: args.title,
      description: args.description,
      status: "inbox",
      priority: args.priority ?? 5,
      assigneeIds: [],
      createdBy,
      createdByName,
    });

    // Log activity
    await ctx.db.insert("activities", {
      type: "task_created",
      agentId: createdBy,
      agentName: createdByName,
      taskId,
      taskTitle: args.title,
      message: `${createdByName} created task: ${args.title}`,
    });

    return taskId;
  },
});

// Update task status
export const updateStatus = mutation({
  args: {
    id: v.id("tasks"),
    status: v.union(
      v.literal("inbox"),
      v.literal("assigned"),
      v.literal("in_progress"),
      v.literal("review"),
      v.literal("done")
    ),
    agentSession: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.id);
    if (!task) throw new Error("Task not found");

    const oldStatus = task.status;
    
    // If moving to done, redirect to review for Ernst verification
    const newStatus = args.status === "done" ? "review" : args.status;

    await ctx.db.patch(args.id, { status: newStatus });

    // Get agent info for activity
    let agentId = undefined;
    let agentName = "unknown";
    if (args.agentSession) {
      const agent = await ctx.db
        .query("agents")
        .withIndex("by_session", (q) => q.eq("sessionKey", args.agentSession!))
        .first();
      if (agent) {
        agentId = agent._id;
        agentName = agent.name;
      }
    }

    // Log activity
    await ctx.db.insert("activities", {
      type: "task_moved",
      agentId,
      agentName,
      taskId: args.id,
      taskTitle: task.title,
      message: args.status === "done" 
        ? `${agentName} submitted for verification: ${task.title}`
        : `${agentName} moved "${task.title}" to ${newStatus}`,
      metadata: { from: oldStatus, to: newStatus, notes: args.notes },
    });

    return args.id;
  },
});

// Assign task to agents
export const assign = mutation({
  args: {
    id: v.id("tasks"),
    assigneeIds: v.array(v.id("agents")),
    assignerSession: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.id);
    if (!task) throw new Error("Task not found");

    await ctx.db.patch(args.id, {
      assigneeIds: args.assigneeIds,
      status: args.assigneeIds.length > 0 ? "assigned" : task.status,
    });

    // Get assignee names for activity
    const assigneeNames = await Promise.all(
      args.assigneeIds.map(async (id) => {
        const agent = await ctx.db.get(id);
        return agent?.name ?? "unknown";
      })
    );

    // Log activity
    await ctx.db.insert("activities", {
      type: "task_assigned",
      taskId: args.id,
      taskTitle: task.title,
      message: `Task "${task.title}" assigned to ${assigneeNames.join(", ")}`,
      metadata: { assigneeIds: args.assigneeIds },
    });

    return args.id;
  },
});

// Generic update (for CLI convenience)
export const update = mutation({
  args: {
    id: v.id("tasks"),
    status: v.optional(v.union(
      v.literal("inbox"),
      v.literal("assigned"),
      v.literal("in_progress"),
      v.literal("review"),
      v.literal("done")
    )),
    priority: v.optional(v.number()),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    agentSession: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.id);
    if (!task) throw new Error("Task not found");

    const updates: any = {};
    if (args.status !== undefined) updates.status = args.status;
    if (args.priority !== undefined) updates.priority = args.priority;
    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;

    await ctx.db.patch(args.id, updates);

    // Get agent info for activity
    let agentName = "unknown";
    let agentId = undefined;
    if (args.agentSession) {
      const agent = await ctx.db
        .query("agents")
        .withIndex("by_session", (q) => q.eq("sessionKey", args.agentSession!))
        .first();
      if (agent) {
        agentName = agent.name;
        agentId = agent._id;
      }
    }

    // Log activity if status changed
    if (args.status && args.status !== task.status) {
      await ctx.db.insert("activities", {
        type: "task_moved",
        agentId,
        agentName,
        taskId: args.id,
        taskTitle: task.title,
        message: `${agentName} moved "${task.title}" to ${args.status}`,
        metadata: { from: task.status, to: args.status },
      });
    }

    return args.id;
  },
});

// Update priority (Abbe only)
export const updatePriority = mutation({
  args: {
    id: v.id("tasks"),
    priority: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.priority < 1 || args.priority > 10) {
      throw new Error("Priority must be between 1 and 10");
    }
    await ctx.db.patch(args.id, { priority: args.priority });
    return args.id;
  },
});

// Complete task (goes to review for Ernst)
export const complete = mutation({
  args: {
    id: v.id("tasks"),
    deliverables: v.string(),
    agentSession: v.string(),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.id);
    if (!task) throw new Error("Task not found");

    const agent = await ctx.db
      .query("agents")
      .withIndex("by_session", (q) => q.eq("sessionKey", args.agentSession))
      .first();

    await ctx.db.patch(args.id, {
      status: "review",
      deliverables: args.deliverables,
    });

    // Log activity
    await ctx.db.insert("activities", {
      type: "task_completed",
      agentId: agent?._id,
      agentName: agent?.name ?? "unknown",
      taskId: args.id,
      taskTitle: task.title,
      message: `${agent?.name ?? "unknown"} completed "${task.title}" - pending verification`,
      metadata: { deliverables: args.deliverables },
    });

    return args.id;
  },
});

// Verify task (Ernst only)
export const verify = mutation({
  args: {
    id: v.id("tasks"),
    approved: v.boolean(),
    feedback: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.id);
    if (!task) throw new Error("Task not found");

    // Get Ernst's agent ID
    const ernst = await ctx.db
      .query("agents")
      .withIndex("by_session", (q) => q.eq("sessionKey", "agent:ernst:main"))
      .first();

    if (args.approved) {
      await ctx.db.patch(args.id, {
        status: "done",
        verifiedBy: ernst?._id,
        verifiedAt: Date.now(),
      });

      await ctx.db.insert("activities", {
        type: "task_verified",
        agentId: ernst?._id,
        agentName: "Ernst",
        taskId: args.id,
        taskTitle: task.title,
        message: `Ernst verified: "${task.title}" ✓`,
      });
    } else {
      await ctx.db.patch(args.id, { status: "in_progress" });

      await ctx.db.insert("activities", {
        type: "task_rejected",
        agentId: ernst?._id,
        agentName: "Ernst",
        taskId: args.id,
        taskTitle: task.title,
        message: `Ernst returned "${task.title}" - ${args.feedback ?? "needs work"}`,
        metadata: { feedback: args.feedback },
      });
    }

    return args.id;
  },
});

export const remove = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return args.id;
  },
});
