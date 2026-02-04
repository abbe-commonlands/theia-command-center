// ===========================================================================
// RMA TRACKING API
// Convex queries and mutations for QMS RMA Dashboard
// ===========================================================================

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ===========================================================================
// QUERIES
// ===========================================================================

/**
 * Get all RMA records with optional filters
 */
export const getRMARecords = query({
  args: {
    status: v.optional(v.string()),
    qualityRelated: v.optional(v.boolean()),
    customerName: v.optional(v.string()),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
  },
  handler: async (ctx, { status, qualityRelated, customerName, dateFrom, dateTo }) => {
    let results = await ctx.db.query("rmaRecords").collect();
    
    // Apply filters
    if (status) {
      results = results.filter((r) => r.status === status);
    }
    
    if (qualityRelated !== undefined) {
      results = results.filter((r) => r.qualityRelated === qualityRelated);
    }
    
    if (customerName) {
      results = results.filter((r) =>
        r.customerName.toLowerCase().includes(customerName.toLowerCase())
      );
    }
    
    if (dateFrom) {
      results = results.filter((r) => r.rmaDate >= dateFrom);
    }
    
    if (dateTo) {
      results = results.filter((r) => r.rmaDate <= dateTo);
    }
    
    // Sort by date desc (newest first)
    return results.sort((a, b) => b.rmaDate - a.rmaDate);
  },
});

/**
 * Get single RMA by ID
 */
export const getRMAById = query({
  args: { rmaId: v.id("rmaRecords") },
  handler: async (ctx, { rmaId }) => {
    return await ctx.db.get(rmaId);
  },
});

/**
 * Get RMA statistics for dashboard
 */
export const getRMAStats = query({
  args: {},
  handler: async (ctx) => {
    const allRMAs = await ctx.db.query("rmaRecords").collect();
    
    const totalRMAs = allRMAs.length;
    const openRMAs = allRMAs.filter(
      (r) => r.status === "Open" || r.status === "In-Process"
    ).length;
    const qualityRMAs = allRMAs.filter((r) => r.qualityRelated).length;
    
    // Current year rate (2025)
    const currentYear = new Date().getFullYear();
    const kpi = await ctx.db
      .query("qualityKPIs")
      .withIndex("by_year", (q) => q.eq("year", currentYear))
      .first();
    
    const currentYearRate = kpi?.qualityReturnRate || 0;
    
    return {
      totalRMAs,
      openRMAs,
      qualityRMAs,
      currentYearRate,
    };
  },
});

/**
 * Get quality KPIs (historical data)
 */
export const getQualityKPIs = query({
  args: {
    yearFrom: v.optional(v.number()),
    yearTo: v.optional(v.number()),
  },
  handler: async (ctx, { yearFrom, yearTo }) => {
    let kpis = await ctx.db.query("qualityKPIs").collect();
    
    if (yearFrom) {
      kpis = kpis.filter((k) => k.year >= yearFrom);
    }
    
    if (yearTo) {
      kpis = kpis.filter((k) => k.year <= yearTo);
    }
    
    return kpis.sort((a, b) => a.year - b.year);
  },
});

/**
 * Get RMAs for specific customer
 */
export const getRMAsByCustomer = query({
  args: { customerName: v.string() },
  handler: async (ctx, { customerName }) => {
    return await ctx.db
      .query("rmaRecords")
      .withIndex("by_customer", (q) => q.eq("customerName", customerName))
      .collect();
  },
});

/**
 * Get recent RMAs (last N records)
 */
export const getRecentRMAs = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 10 }) => {
    const rmas = await ctx.db
      .query("rmaRecords")
      .order("desc")
      .take(limit);
    
    return rmas;
  },
});

/**
 * Get quality-related RMAs only
 */
export const getQualityRMAs = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("rmaRecords")
      .withIndex("by_quality", (q) => q.eq("qualityRelated", true))
      .collect();
  },
});

/**
 * Get RMA trend data (by month/year for charts)
 */
export const getRMATrends = query({
  args: { year: v.optional(v.number()) },
  handler: async (ctx, { year }) => {
    const targetYear = year || new Date().getFullYear();
    const startDate = new Date(targetYear, 0, 1).getTime();
    const endDate = new Date(targetYear, 11, 31).getTime();
    
    const rmas = await ctx.db
      .query("rmaRecords")
      .filter((q) =>
        q.and(
          q.gte(q.field("rmaDate"), startDate),
          q.lte(q.field("rmaDate"), endDate)
        )
      )
      .collect();
    
    // Group by month
    const monthlyData = Array(12).fill(0).map((_, i) => ({
      month: i + 1,
      total: 0,
      quality: 0,
    }));
    
    rmas.forEach((rma) => {
      const month = new Date(rma.rmaDate).getMonth();
      monthlyData[month].total++;
      if (rma.qualityRelated) {
        monthlyData[month].quality++;
      }
    });
    
    return monthlyData;
  },
});

// ===========================================================================
// MUTATIONS
// ===========================================================================

/**
 * Create new RMA record
 */
export const createRMA = mutation({
  args: {
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
    status: v.string(),
    qualityRelated: v.boolean(),
    partNumberMixup: v.boolean(),
    notes: v.optional(v.string()),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate status
    const validStatuses = ["Open", "Closed", "Cancelled", "Voided", "In-Process", "Tentatively Closed"];
    if (!validStatuses.includes(args.status)) {
      throw new Error(`Invalid status: ${args.status}`);
    }
    
    // Check for duplicate RMA number
    const existing = await ctx.db
      .query("rmaRecords")
      .withIndex("by_rmaNumber", (q) => q.eq("rmaNumber", args.rmaNumber))
      .first();
    
    if (existing) {
      throw new Error(`RMA ${args.rmaNumber} already exists`);
    }
    
    return await ctx.db.insert("rmaRecords", {
      ...args,
      statusDate: args.status === "Closed" ? Date.now() : undefined,
    });
  },
});

/**
 * Update existing RMA record
 */
export const updateRMA = mutation({
  args: {
    rmaId: v.id("rmaRecords"),
    rmaNumber: v.optional(v.string()),
    rmaDate: v.optional(v.number()),
    customerName: v.optional(v.string()),
    contactName: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    salesOrderNumber: v.optional(v.string()),
    shipmentNumber: v.optional(v.string()),
    partNumbers: v.optional(v.array(v.string())),
    quantities: v.optional(v.array(v.number())),
    reasonForReturn: v.optional(v.string()),
    dateReturnReceived: v.optional(v.number()),
    actionTaken: v.optional(v.string()),
    status: v.optional(v.string()),
    qualityRelated: v.optional(v.boolean()),
    partNumberMixup: v.optional(v.boolean()),
    notes: v.optional(v.string()),
    modifiedBy: v.string(),
  },
  handler: async (ctx, { rmaId, modifiedBy, ...updates }) => {
    const existing = await ctx.db.get(rmaId);
    if (!existing) {
      throw new Error("RMA not found");
    }
    
    // If status changed to Closed, set statusDate
    if (updates.status === "Closed" && existing.status !== "Closed") {
      (updates as any).statusDate = Date.now();
    }
    
    await ctx.db.patch(rmaId, {
      ...updates,
      lastModifiedBy: modifiedBy,
      lastModifiedAt: Date.now(),
    });
    
    return { success: true };
  },
});

/**
 * Delete RMA record
 */
export const deleteRMA = mutation({
  args: { rmaId: v.id("rmaRecords") },
  handler: async (ctx, { rmaId }) => {
    await ctx.db.delete(rmaId);
    return { success: true };
  },
});

/**
 * Bulk import RMAs (for seeding)
 */
export const bulkImportRMAs = mutation({
  args: {
    records: v.array(v.any()),
  },
  handler: async (ctx, { records }) => {
    let imported = 0;
    let skipped = 0;
    
    for (const record of records) {
      // Check if already exists
      const existing = await ctx.db
        .query("rmaRecords")
        .withIndex("by_rmaNumber", (q) => q.eq("rmaNumber", record.rmaNumber))
        .first();
      
      if (existing) {
        skipped++;
        continue;
      }
      
      await ctx.db.insert("rmaRecords", record);
      imported++;
    }
    
    return { imported, skipped };
  },
});

/**
 * Seed quality KPIs (run once to initialize historical data)
 */
export const seedQualityKPIs = mutation({
  args: {},
  handler: async (ctx) => {
    const kpiData = [
      {
        year: 2022,
        totalShipments: 675,
        qualityReturns: 1,
        qualityReturnRate: 0.15,
        totalItems: 45268,
        itemsReturned: 60,
        itemReturnRate: 0.13,
      },
      {
        year: 2023,
        totalShipments: 1010,
        qualityReturns: 2,
        qualityReturnRate: 0.20,
        totalItems: 52801,
        itemsReturned: 22,
        itemReturnRate: 0.04,
      },
      {
        year: 2024,
        totalShipments: 1850,
        qualityReturns: 10,
        qualityReturnRate: 0.54,
        totalItems: 90844,
        itemsReturned: 976,
        itemReturnRate: 1.07,
      },
      {
        year: 2025,
        totalShipments: 830,
        qualityReturns: 0,
        qualityReturnRate: 0.00,
        totalItems: 44000,
        itemsReturned: 0,
        itemReturnRate: 0.00,
      },
    ];
    
    for (const kpi of kpiData) {
      // Check if already exists
      const existing = await ctx.db
        .query("qualityKPIs")
        .withIndex("by_year", (q) => q.eq("year", kpi.year))
        .first();
      
      if (!existing) {
        await ctx.db.insert("qualityKPIs", kpi);
      }
    }
    
    return { success: true, seeded: kpiData.length };
  },
});
