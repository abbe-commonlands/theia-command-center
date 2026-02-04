#!/usr/bin/env node
/**
 * Seed Training Data
 * Seeds employees and training courses into Mission Control
 */

const { ConvexHttpClient } = require("convex/browser");
const fs = require("fs");
const path = require("path");

const DEPLOYMENT_URL = "https://quick-whale-641.convex.cloud";
const client = new ConvexHttpClient(DEPLOYMENT_URL);

// Load seed data
const seedDataPath = path.join(process.env.HOME, "clawd-deming/training-courses-seed.json");
const seedData = JSON.parse(fs.readFileSync(seedDataPath, "utf-8"));

async function seedEmployees() {
  console.log("📝 Seeding employees...");
  
  for (const emp of seedData.employees) {
    try {
      await client.mutation("training:upsertEmployee", {
        ...emp,
        createdBy: "system",
      });
      console.log(`  ✅ ${emp.name}`);
    } catch (error) {
      console.error(`  ❌ Failed to seed ${emp.name}:`, error.message);
    }
  }
}

async function seedCourses() {
  console.log("\n📚 Seeding training courses...");
  
  const allCourses = [
    ...seedData.equipment_training,
    ...seedData.qms_training,
    ...seedData.safety_training,
  ];
  
  for (const course of allCourses) {
    try {
      await client.mutation("training:upsertCourse", {
        ...course,
        createdBy: "system",
      });
      console.log(`  ✅ ${course.courseId}: ${course.courseName}`);
    } catch (error) {
      console.error(`  ❌ Failed to seed ${course.courseId}:`, error.message);
    }
  }
}

async function main() {
  console.log("🚀 Starting training data seed...\n");
  
  await seedEmployees();
  await seedCourses();
  
  console.log("\n✅ Training data seed complete!");
  process.exit(0);
}

main().catch((error) => {
  console.error("❌ Seed failed:", error);
  process.exit(1);
});
