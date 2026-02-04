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
      v.literal("blocked")
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
      v.literal("done")
    ),
    priority: v.number(),       // 1-10 scale
    assigneeIds: v.array(v.id("agents")),
    createdBy: v.optional(v.id("agents")),
    createdByName: v.optional(v.string()), // For display without join
    verifiedBy: v.optional(v.id("agents")),
    verifiedAt: v.optional(v.number()),
    deliverables: v.optional(v.string()),
    dueAt: v.optional(v.number()),
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
  // QMS TRAINING MODULE
  // =========================================================================

  // Employees - staff members who need training
  employees: defineTable({
    employeeId: v.optional(v.string()),   // "EMP-001" - optional for legacy data
    name: v.string(),                     // "John Smith"
    title: v.optional(v.string()),        // "Quality Inspector" - optional for legacy
    department: v.optional(v.string()),   // "Quality" - optional for legacy
    hireDate: v.optional(v.number()),     // timestamp - optional for legacy
    isActive: v.boolean(),
    email: v.optional(v.string()),
    jobRole: v.optional(v.string()),      // alternate field used by some records
    createdBy: v.string(),
  })
    .index("by_employeeId", ["employeeId"])
    .index("by_department", ["department"])
    .index("by_active", ["isActive"]),

  // Training courses - what people need to learn
  trainingCourses: defineTable({
    courseId: v.string(),            // "EQ-TL"
    courseName: v.string(),          // "Trioptics Lens Testing"
    category: v.union(
      v.literal("equipment"),
      v.literal("qms"),
      v.literal("safety")
    ),
    description: v.optional(v.string()),
    requiredFor: v.optional(v.array(v.string())), // departments/roles
    frequency: v.optional(v.string()),  // "Annual", "One-time", etc.
    isActive: v.boolean(),
    isRequired: v.optional(v.boolean()),      // from imported data
    validityMonths: v.optional(v.number()),   // from imported data
    createdBy: v.string(),
  })
    .index("by_courseId", ["courseId"])
    .index("by_category", ["category"]),

  // Training records - who completed what
  trainingRecords: defineTable({
    employeeId: v.id("employees"),
    courseId: v.string(),            // matches trainingCourses.courseId
    completedDate: v.number(),       // timestamp
    expirationDate: v.optional(v.number()),
    trainer: v.optional(v.string()),
    score: v.optional(v.number()),   // 0-100
    status: v.union(
      v.literal("completed"),
      v.literal("in_progress"),
      v.literal("expired"),
      v.literal("scheduled")
    ),
    notes: v.optional(v.string()),
    createdBy: v.string(),
  })
    .index("by_employee", ["employeeId"])
    .index("by_course", ["courseId"])
    .index("by_status", ["status"]),

  // =========================================================================
  // QMS RMA MODULE
  // =========================================================================

  // RMA records - return merchandise authorizations
  rmaRecords: defineTable({
    rmaNumber: v.string(),           // "RMA-2024-001"
    rmaDate: v.number(),             // timestamp
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
    status: v.string(),              // Open, Closed, Cancelled, Voided, In-Process, Tentatively Closed
    qualityRelated: v.boolean(),
    partNumberMixup: v.boolean(),
    notes: v.optional(v.string()),
    createdBy: v.string(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_rmaNumber", ["rmaNumber"])
    .index("by_status", ["status"])
    .index("by_customer", ["customerName"])
    .index("by_date", ["rmaDate"]),

  // Quality KPIs - yearly metrics
  qualityKPIs: defineTable({
    year: v.number(),
    totalShipped: v.optional(v.number()),
    totalShipments: v.optional(v.number()),   // alternate field name
    totalItems: v.optional(v.number()),       // alternate field name
    qualityReturns: v.optional(v.number()),
    qualityReturnRate: v.optional(v.number()),   // percentage
    itemsReturned: v.optional(v.number()),    // alternate field
    itemReturnRate: v.optional(v.number()),   // alternate field
    notes: v.optional(v.string()),
  })
    .index("by_year", ["year"]),
});
