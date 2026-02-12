import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Agent registry - tracks all AI team members
  agents: defineTable({
    name: v.string(),           // "Zernike"
    role: v.string(),           // "Software Development"
    emoji: v.string(),          // "💻"
    status: v.union(
      v.literal("idle"),
      v.literal("active"),
      v.literal("blocked"),
      v.literal("paused")
    ),
    currentTaskId: v.optional(v.id("tasks")),
    sessionKey: v.string(),     // "agent:zernike:main"
    discordChannel: v.optional(v.string()), // "#dev"
    model: v.optional(v.string()), // "codex"
    lastActiveAt: v.optional(v.number()),
    // Context tracking
    contextUsed: v.optional(v.number()),    // tokens used in current session
    contextCap: v.optional(v.number()),     // max context window for model
    contextPercent: v.optional(v.number()), // usage percentage (0-100)
    lastSleepAt: v.optional(v.number()),    // when agent last went to sleep
    lastSleepNote: v.optional(v.string()),  // what they were working on
  })
    .index("by_session", ["sessionKey"])
    .index("by_status", ["status"]),

  // Tasks - the core work items
  tasks: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("inbox"),
      v.literal("assigned"),
      v.literal("in_progress"),
      v.literal("review"),
      v.literal("done"),
      v.literal("blocked")
    ),
    priority: v.number(),       // 1-10 scale
    assigneeIds: v.array(v.id("agents")),
    createdBy: v.optional(v.id("agents")),
    createdByName: v.optional(v.string()), // For display without join
    verifiedBy: v.optional(v.id("agents")),
    verifiedAt: v.optional(v.number()),
    deliverables: v.optional(v.string()),
    dueAt: v.optional(v.number()),
    blockedReason: v.optional(v.string()),
  })
    .index("by_status", ["status"])
    .index("by_priority", ["priority"])
    .index("by_assignee", ["assigneeIds"]),

  // Messages - comments on tasks
  messages: defineTable({
    taskId: v.id("tasks"),
    fromAgentId: v.id("agents"),
    fromAgentName: v.string(),  // Denormalized for easy display
    content: v.string(),
    attachments: v.optional(v.array(v.id("documents"))),
    mentions: v.optional(v.array(v.id("agents"))), // @mentioned agents
  })
    .index("by_task", ["taskId"]),

  // Activities - real-time feed of everything happening
  activities: defineTable({
    type: v.union(
      v.literal("task_created"),
      v.literal("task_assigned"),
      v.literal("task_moved"),
      v.literal("task_completed"),
      v.literal("task_verified"),
      v.literal("task_rejected"),
      v.literal("message_sent"),
      v.literal("document_created"),
      v.literal("agent_status_changed"),
      v.literal("agent_message"),
      v.literal("mention")
    ),
    agentId: v.optional(v.id("agents")),
    agentName: v.optional(v.string()),
    taskId: v.optional(v.id("tasks")),
    taskTitle: v.optional(v.string()),
    message: v.string(),
    metadata: v.optional(v.any()), // Extra context (status transitions, etc.)
  })
    .index("by_agent", ["agentId"])
    .index("by_task", ["taskId"])
    .index("by_type", ["type"]),

  // Documents - deliverables, research, protocols
  documents: defineTable({
    title: v.string(),
    content: v.string(),        // Markdown
    type: v.union(
      v.literal("deliverable"),
      v.literal("research"),
      v.literal("protocol"),
      v.literal("note")
    ),
    taskId: v.optional(v.id("tasks")),
    createdBy: v.id("agents"),
    createdByName: v.string(),
  })
    .index("by_task", ["taskId"])
    .index("by_type", ["type"]),

  // Notifications - @mentions and alerts
  notifications: defineTable({
    mentionedAgentId: v.id("agents"),
    fromAgentId: v.id("agents"),
    fromAgentName: v.string(),
    content: v.string(),
    taskId: v.optional(v.id("tasks")),
    messageId: v.optional(v.id("messages")),
    delivered: v.boolean(),
    readAt: v.optional(v.number()),
  })
    .index("by_agent", ["mentionedAgentId"])
    .index("by_unread", ["mentionedAgentId", "delivered"]),

  // =========================================================================
  // QMS Tables — RMA Tracking
  // =========================================================================

  rmaRecords: defineTable({
    rmaNumber: v.string(),
    rmaDate: v.number(),
    customerName: v.string(),
    contactName: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    salesOrderNumber: v.optional(v.string()),
    shipmentNumber: v.optional(v.string()),
    partNumbers: v.array(v.string()),
    quantities: v.array(v.number()),
    reasonForReturn: v.string(),
    dateReturnReceived: v.optional(v.number()),
    actionTaken: v.optional(v.string()),
    status: v.string(), // Open, Closed, Cancelled, Voided, In-Process, Tentatively Closed
    statusDate: v.optional(v.number()),
    qualityRelated: v.boolean(),
    partNumberMixup: v.boolean(),
    notes: v.optional(v.string()),
    createdBy: v.string(),
    lastModifiedBy: v.optional(v.string()),
    lastModifiedAt: v.optional(v.number()),
  })
    .index("by_rmaNumber", ["rmaNumber"])
    .index("by_customer", ["customerName"])
    .index("by_quality", ["qualityRelated"])
    .index("by_status", ["status"]),

  qualityKPIs: defineTable({
    year: v.number(),
    totalShipments: v.number(),
    qualityReturns: v.number(),
    qualityReturnRate: v.number(),
    totalItems: v.number(),
    itemsReturned: v.number(),
    itemReturnRate: v.number(),
  })
    .index("by_year", ["year"]),

  // =========================================================================
  // QMS Tables — Training Module
  // =========================================================================

  employees: defineTable({
    name: v.string(),
    email: v.string(),
    jobRole: v.optional(v.string()),
    department: v.optional(v.string()),
    isActive: v.boolean(),
    createdBy: v.string(),
    lastModifiedBy: v.optional(v.string()),
    lastModifiedAt: v.optional(v.number()),
  })
    .index("by_email", ["email"]),

  trainingCourses: defineTable({
    courseId: v.string(),        // e.g. "1001"
    courseName: v.string(),
    category: v.union(v.literal("equipment"), v.literal("qms"), v.literal("safety")),
    description: v.optional(v.string()),
    requiredForRoles: v.optional(v.array(v.string())),
    isRequired: v.boolean(),
    validityMonths: v.optional(v.number()),
    isActive: v.boolean(),
    createdBy: v.string(),
  })
    .index("by_courseId", ["courseId"])
    .index("by_category", ["category"]),

  trainingRecords: defineTable({
    employeeId: v.id("employees"),
    courseId: v.string(),
    completedDate: v.number(),
    expiryDate: v.optional(v.number()),
    instructor: v.optional(v.string()),
    score: v.optional(v.number()),
    notes: v.optional(v.string()),
    certificateUrl: v.optional(v.string()),
    status: v.union(
      v.literal("valid"),
      v.literal("expiring"),
      v.literal("expired"),
      v.literal("pending")
    ),
    recordedBy: v.string(),
    lastModifiedBy: v.optional(v.string()),
    lastModifiedAt: v.optional(v.number()),
  })
    .index("by_employee", ["employeeId"])
    .index("by_employee_course", ["employeeId", "courseId"]),

  // RBAC permissions
  permissions: defineTable({
    agentId: v.id("agents"),
    tab: v.string(),
    view: v.boolean(),
    edit: v.boolean(),
    delete_: v.boolean(),
    admin: v.boolean(),
  })
    .index("by_agent", ["agentId"])
    .index("by_agent_tab", ["agentId", "tab"]),
});
