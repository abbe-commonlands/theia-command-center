import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// List all messages
export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .order("desc")
      .take(args.limit ?? 50);
  },
});

// Get messages for a task
export const listByTask = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();
  },
});

// Create a message (comment on task)
export const create = mutation({
  args: {
    taskId: v.id("tasks"),
    content: v.string(),
    agentSession: v.string(),
    attachments: v.optional(v.array(v.id("documents"))),
  },
  handler: async (ctx, args) => {
    // Get the posting agent
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_session", (q) => q.eq("sessionKey", args.agentSession))
      .first();

    if (!agent) throw new Error(`Agent not found: ${args.agentSession}`);

    // Parse @mentions from content
    const mentionPattern = /@(\w+)/g;
    const mentionNames = [...args.content.matchAll(mentionPattern)].map(m => m[1].toLowerCase());
    
    // Find mentioned agents
    const allAgents = await ctx.db.query("agents").collect();
    const mentionedAgents = allAgents.filter(a => 
      mentionNames.includes(a.name.toLowerCase())
    );

    // Create the message
    const messageId = await ctx.db.insert("messages", {
      taskId: args.taskId,
      fromAgentId: agent._id,
      fromAgentName: agent.name,
      content: args.content,
      attachments: args.attachments,
      mentions: mentionedAgents.map(a => a._id),
    });

    // Get task for activity
    const task = await ctx.db.get(args.taskId);

    // Log activity
    await ctx.db.insert("activities", {
      type: "message_sent",
      agentId: agent._id,
      agentName: agent.name,
      taskId: args.taskId,
      taskTitle: task?.title,
      message: `${agent.name} commented on "${task?.title}"`,
      metadata: { preview: args.content.slice(0, 100) },
    });

    // Create notifications for mentioned agents
    for (const mentioned of mentionedAgents) {
      await ctx.db.insert("notifications", {
        mentionedAgentId: mentioned._id,
        fromAgentId: agent._id,
        fromAgentName: agent.name,
        content: `${agent.name} mentioned you: "${args.content.slice(0, 100)}"`,
        taskId: args.taskId,
        messageId,
        delivered: false,
      });

      // Also log mention as activity
      await ctx.db.insert("activities", {
        type: "mention",
        agentId: mentioned._id,
        agentName: mentioned.name,
        taskId: args.taskId,
        taskTitle: task?.title,
        message: `${agent.name} mentioned @${mentioned.name}`,
      });
    }

    return messageId;
  },
});
