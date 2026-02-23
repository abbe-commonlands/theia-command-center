import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listByDesign = query({
  args: { designId: v.id("lensDesigns") },
  handler: async (ctx, args) => {
    return ctx.db.query("glassSelections")
      .withIndex("by_design", q => q.eq("designId", args.designId))
      .collect()
      .then(r => r.sort((a, b) => a.elementIndex - b.elementIndex));
  },
});

export const upsert = mutation({
  args: {
    designId: v.id("lensDesigns"),
    elementIndex: v.number(),
    catalog: v.string(),
    glassCode: v.string(),
    nd: v.optional(v.number()),
    vd: v.optional(v.number()),
    dpgf: v.optional(v.number()),
    status: v.optional(v.string()),
    costTier: v.optional(v.string()),
    notes: v.optional(v.string()),
    agentId: v.optional(v.id("agents")),
    agentName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { agentId, agentName, ...fields } = args;
    const existing = await ctx.db.query("glassSelections")
      .withIndex("by_design", q => q.eq("designId", args.designId))
      .collect()
      .then(r => r.find(g => g.elementIndex === args.elementIndex));

    let id;
    if (existing) {
      await ctx.db.patch(existing._id, fields);
      id = existing._id;
    } else {
      id = await ctx.db.insert("glassSelections", fields as any);
    }

    // Log activity
    const design = await ctx.db.get(args.designId);
    await ctx.db.insert("activities", {
      type: "glass_selected",
      agentId,
      agentName,
      designId: args.designId,
      designName: design?.name,
      message: `Element ${args.elementIndex}: ${args.catalog} ${args.glassCode} (nd=${args.nd?.toFixed(4) ?? "?"}, Vd=${args.vd?.toFixed(2) ?? "?"})`,
    });

    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("glassSelections") },
  handler: async (ctx, args) => ctx.db.delete(args.id),
});
