import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {
    designId: v.optional(v.id("lensDesigns")),
    agentId: v.optional(v.id("agents")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let runs = args.designId
      ? await ctx.db.query("optimizationRuns").withIndex("by_design", q => q.eq("designId", args.designId!)).collect()
      : await ctx.db.query("optimizationRuns").collect();
    if (args.agentId) runs = runs.filter(r => r.runBy === args.agentId);
    runs = runs.sort((a, b) => b.startedAt - a.startedAt);
    return args.limit ? runs.slice(0, args.limit) : runs;
  },
});

export const listRunning = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("optimizationRuns").withIndex("by_status", q => q.eq("status", "running")).collect();
  },
});

export const create = mutation({
  args: {
    designId: v.id("lensDesigns"),
    designName: v.string(),
    runBy: v.id("agents"),
    runByName: v.string(),
    meritFunction: v.optional(v.string()),
    algorithm: v.optional(v.string()),
    mfValueBefore: v.optional(v.number()),
    rmsSpotBefore: v.optional(v.number()),
    zemaxFile: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("optimizationRuns", {
      ...args,
      status: "running",
      startedAt: Date.now(),
    });
    await ctx.db.insert("activities", {
      type: "optimization_started",
      agentId: args.runBy,
      agentName: args.runByName,
      designId: args.designId,
      designName: args.designName,
      message: `${args.runByName} started optimization on ${args.designName}${args.algorithm ? ` (${args.algorithm})` : ""}`,
    });
    return id;
  },
});

export const complete = mutation({
  args: {
    id: v.id("optimizationRuns"),
    status: v.union(v.literal("converged"), v.literal("stopped"), v.literal("failed")),
    mfValueAfter: v.optional(v.number()),
    rmsSpotAfter: v.optional(v.number()),
    iterationsCount: v.optional(v.number()),
    outputSummary: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const run = await ctx.db.get(id);
    if (!run) throw new Error("Run not found");

    const endedAt = Date.now();
    const durationMs = endedAt - run.startedAt;
    let mfImprovement: number | undefined;
    if (run.mfValueBefore && fields.mfValueAfter) {
      mfImprovement = ((run.mfValueBefore - fields.mfValueAfter) / run.mfValueBefore) * 100;
    }

    await ctx.db.patch(id, { ...fields, endedAt, durationMs, mfImprovement });

    if (fields.status === "converged") {
      // Update lens design performance
      if (fields.mfValueAfter !== undefined) {
        await ctx.db.patch(run.designId, {
          currentMFValue: fields.mfValueAfter,
          rmsSpotUm: fields.rmsSpotAfter,
          updatedAt: endedAt,
        });
      }
      await ctx.db.insert("activities", {
        type: "optimization_converged",
        agentId: run.runBy,
        agentName: run.runByName,
        designId: run.designId,
        designName: run.designName,
        message: `Optimization converged on ${run.designName}${mfImprovement ? ` (${mfImprovement.toFixed(1)}% MF improvement)` : ""}`,
        metadata: { mfBefore: run.mfValueBefore, mfAfter: fields.mfValueAfter, improvement: mfImprovement },
      });
    }
    return id;
  },
});
