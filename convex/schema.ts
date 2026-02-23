import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({

  // ── Agents ──────────────────────────────────────────────────────
  agents: defineTable({
    name: v.string(),              // "Theia", "Photon", "Quark"
    role: v.string(),              // "Optical Design Lead"
    emoji: v.string(),             // "🔭"
    status: v.union(
      v.literal("idle"),
      v.literal("active"),
      v.literal("blocked"),
      v.literal("paused")
    ),
    currentTaskId: v.optional(v.id("tasks")),
    sessionKey: v.string(),        // "agent:main:main"
    model: v.optional(v.string()), // "claude-sonnet-4-6", "gpt-5.3-codex"
    lastActiveAt: v.optional(v.number()),
    contextUsed: v.optional(v.number()),
    contextCap: v.optional(v.number()),
    contextPercent: v.optional(v.number()),
    lastSleepAt: v.optional(v.number()),
    lastSleepNote: v.optional(v.string()),
  })
    .index("by_session", ["sessionKey"])
    .index("by_status", ["status"]),

  // ── Tasks ────────────────────────────────────────────────────────
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
    priority: v.number(),
    assigneeIds: v.array(v.id("agents")),
    createdBy: v.optional(v.id("agents")),
    createdByName: v.optional(v.string()),
    deliverables: v.optional(v.string()),
    dueAt: v.optional(v.number()),
    blockedReason: v.optional(v.string()),
    // Link to a lens design (optional)
    relatedDesignId: v.optional(v.id("lensDesigns")),
  })
    .index("by_status", ["status"])
    .index("by_priority", ["priority"]),

  // ── Messages (task comments) ─────────────────────────────────────
  messages: defineTable({
    taskId: v.id("tasks"),
    fromAgentId: v.id("agents"),
    fromAgentName: v.string(),
    content: v.string(),
    attachments: v.optional(v.array(v.id("documents"))),
    mentions: v.optional(v.array(v.id("agents"))),
  })
    .index("by_task", ["taskId"]),

  // ── Activities ───────────────────────────────────────────────────
  activities: defineTable({
    type: v.union(
      // Task events
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
      v.literal("mention"),
      // Optical design events
      v.literal("design_created"),
      v.literal("design_status_changed"),
      v.literal("optimization_started"),
      v.literal("optimization_converged"),
      v.literal("tolerance_analysis_complete"),
      v.literal("patent_added"),
      v.literal("patent_risk_flagged"),
      v.literal("glass_selected"),
      v.literal("zemax_file_updated")
    ),
    agentId: v.optional(v.id("agents")),
    agentName: v.optional(v.string()),
    taskId: v.optional(v.id("tasks")),
    taskTitle: v.optional(v.string()),
    designId: v.optional(v.id("lensDesigns")),
    designName: v.optional(v.string()),
    message: v.string(),
    metadata: v.optional(v.any()),
  })
    .index("by_agent", ["agentId"])
    .index("by_task", ["taskId"])
    .index("by_design", ["designId"])
    .index("by_type", ["type"]),

  // ── Documents ────────────────────────────────────────────────────
  documents: defineTable({
    title: v.string(),
    content: v.string(),
    type: v.union(
      v.literal("lens_spec"),
      v.literal("tolerance_report"),
      v.literal("patent_summary"),
      v.literal("deliverable"),
      v.literal("research"),
      v.literal("protocol"),
      v.literal("note")
    ),
    taskId: v.optional(v.id("tasks")),
    designId: v.optional(v.id("lensDesigns")),
    createdBy: v.id("agents"),
    createdByName: v.string(),
  })
    .index("by_task", ["taskId"])
    .index("by_design", ["designId"])
    .index("by_type", ["type"]),

  // ── Notifications ────────────────────────────────────────────────
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

  // ── Session History ──────────────────────────────────────────────
  sessionHistory: defineTable({
    agentId: v.id("agents"),
    agentName: v.string(),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
    contextUsed: v.optional(v.number()),
    contextCap: v.optional(v.number()),
    contextPercent: v.optional(v.number()),
    workingOn: v.optional(v.string()),
    nextSteps: v.optional(v.string()),
    activitiesCount: v.optional(v.number()),
  })
    .index("by_agent", ["agentId"])
    .index("by_agent_time", ["agentId", "startedAt"]),

  // ── Scheduled Events ─────────────────────────────────────────────
  scheduledEvents: defineTable({
    name: v.string(),
    type: v.union(v.literal("cron"), v.literal("task"), v.literal("heartbeat")),
    schedule: v.string(),
    scheduleKind: v.union(v.literal("cron"), v.literal("at"), v.literal("every")),
    agentId: v.optional(v.id("agents")),
    agentName: v.optional(v.string()),
    taskId: v.optional(v.id("tasks")),
    enabled: v.boolean(),
    lastRunAt: v.optional(v.number()),
    lastRunResult: v.optional(v.union(v.literal("success"), v.literal("failure"))),
    lastRunDurationMs: v.optional(v.number()),
    nextRunAt: v.optional(v.number()),
    metadata: v.optional(v.any()),
  })
    .index("by_type", ["type"])
    .index("by_agent", ["agentId"])
    .index("by_nextRun", ["nextRunAt"]),

  // ── Memories ────────────────────────────────────────────────────
  memories: defineTable({
    agentName: v.string(),
    agentId: v.optional(v.id("agents")),
    sourcePath: v.string(),
    sourceType: v.union(v.literal("daily"), v.literal("longterm"), v.literal("working")),
    content: v.string(),
    date: v.number(),
    sections: v.optional(v.array(v.object({
      heading: v.string(),
      content: v.string(),
    }))),
    searchText: v.string(),
  })
    .index("by_agent", ["agentName"])
    .index("by_date", ["date"])
    .index("by_type", ["sourceType"])
    .searchIndex("search_content", {
      searchField: "searchText",
      filterFields: ["agentName", "sourceType"],
    }),

  // ── Permissions ──────────────────────────────────────────────────
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

  // ════════════════════════════════════════════════════════════════
  // OPTICAL DESIGN TABLES
  // ════════════════════════════════════════════════════════════════

  // ── Lens Designs ─────────────────────────────────────────────────
  lensDesigns: defineTable({
    name: v.string(),                    // "DSL952 Wide-Angle M12"
    designForm: v.string(),              // "retrofocus", "double-gauss", etc.
    mount: v.union(
      v.literal("M12"),
      v.literal("C-mount"),
      v.literal("M8"),
      v.literal("CS-mount"),
      v.literal("other")
    ),
    status: v.union(
      v.literal("concept"),
      v.literal("initial_design"),
      v.literal("optimizing"),
      v.literal("tolerance_analysis"),
      v.literal("ready_for_mfg"),
      v.literal("released"),
      v.literal("archived")
    ),
    // Optical specs
    focalLength: v.optional(v.number()),    // mm
    fNumber: v.optional(v.number()),        // f/#
    fovDeg: v.optional(v.number()),         // full diagonal FOV, degrees
    imageCircleMm: v.optional(v.number()),  // mm
    sensorFormat: v.optional(v.string()),   // '1/2.9"'
    wavelengths: v.optional(v.array(v.number())), // nm
    elementCount: v.optional(v.number()),
    groupCount: v.optional(v.number()),
    stopPosition: v.optional(v.string()),   // "front", "rear", "mid"
    ttlMm: v.optional(v.number()),          // total track length, mm
    // Files
    zemaxFile: v.optional(v.string()),      // path to .zmx / .zar
    // Performance (from latest optimization)
    currentMFValue: v.optional(v.number()),
    rmsSpotUm: v.optional(v.number()),      // µm
    mtfAt100: v.optional(v.number()),       // MTF at 100 lp/mm
    distortionPct: v.optional(v.number()),  // max distortion %
    // Team
    assignedTo: v.optional(v.id("agents")),
    // Patent status
    patentClearance: v.optional(v.union(
      v.literal("not_checked"),
      v.literal("clear"),
      v.literal("risk"),
      v.literal("blocked")
    )),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_mount", ["mount"])
    .index("by_assignee", ["assignedTo"])
    .index("by_form", ["designForm"]),

  // ── Optimization Runs ────────────────────────────────────────────
  optimizationRuns: defineTable({
    designId: v.id("lensDesigns"),
    designName: v.string(),
    runBy: v.id("agents"),             // Photon or Quark
    runByName: v.string(),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
    durationMs: v.optional(v.number()),
    status: v.union(
      v.literal("running"),
      v.literal("converged"),
      v.literal("stopped"),
      v.literal("failed")
    ),
    zemaxFile: v.optional(v.string()),
    meritFunction: v.optional(v.string()),
    mfValueBefore: v.optional(v.number()),
    mfValueAfter: v.optional(v.number()),
    mfImprovement: v.optional(v.number()),    // % improvement
    rmsSpotBefore: v.optional(v.number()),
    rmsSpotAfter: v.optional(v.number()),
    iterationsCount: v.optional(v.number()),
    algorithm: v.optional(v.string()),        // "DLS", "OD", "hammer"
    notes: v.optional(v.string()),
    outputSummary: v.optional(v.string()),    // Photon's markdown summary
  })
    .index("by_design", ["designId"])
    .index("by_agent", ["runBy"])
    .index("by_status", ["status"])
    .index("by_started", ["startedAt"]),

  // ── Design Guidelines ─────────────────────────────────────────────
  // Soft/weighted manufacturing + design constraints. Referenced by Qwen
  // during optimization. Compound over time like memory.
  designGuidelines: defineTable({
    name: v.string(),                    // "Meniscus CT/ET ratio"
    category: v.union(
      v.literal("assembly"),             // Assembly-level: air spaces, alignment, mounting
      v.literal("meniscus"),             // Meniscus element constraints
      v.literal("plano_convex"),         // Plano-convex element constraints
      v.literal("plano_concave"),        // Plano-concave element constraints
      v.literal("bi_convex"),            // Bi-convex element constraints
      v.literal("bi_concave"),           // Bi-concave element constraints
      v.literal("cemented"),             // Cemented group constraints
      v.literal("general"),              // General optical design rules
      v.literal("glass"),                // Glass selection constraints
      v.literal("coating"),              // Coating constraints
      v.literal("mount")                 // Mount-specific constraints (M12, C-mount, etc.)
    ),
    strength: v.union(
      v.literal("hard"),                 // Violate = reject design (physical impossibility)
      v.literal("strong"),               // Violate = high merit penalty
      v.literal("moderate"),             // Prefer compliance
      v.literal("soft")                  // Nice to have, low penalty
    ),
    weight: v.number(),                  // 0.0–1.0, used in merit function weighting
    
    // Machine-readable constraint
    rule: v.optional(v.string()),        // e.g. "CT_ET_ratio >= 1.5"
    parameterName: v.optional(v.string()), // e.g. "CT_ET_ratio", "edge_thickness"
    minValue: v.optional(v.number()),    // Minimum allowed value
    maxValue: v.optional(v.number()),    // Maximum allowed value
    unit: v.optional(v.string()),        // "mm", "ratio", "deg", "%", etc.
    
    // Human-readable
    description: v.string(),             // Why this guideline exists
    rationale: v.optional(v.string()),   // Deeper explanation of failure modes
    
    // Provenance
    source: v.optional(v.string()),      // "Max (experience)", "OPT444 Lecture 12"
    addedBy: v.optional(v.id("agents")),
    addedByName: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    
    // Learning / compounding
    timesApplied: v.optional(v.number()),    // How many designs have used this
    timesViolated: v.optional(v.number()),   // How many violations detected
    lastAppliedAt: v.optional(v.number()),
    successRate: v.optional(v.number()),     // Designs that followed this guideline and succeeded
    
    // Tags for cross-referencing
    tags: v.optional(v.array(v.string())),   // ["M12", "wide-angle", "CDGM", etc.]
    relatedGuidelineIds: v.optional(v.array(v.id("designGuidelines"))),
    
    // Active/archived
    active: v.boolean(),
  })
    .index("by_category", ["category"])
    .index("by_strength", ["strength"])
    .index("by_active", ["active"])
    .searchIndex("search_guidelines", {
      searchField: "description",
      filterFields: ["category", "strength", "active"],
    }),

  // ── Patents ──────────────────────────────────────────────────────
  patents: defineTable({
    patentNumber: v.string(),          // "US10234567B2"
    title: v.string(),
    assignee: v.optional(v.string()),  // "Canon", "Zeiss", etc.
    filingDate: v.optional(v.number()),
    issueDate: v.optional(v.number()),
    expiryDate: v.optional(v.number()),
    cpcClass: v.optional(v.string()),  // "G02B13/04"
    url: v.optional(v.string()),
    summary: v.optional(v.string()),   // Photon's markdown summary
    designForm: v.optional(v.string()),
    relatedDesignIds: v.optional(v.array(v.id("lensDesigns"))),
    relevance: v.optional(v.union(
      v.literal("blocking"),
      v.literal("adjacent"),
      v.literal("expired"),
      v.literal("design_around"),
      v.literal("reference")
    )),
    addedBy: v.id("agents"),
    addedAt: v.number(),
    notes: v.optional(v.string()),
  })
    .index("by_design_form", ["designForm"])
    .index("by_relevance", ["relevance"])
    .index("by_cpc", ["cpcClass"])
    .searchIndex("search_patents", {
      searchField: "summary",
      filterFields: ["designForm", "relevance"],
    }),

  // ── Glass Selections ─────────────────────────────────────────────
  glassSelections: defineTable({
    designId: v.id("lensDesigns"),
    elementIndex: v.number(),          // 1-based element number
    catalog: v.string(),               // "Schott", "CDGM", "Hoya", etc.
    glassCode: v.string(),             // "N-BK7", "H-ZF52A", etc.
    nd: v.optional(v.number()),        // refractive index at d-line
    vd: v.optional(v.number()),        // Abbe number
    dpgf: v.optional(v.number()),      // partial dispersion Δ(Pg,F)
    status: v.optional(v.union(
      v.literal("proposed"),
      v.literal("confirmed"),
      v.literal("substitute_needed"),
      v.literal("obsolete")
    )),
    costTier: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    notes: v.optional(v.string()),
  })
    .index("by_design", ["designId"]),

});
