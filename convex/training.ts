// ===========================================================================
// TRAINING MODULE API
// Convex queries and mutations for Mission Control Training Tab
// ===========================================================================

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ===========================================================================
// QUERIES
// ===========================================================================

/**
 * Get training matrix view (employees × courses)
 * Returns a matrix structure for grid display
 */
export const getTrainingMatrix = query({
  args: {},
  handler: async (ctx) => {
    const employees = await ctx.db
      .query("employees")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    
    const courses = await ctx.db
      .query("trainingCourses")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    
    const records = await ctx.db.query("trainingRecords").collect();
    
    // Build matrix: { employeeId: { courseId: record } }
    const matrix: Record<string, Record<string, any>> = {};
    
    for (const emp of employees) {
      matrix[emp._id] = {};
      for (const course of courses) {
        const record = records.find(
          (r) => r.employeeId === emp._id && r.courseId === course.courseId
        );
        matrix[emp._id][course.courseId] = record || null;
      }
    }
    
    return {
      employees,
      courses,
      matrix,
    };
  },
});

/**
 * Get training records for specific employee
 */
export const getEmployeeTraining = query({
  args: { employeeId: v.id("employees") },
  handler: async (ctx, { employeeId }) => {
    const employee = await ctx.db.get(employeeId);
    if (!employee) throw new Error("Employee not found");
    
    const records = await ctx.db
      .query("trainingRecords")
      .withIndex("by_employee", (q) => q.eq("employeeId", employeeId))
      .collect();
    
    // Enrich with course details
    const enrichedRecords = await Promise.all(
      records.map(async (record) => {
        const course = await ctx.db
          .query("trainingCourses")
          .withIndex("by_courseId", (q) => q.eq("courseId", record.courseId))
          .first();
        return { ...record, course };
      })
    );
    
    return {
      employee,
      records: enrichedRecords,
    };
  },
});

/**
 * Get all courses by category
 */
export const getCoursesByCategory = query({
  args: { category: v.optional(v.union(v.literal("equipment"), v.literal("qms"), v.literal("safety"))) },
  handler: async (ctx, { category }) => {
    let query = ctx.db.query("trainingCourses");
    
    if (category) {
      query = query.withIndex("by_category", (q) => q.eq("category", category));
    }
    
    return await query.collect();
  },
});

/**
 * Get training compliance stats
 */
export const getComplianceStats = query({
  args: {},
  handler: async (ctx) => {
    const employees = await ctx.db
      .query("employees")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    
    const courses = await ctx.db
      .query("trainingCourses")
      .filter((q) => q.eq(q.field("isRequired"), true))
      .collect();
    
    const records = await ctx.db.query("trainingRecords").collect();
    
    // Calculate stats
    const totalRequired = employees.length * courses.length;
    const completed = records.filter((r) => r.status === "valid").length;
    const expiring = records.filter((r) => r.status === "expiring").length;
    const expired = records.filter((r) => r.status === "expired").length;
    
    const complianceRate = totalRequired > 0 
      ? Math.round((completed / totalRequired) * 100) 
      : 0;
    
    return {
      totalEmployees: employees.length,
      totalCourses: courses.length,
      totalRequired,
      completed,
      expiring,
      expired,
      complianceRate,
    };
  },
});

/**
 * Get expiring/expired certifications
 */
export const getExpiringCertifications = query({
  args: { daysAhead: v.optional(v.number()) },
  handler: async (ctx, { daysAhead = 30 }) => {
    const now = Date.now();
    const futureDate = now + (daysAhead * 24 * 60 * 60 * 1000);
    
    const records = await ctx.db
      .query("trainingRecords")
      .filter((q) => 
        q.and(
          q.neq(q.field("status"), "expired"),
          q.lte(q.field("expiryDate"), futureDate)
        )
      )
      .collect();
    
    // Enrich with employee and course info
    const enriched = await Promise.all(
      records.map(async (record) => {
        const employee = await ctx.db.get(record.employeeId);
        const course = await ctx.db
          .query("trainingCourses")
          .withIndex("by_courseId", (q) => q.eq("courseId", record.courseId))
          .first();
        
        return {
          ...record,
          employeeName: employee?.name,
          courseName: course?.courseName,
        };
      })
    );
    
    return enriched;
  },
});

// ===========================================================================
// MUTATIONS
// ===========================================================================

/**
 * Add or update training record
 */
export const upsertTrainingRecord = mutation({
  args: {
    employeeId: v.id("employees"),
    courseId: v.string(),
    completedDate: v.number(),
    instructor: v.optional(v.string()),
    score: v.optional(v.number()),
    notes: v.optional(v.string()),
    certificateUrl: v.optional(v.string()),
    recordedBy: v.string(),
  },
  handler: async (ctx, args) => {
    // Get course to calculate expiry
    const course = await ctx.db
      .query("trainingCourses")
      .withIndex("by_courseId", (q) => q.eq("courseId", args.courseId))
      .first();
    
    if (!course) throw new Error("Course not found");
    
    // Calculate expiry date
    let expiryDate: number | undefined;
    if (course.validityMonths) {
      const completedDate = new Date(args.completedDate);
      completedDate.setMonth(completedDate.getMonth() + course.validityMonths);
      expiryDate = completedDate.getTime();
    }
    
    // Calculate status
    let status: "valid" | "expiring" | "expired" | "pending" = "valid";
    if (expiryDate) {
      const now = Date.now();
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      if (expiryDate < now) {
        status = "expired";
      } else if (expiryDate - now < thirtyDays) {
        status = "expiring";
      }
    }
    
    // Check if record exists
    const existing = await ctx.db
      .query("trainingRecords")
      .withIndex("by_employee_course", (q) => 
        q.eq("employeeId", args.employeeId).eq("courseId", args.courseId)
      )
      .first();
    
    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        completedDate: args.completedDate,
        expiryDate,
        instructor: args.instructor,
        score: args.score,
        notes: args.notes,
        certificateUrl: args.certificateUrl,
        status,
        lastModifiedBy: args.recordedBy,
        lastModifiedAt: Date.now(),
      });
      return existing._id;
    } else {
      // Create new
      return await ctx.db.insert("trainingRecords", {
        employeeId: args.employeeId,
        courseId: args.courseId,
        completedDate: args.completedDate,
        expiryDate,
        instructor: args.instructor,
        score: args.score,
        notes: args.notes,
        certificateUrl: args.certificateUrl,
        status,
        recordedBy: args.recordedBy,
      });
    }
  },
});

/**
 * Delete training record
 */
export const deleteTrainingRecord = mutation({
  args: {
    recordId: v.id("trainingRecords"),
  },
  handler: async (ctx, { recordId }) => {
    await ctx.db.delete(recordId);
    return { success: true };
  },
});

/**
 * Update employee info
 */
export const updateEmployee = mutation({
  args: {
    employeeId: v.id("employees"),
    name: v.optional(v.string()),
    jobRole: v.optional(v.string()),
    department: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    modifiedBy: v.string(),
  },
  handler: async (ctx, { employeeId, modifiedBy, ...updates }) => {
    await ctx.db.patch(employeeId, {
      ...updates,
      lastModifiedBy: modifiedBy,
      lastModifiedAt: Date.now(),
    });
    return { success: true };
  },
});

/**
 * Bulk status update (run periodically to update expiry statuses)
 */
export const updateTrainingStatuses = mutation({
  args: {},
  handler: async (ctx) => {
    const records = await ctx.db.query("trainingRecords").collect();
    const now = Date.now();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    
    let updated = 0;
    
    for (const record of records) {
      if (!record.expiryDate) continue;
      
      let newStatus: "valid" | "expiring" | "expired";
      if (record.expiryDate < now) {
        newStatus = "expired";
      } else if (record.expiryDate - now < thirtyDays) {
        newStatus = "expiring";
      } else {
        newStatus = "valid";
      }
      
      if (newStatus !== record.status) {
        await ctx.db.patch(record._id, { status: newStatus });
        updated++;
      }
    }
    
    return { updated };
  },
});

/**
 * Upsert employee (for seeding)
 */
export const upsertEmployee = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    jobRole: v.optional(v.string()),
    isActive: v.boolean(),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("employees")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    
    if (existing) {
      return existing._id;
    }
    
    return await ctx.db.insert("employees", args);
  },
});

/**
 * Upsert training course (for seeding)
 */
export const upsertCourse = mutation({
  args: {
    courseId: v.string(),
    courseName: v.string(),
    category: v.union(v.literal("equipment"), v.literal("qms"), v.literal("safety")),
    description: v.optional(v.string()),
    requiredForRoles: v.optional(v.array(v.string())),
    isRequired: v.boolean(),
    validityMonths: v.optional(v.number()),
    isActive: v.boolean(),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("trainingCourses")
      .withIndex("by_courseId", (q) => q.eq("courseId", args.courseId))
      .first();
    
    if (existing) {
      return existing._id;
    }
    
    return await ctx.db.insert("trainingCourses", args);
  },
});
