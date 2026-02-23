import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {
    category: v.optional(v.string()),
    strength: v.optional(v.string()),
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let guidelines = await ctx.db.query("designGuidelines").collect();
    if (args.category)  guidelines = guidelines.filter(g => g.category === args.category);
    if (args.strength)  guidelines = guidelines.filter(g => g.strength === args.strength);
    if (args.activeOnly !== false) guidelines = guidelines.filter(g => g.active);
    return guidelines.sort((a, b) => {
      // Sort by strength (hard first), then weight (highest first)
      const strengthOrder: Record<string, number> = { hard: 0, strong: 1, moderate: 2, soft: 3 };
      const sa = strengthOrder[a.strength] ?? 4;
      const sb = strengthOrder[b.strength] ?? 4;
      if (sa !== sb) return sa - sb;
      return (b.weight || 0) - (a.weight || 0);
    });
  },
});

export const get = query({
  args: { id: v.id("designGuidelines") },
  handler: async (ctx, args) => ctx.db.get(args.id),
});

export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("designGuidelines")
      .withSearchIndex("search_guidelines", q => q.search("description", args.query))
      .take(20);
  },
});

export const byCategory = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("designGuidelines").collect();
    const active = all.filter(g => g.active);
    const categories = [...new Set(active.map(g => g.category))];
    return categories.map(cat => ({
      category: cat,
      count: active.filter(g => g.category === cat).length,
      hardCount: active.filter(g => g.category === cat && g.strength === "hard").length,
      strongCount: active.filter(g => g.category === cat && g.strength === "strong").length,
    })).sort((a, b) => b.count - a.count);
  },
});

// For Qwen / ray tracer: get all active guidelines as a flat list for merit function
export const activeForMerit = query({
  args: {
    categories: v.optional(v.array(v.string())),
    minStrength: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let guidelines = await ctx.db.query("designGuidelines").collect();
    guidelines = guidelines.filter(g => g.active);
    
    if (args.categories && args.categories.length > 0) {
      guidelines = guidelines.filter(g => args.categories!.includes(g.category));
    }
    
    const strengthOrder: Record<string, number> = { hard: 0, strong: 1, moderate: 2, soft: 3 };
    if (args.minStrength) {
      const minLevel = strengthOrder[args.minStrength] ?? 4;
      guidelines = guidelines.filter(g => (strengthOrder[g.strength] ?? 4) <= minLevel);
    }
    
    return guidelines.map(g => ({
      name: g.name,
      category: g.category,
      strength: g.strength,
      weight: g.weight,
      rule: g.rule,
      parameterName: g.parameterName,
      minValue: g.minValue,
      maxValue: g.maxValue,
      unit: g.unit,
      description: g.description,
      tags: g.tags,
    }));
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    category: v.string(),
    strength: v.string(),
    weight: v.number(),
    rule: v.optional(v.string()),
    parameterName: v.optional(v.string()),
    minValue: v.optional(v.number()),
    maxValue: v.optional(v.number()),
    unit: v.optional(v.string()),
    description: v.string(),
    rationale: v.optional(v.string()),
    source: v.optional(v.string()),
    addedBy: v.optional(v.id("agents")),
    addedByName: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("designGuidelines", {
      ...(args as any),
      active: true,
      timesApplied: 0,
      timesViolated: 0,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("activities", {
      type: "design_created",
      agentId: args.addedBy,
      agentName: args.addedByName,
      message: `Design guideline added: ${args.name} (${args.category}, ${args.strength})`,
      metadata: { guidelineId: id },
    });
    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("designGuidelines"),
    name: v.optional(v.string()),
    strength: v.optional(v.string()),
    weight: v.optional(v.number()),
    rule: v.optional(v.string()),
    minValue: v.optional(v.number()),
    maxValue: v.optional(v.number()),
    description: v.optional(v.string()),
    rationale: v.optional(v.string()),
    active: v.optional(v.boolean()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, { ...fields, updatedAt: Date.now() } as any);
  },
});

// Record that a guideline was applied during optimization
export const recordApplication = mutation({
  args: {
    id: v.id("designGuidelines"),
    violated: v.boolean(),
    designId: v.optional(v.id("lensDesigns")),
  },
  handler: async (ctx, args) => {
    const g = await ctx.db.get(args.id);
    if (!g) return;
    await ctx.db.patch(args.id, {
      timesApplied: (g.timesApplied || 0) + 1,
      timesViolated: args.violated ? (g.timesViolated || 0) + 1 : g.timesViolated,
      lastAppliedAt: Date.now(),
    });
  },
});
