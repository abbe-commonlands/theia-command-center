import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {
    relevance: v.optional(v.string()),
    designForm: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let patents = await ctx.db.query("patents").collect();
    if (args.relevance) patents = patents.filter(p => p.relevance === args.relevance);
    if (args.designForm) patents = patents.filter(p => p.designForm === args.designForm);
    return patents.sort((a, b) => b.addedAt - a.addedAt);
  },
});

export const coverageByForm = query({
  args: {},
  handler: async (ctx) => {
    const patents = await ctx.db.query("patents").collect();
    const designs = await ctx.db.query("lensDesigns").collect();
    const forms = [...new Set(designs.map(d => d.designForm))];
    return forms.map(form => {
      const related = patents.filter(p => p.designForm === form);
      const blocking = related.some(p => p.relevance === "blocking");
      const risk     = related.some(p => p.relevance === "adjacent");
      return {
        form,
        status: blocking ? "blocked" : risk ? "risk" : related.length ? "clear" : "unknown",
        patentCount: related.length,
      };
    });
  },
});

export const create = mutation({
  args: {
    patentNumber: v.string(),
    title: v.string(),
    assignee: v.optional(v.string()),
    filingDate: v.optional(v.number()),
    issueDate: v.optional(v.number()),
    expiryDate: v.optional(v.number()),
    cpcClass: v.optional(v.string()),
    url: v.optional(v.string()),
    summary: v.optional(v.string()),
    designForm: v.optional(v.string()),
    relatedDesignIds: v.optional(v.array(v.id("lensDesigns"))),
    relevance: v.optional(v.union(
      v.literal("blocking"), v.literal("adjacent"), v.literal("expired"),
      v.literal("design_around"), v.literal("reference")
    )),
    addedBy: v.id("agents"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("patents", { ...args, addedAt: Date.now() });

    const msgSuffix = args.relevance === "blocking" ? " ⚠️ BLOCKING" :
                      args.relevance === "adjacent"  ? " — adjacent risk" : "";
    await ctx.db.insert("activities", {
      type: args.relevance === "blocking" ? "patent_risk_flagged" : "patent_added",
      agentId: args.addedBy,
      message: `Patent added: ${args.patentNumber} — ${args.title}${msgSuffix}`,
      metadata: { relevance: args.relevance, patentNumber: args.patentNumber },
    });

    // Update design patent clearance if blocking
    if (args.relevance === "blocking" && args.relatedDesignIds) {
      for (const designId of args.relatedDesignIds) {
        await ctx.db.patch(designId, { patentClearance: "blocked", updatedAt: Date.now() });
      }
    } else if (args.relevance === "adjacent" && args.relatedDesignIds) {
      for (const designId of args.relatedDesignIds) {
        const d = await ctx.db.get(designId);
        if (d && d.patentClearance !== "blocked") {
          await ctx.db.patch(designId, { patentClearance: "risk", updatedAt: Date.now() });
        }
      }
    }
    return id;
  },
});
