import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const taskStatus = v.union(
  v.literal("inbox"),
  v.literal("assigned"),
  v.literal("in_progress"),
  v.literal("review"),
  v.literal("done"),
  v.literal("blocked")
);

async function getAgentBySession(ctx: any, sessionKey?: string) {
  if (!sessionKey) return null;
  return await ctx.db
    .query("agents")
    .withIndex("by_session", (q: any) => q.eq("sessionKey", sessionKey))
    .first();
}

function normalizeCreateStatus(args: {
  status?: "inbox" | "assigned" | "in_progress" | "review" | "done" | "blocked";
  assigneeIds?: any[];
}) {
  if (args.status) return args.status;
  return args.assigneeIds && args.assigneeIds.length > 0 ? "assigned" : "inbox";
}

// List all tasks, optionally filtered by status
export const list = query({
  args: { status: v.optional(taskStatus) },
  handler: async (ctx, args) => {
    if (args.status) {
      return await ctx.db
        .query("tasks")
        .withIndex("by_status", (q) => q.eq("status", args.status))
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
    assigneeIds: v.optional(v.array(v.id("agents"))),
    status: v.optional(taskStatus),
    relatedDesignId: v.optional(v.id("lensDesigns")),
    dueAt: v.optional(v.number()),
    blockedReason: v.optional(v.string()),
    createdBySession: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const creator = await getAgentBySession(ctx, args.createdBySession);
    const createdBy = creator?._id;
    const createdByName = creator?.name ?? "unknown";
    const assigneeIds = args.assigneeIds ?? [];
    const status = normalizeCreateStatus({ status: args.status, assigneeIds });

    const taskId = await ctx.db.insert("tasks", {
      title: args.title,
      description: args.description,
      status,
      priority: args.priority ?? 5,
      assigneeIds,
      createdBy,
      createdByName,
      relatedDesignId: args.relatedDesignId,
      dueAt: args.dueAt,
      blockedReason: args.blockedReason,
    });

    const assigneeNames = await Promise.all(
      assigneeIds.map(async (id) => {
        const agent = await ctx.db.get(id);
        return agent?.name ?? "unknown";
      })
    );

    const activitySuffix = [
      assigneeNames.length ? `assigned to ${assigneeNames.join(", ")}` : "",
      args.relatedDesignId ? "linked to a design" : "",
      status === "blocked" && args.blockedReason ? `blocked: ${args.blockedReason}` : "",
    ].filter(Boolean).join(" • ");

    await ctx.db.insert("activities", {
      type: "task_created",
      agentId: createdBy,
      agentName: createdByName,
      taskId,
      taskTitle: args.title,
      message: `${createdByName} created task: ${args.title}${activitySuffix ? ` (${activitySuffix})` : ""}`,
      metadata: {
        status,
        assigneeIds,
        relatedDesignId: args.relatedDesignId,
        dueAt: args.dueAt,
        blockedReason: args.blockedReason,
      },
    });

    if (assigneeIds.length > 0) {
      await ctx.db.insert("activities", {
        type: "task_assigned",
        agentId: createdBy,
        agentName: createdByName,
        taskId,
        taskTitle: args.title,
        message: `Task "${args.title}" assigned to ${assigneeNames.join(", ")}`,
        metadata: { assigneeIds },
      });
    }

    return taskId;
  },
});

// Update task status
export const updateStatus = mutation({
  args: {
    id: v.id("tasks"),
    status: taskStatus,
    agentSession: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.id);
    if (!task) throw new Error("Task not found");

    const oldStatus = task.status;
    await ctx.db.patch(args.id, { status: args.status });

    const agent = await getAgentBySession(ctx, args.agentSession);
    const agentId = agent?._id;
    const agentName = agent?.name ?? "unknown";

    await ctx.db.insert("activities", {
      type: "task_moved",
      agentId,
      agentName,
      taskId: args.id,
      taskTitle: task.title,
      message: `${agentName} moved "${task.title}" to ${args.status}`,
      metadata: { from: oldStatus, to: args.status, notes: args.notes },
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

    const nextStatus = args.assigneeIds.length > 0
      ? (task.status === "inbox" || task.status === "assigned" ? "assigned" : task.status)
      : (task.status === "assigned" ? "inbox" : task.status);

    await ctx.db.patch(args.id, {
      assigneeIds: args.assigneeIds,
      status: nextStatus,
    });

    const assigner = await getAgentBySession(ctx, args.assignerSession);
    const assigneeNames = await Promise.all(
      args.assigneeIds.map(async (id) => {
        const agent = await ctx.db.get(id);
        return agent?.name ?? "unknown";
      })
    );

    await ctx.db.insert("activities", {
      type: "task_assigned",
      agentId: assigner?._id,
      agentName: assigner?.name ?? "unknown",
      taskId: args.id,
      taskTitle: task.title,
      message: args.assigneeIds.length > 0
        ? `Task "${task.title}" assigned to ${assigneeNames.join(", ")}`
        : `Task "${task.title}" unassigned`,
      metadata: { assigneeIds: args.assigneeIds, status: nextStatus },
    });

    if (nextStatus !== task.status) {
      await ctx.db.insert("activities", {
        type: "task_moved",
        agentId: assigner?._id,
        agentName: assigner?.name ?? "unknown",
        taskId: args.id,
        taskTitle: task.title,
        message: `${assigner?.name ?? "unknown"} moved "${task.title}" to ${nextStatus}`,
        metadata: { from: task.status, to: nextStatus },
      });
    }

    return args.id;
  },
});

// Generic update (for CLI / UI convenience)
export const update = mutation({
  args: {
    id: v.id("tasks"),
    status: v.optional(taskStatus),
    priority: v.optional(v.number()),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    assigneeIds: v.optional(v.array(v.id("agents"))),
    relatedDesignId: v.optional(v.id("lensDesigns")),
    dueAt: v.optional(v.number()),
    blockedReason: v.optional(v.string()),
    agentSession: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.id);
    if (!task) throw new Error("Task not found");

    const updates: Record<string, any> = {};
    if (args.status !== undefined) updates.status = args.status;
    if (args.priority !== undefined) updates.priority = args.priority;
    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (args.assigneeIds !== undefined) updates.assigneeIds = args.assigneeIds;
    if (args.relatedDesignId !== undefined) updates.relatedDesignId = args.relatedDesignId;
    if (args.dueAt !== undefined) updates.dueAt = args.dueAt;
    if (args.blockedReason !== undefined) updates.blockedReason = args.blockedReason;

    if (args.assigneeIds !== undefined && args.status === undefined) {
      if (args.assigneeIds.length > 0 && (task.status === "inbox" || task.status === "assigned")) {
        updates.status = "assigned";
      } else if (args.assigneeIds.length === 0 && task.status === "assigned") {
        updates.status = "inbox";
      }
    }

    await ctx.db.patch(args.id, updates);

    const agent = await getAgentBySession(ctx, args.agentSession);
    const agentName = agent?.name ?? "unknown";
    const agentId = agent?._id;

    if (updates.status !== undefined && updates.status !== task.status) {
      await ctx.db.insert("activities", {
        type: "task_moved",
        agentId,
        agentName,
        taskId: args.id,
        taskTitle: task.title,
        message: `${agentName} moved "${task.title}" to ${updates.status}`,
        metadata: { from: task.status, to: updates.status },
      });
    }

    if (args.assigneeIds !== undefined) {
      const assigneeNames = await Promise.all(
        args.assigneeIds.map(async (id) => {
          const assignedAgent = await ctx.db.get(id);
          return assignedAgent?.name ?? "unknown";
        })
      );

      await ctx.db.insert("activities", {
        type: "task_assigned",
        agentId,
        agentName,
        taskId: args.id,
        taskTitle: updates.title ?? task.title,
        message: args.assigneeIds.length > 0
          ? `Task "${updates.title ?? task.title}" assigned to ${assigneeNames.join(", ")}`
          : `Task "${updates.title ?? task.title}" unassigned`,
        metadata: { assigneeIds: args.assigneeIds },
      });
    }

    return args.id;
  },
});

// Update priority
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

// Complete task (moves to review)
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

    await ctx.db.insert("activities", {
      type: "task_completed",
      agentId: agent?._id,
      agentName: agent?.name ?? "unknown",
      taskId: args.id,
      taskTitle: task.title,
      message: `${agent?.name ?? "unknown"} completed "${task.title}" - pending review`,
      metadata: { deliverables: args.deliverables },
    });

    return args.id;
  },
});

// Verify task (defaults reviewer to Theia)
export const verify = mutation({
  args: {
    id: v.id("tasks"),
    approved: v.boolean(),
    feedback: v.optional(v.string()),
    reviewerSession: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.id);
    if (!task) throw new Error("Task not found");

    const reviewerSession = args.reviewerSession ?? "agent:theia:main";
    const reviewer = await ctx.db
      .query("agents")
      .withIndex("by_session", (q) => q.eq("sessionKey", reviewerSession))
      .first();
    const reviewerName = reviewer?.name ?? "Theia";

    if (args.approved) {
      await ctx.db.patch(args.id, {
        status: "done",
      });

      await ctx.db.insert("activities", {
        type: "task_verified",
        agentId: reviewer?._id,
        agentName: reviewerName,
        taskId: args.id,
        taskTitle: task.title,
        message: `${reviewerName} verified: "${task.title}" ✓`,
      });
    } else {
      await ctx.db.patch(args.id, { status: "in_progress" });

      await ctx.db.insert("activities", {
        type: "task_rejected",
        agentId: reviewer?._id,
        agentName: reviewerName,
        taskId: args.id,
        taskTitle: task.title,
        message: `${reviewerName} returned "${task.title}" - ${args.feedback ?? "needs work"}`,
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
