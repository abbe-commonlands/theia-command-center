import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {
    status: v.optional(v.string()),
    mount: v.optional(v.string()),
    patentClearance: v.optional(v.string()),
    assignedTo: v.optional(v.id("agents")),
  },
  handler: async (ctx, args) => {
    let designs = await ctx.db.query("lensDesigns").collect();
    if (args.status) designs = designs.filter(d => d.status === args.status);
    if (args.mount)  designs = designs.filter(d => d.mount === args.mount);
    if (args.patentClearance) designs = designs.filter(d => d.patentClearance === args.patentClearance);
    if (args.assignedTo) designs = designs.filter(d => d.assignedTo === args.assignedTo);
    return designs.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const get = query({
  args: { id: v.id("lensDesigns") },
  handler: async (ctx, args) => ctx.db.get(args.id),
});

export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const active = ["initial_design", "optimizing", "tolerance_analysis"];
    const designs = await ctx.db.query("lensDesigns").collect();
    return designs.filter(d => active.includes(d.status)).sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    designForm: v.string(),
    mount: v.union(
      v.literal("M12"), v.literal("C-mount"), v.literal("M8"),
      v.literal("CS-mount"), v.literal("other")
    ),
    status: v.optional(v.string()),
    focalLength: v.optional(v.number()),
    fNumber: v.optional(v.number()),
    fovDeg: v.optional(v.number()),
    sensorFormat: v.optional(v.string()),
    elementCount: v.optional(v.number()),
    groupCount: v.optional(v.number()),
    stopPosition: v.optional(v.string()),
    assignedTo: v.optional(v.id("agents")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("lensDesigns", {
      ...args,
      status: (args.status as any) ?? "concept",
      patentClearance: "not_checked",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("activities", {
      type: "design_created",
      designId: id,
      designName: args.name,
      message: `New design created: ${args.name} (${args.mount}, ${args.designForm})`,
    });
    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("lensDesigns"),
    name: v.optional(v.string()),
    status: v.optional(v.string()),
    focalLength: v.optional(v.number()),
    fNumber: v.optional(v.number()),
    fovDeg: v.optional(v.number()),
    imageCircleMm: v.optional(v.number()),
    sensorFormat: v.optional(v.string()),
    elementCount: v.optional(v.number()),
    groupCount: v.optional(v.number()),
    stopPosition: v.optional(v.string()),
    ttlMm: v.optional(v.number()),
    zemaxFile: v.optional(v.string()),
    currentMFValue: v.optional(v.number()),
    rmsSpotUm: v.optional(v.number()),
    mtfAt100: v.optional(v.number()),
    distortionPct: v.optional(v.number()),
    assignedTo: v.optional(v.id("agents")),
    patentClearance: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Design not found");

    const updates: Record<string, any> = { ...fields, updatedAt: Date.now() };
    await ctx.db.patch(id, updates);

    if (fields.status && fields.status !== existing.status) {
      await ctx.db.insert("activities", {
        type: "design_status_changed",
        designId: id,
        designName: existing.name,
        message: `${existing.name} moved to ${fields.status.replace(/_/g, " ")}`,
        metadata: { from: existing.status, to: fields.status },
      });
    }
    return id;
  },
});

export const updatePerformance = mutation({
  args: {
    id: v.id("lensDesigns"),
    currentMFValue: v.optional(v.number()),
    rmsSpotUm: v.optional(v.number()),
    mtfAt100: v.optional(v.number()),
    distortionPct: v.optional(v.number()),
    zemaxFile: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, { ...fields, updatedAt: Date.now() });
  },
});
