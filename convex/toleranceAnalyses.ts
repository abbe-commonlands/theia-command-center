import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { designId: v.optional(v.id("lensDesigns")) },
  handler: async (ctx, args) => {
    const analyses = args.designId
      ? await ctx.db.query("toleranceAnalyses").withIndex("by_design", q => q.eq("designId", args.designId!)).collect()
      : await ctx.db.query("toleranceAnalyses").collect();
    return analyses.sort((a, b) => b.runAt - a.runAt);
  },
});

export const latestPerDesign = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("toleranceAnalyses").collect();
    const latest = new Map<string, typeof all[0]>();
    for (const a of all) {
      const key = a.designId as string;
      if (!latest.has(key) || a.runAt > latest.get(key)!.runAt) {
        latest.set(key, a);
      }
    }
    return Array.from(latest.values()).sort((a, b) => b.runAt - a.runAt);
  },
});

export const create = mutation({
  args: {
    designId: v.id("lensDesigns"),
    designName: v.string(),
    runBy: v.id("agents"),
    runByName: v.string(),
    yieldPercent: v.optional(v.number()),
    rssRmsSpotUm: v.optional(v.number()),
    worstCaseSensitivity: v.optional(v.string()),
    criticalTolerances: v.optional(v.array(v.object({
      parameter: v.string(),
      nominalValue: v.number(),
      tolerancePlus: v.number(),
      toleranceMinus: v.number(),
      sensitivity: v.number(),
      riskLevel: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    }))),
    mfgRisk: v.optional(v.union(
      v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("unacceptable")
    )),
    recommendation: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("toleranceAnalyses", {
      ...args,
      status: "complete",
      runAt: Date.now(),
    });
    const yieldStr = args.yieldPercent !== undefined ? ` — ${args.yieldPercent.toFixed(0)}% yield` : "";
    const riskStr = args.mfgRisk ? `, ${args.mfgRisk} mfg risk` : "";
    await ctx.db.insert("activities", {
      type: "tolerance_analysis_complete",
      agentId: args.runBy,
      agentName: args.runByName,
      designId: args.designId,
      designName: args.designName,
      message: `Tolerance analysis complete for ${args.designName}${yieldStr}${riskStr}`,
      metadata: { yieldPercent: args.yieldPercent, mfgRisk: args.mfgRisk },
    });
    return id;
  },
});
