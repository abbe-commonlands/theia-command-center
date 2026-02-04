// Seed tasks into Convex
import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient("https://quick-whale-641.convex.cloud");

// Agent ID mapping (old sessionKey → Convex ID)
const AGENT_MAP = {
  "agent:main:main": "j97bvbeae5yxpts7tr0932dr5h80f6pe",
  "agent:sales:main": "j97f5s18gbanbs9ydsdr59p18980fy13",      // Seidel
  "agent:marketing:main": "j97ch9285dv9bb3hjy4m5zwgzs80eb9c",  // Iris
  "agent:engineering:main": "j972bphnsnhn06277t0hep7hsd80ed6z", // Theia
  "agent:operations:main": "j970zkewsnn6ssy7rq3kxnz41x80fn0v", // Photon
  "agent:softwaredeveloper:main": "j97apazcw5hvq435hv5sw606eh80exgt", // Zernike
};

// Priority mapping (old → 1-10 scale)
const PRIORITY_MAP = {
  "urgent": 9,
  "high": 7,
  "medium": 5,
  "low": 3,
};

// Current active tasks (not completed)
const TASKS = [
  // 🔴 BLOCKED
  { title: "Acumatica API Integration", description: "VAR needs to add 'api' scope. OAuth login works, waiting for scope.", status: "inbox", priority: 7, assignee: "agent:engineering:main" },
  
  // 🟡 NEEDS INPUT - HIGH PRIORITY
  { title: "Microsoft SSO Integration", description: "Set up Microsoft SSO for COS. High priority.", status: "inbox", priority: 9, assignee: "agent:softwaredeveloper:main" },
  { title: "Shopify MCP Setup", description: "Custom app + Admin API token. Deadline Feb 7. Decision: MCP vs direct API.", status: "inbox", priority: 9, assignee: "agent:operations:main" },
  { title: "Twitter/X for Commonlands", description: "Browser login needed. Configure bird CLI with auth_token and ct0.", status: "inbox", priority: 7, assignee: "agent:marketing:main" },
  { title: "COS Platform v2.0 - Planning", description: "Full rebuild with Acumatica. Spec complete (4,648 lines). Project location + database hosting decision needed.", status: "assigned", priority: 8, assignee: "agent:softwaredeveloper:main" },
  
  // 🟡 NEEDS INPUT - MEDIUM
  { title: "Zemax API Integration", description: "Optical design automation. Hardware purchase decision pending.", status: "inbox", priority: 5, assignee: "agent:engineering:main" },
  { title: "Apollo.io API Key", description: "Need API key added to 1Password vault 'Clawd'.", status: "inbox", priority: 5, assignee: "agent:sales:main" },
  { title: "PhantomBuster API Key", description: "Need API key added to 1Password.", status: "inbox", priority: 5, assignee: "agent:sales:main" },
  { title: "Firecrawl API Key", description: "Need API key added to 1Password.", status: "inbox", priority: 3, assignee: "agent:operations:main" },
  { title: "Google Ads Developer Token", description: "ads.google.com → Tools → API Center. Apply for developer token.", status: "inbox", priority: 5, assignee: "agent:marketing:main" },
  { title: "GEO Skill Approval", description: "Customized for Commonlands SEO. Awaiting approval to install.", status: "inbox", priority: 3, assignee: "agent:marketing:main" },
  
  // 🟢 ACTIVE
  { title: "COS Dashboard v1.5.0", description: "Running on Railway. Partially functional - needs Acumatica API.", status: "in_progress", priority: 7, assignee: "agent:softwaredeveloper:main" },
  { title: "B2B Sales System", description: "Schema + UI built. Awaiting API keys for full functionality.", status: "in_progress", priority: 7, assignee: "agent:sales:main" },
  { title: "Lead Management System", description: "Architecture complete. Ready for implementation.", status: "in_progress", priority: 7, assignee: "agent:sales:main" },
  { title: "Abbe Command Center", description: "Mission Control dashboard for agent coordination.", status: "in_progress", priority: 8, assignee: "agent:main:main" },
  
  // 📋 REVIEW
  { title: "Customer Matching UI", description: "UI built, waiting for Acumatica API connection.", status: "review", priority: 5, assignee: "agent:softwaredeveloper:main" },
  { title: "Marketing Dashboard", description: "Built and ready. Needs GA4 + Google Ads connections.", status: "review", priority: 5, assignee: "agent:marketing:main" },
  { title: "ERP Marketing Email Filter", description: "Script ready to filter marketing emails from erp@commonlands.com.", status: "assigned", priority: 5, assignee: "agent:operations:main" },
  
  // 🔵 BACKLOG - High Priority
  { title: "TIB Integration", description: "Parse OTS entry billing packet emails and populate COS TIB dashboard. Auto-extract entry numbers, import dates, expiration dates, part numbers, quantities, values. Track 6-month export deadlines.", status: "inbox", priority: 7, assignee: "agent:softwaredeveloper:main" },
  { title: "Duty Drawback Module", description: "Build out COS duty drawback tracking. Track eligible exports, calculate recoverable duties, generate drawback claims.", status: "inbox", priority: 7, assignee: "agent:softwaredeveloper:main" },
  { title: "Shopify DigiKey Sync", description: "Sync DigiKey inventory data with Shopify.", status: "inbox", priority: 7, assignee: "agent:operations:main" },
  { title: "Lead Follow-up Tracker", description: "Stale deal alerts. Track leads that need follow-up.", status: "inbox", priority: 7, assignee: "agent:sales:main" },
  { title: "Quote-to-Close Dashboard", description: "Win rate metrics. Track quote conversion rates.", status: "inbox", priority: 7, assignee: "agent:sales:main" },
  { title: "Customer Reorder Prediction", description: "ML-lite forecasting for customer reorder patterns.", status: "inbox", priority: 7, assignee: "agent:operations:main" },
  
  // 🔵 BACKLOG - Medium Priority
  { title: "Drip Campaign Builder", description: "Email sequences for nurturing leads.", status: "inbox", priority: 5, assignee: "agent:marketing:main" },
  { title: "Inventory Velocity Report", description: "Fast/slow movers analysis.", status: "inbox", priority: 5, assignee: "agent:operations:main" },
  { title: "Competitor Price Monitor", description: "Web scraper to track competitor pricing.", status: "inbox", priority: 5, assignee: "agent:marketing:main" },
  { title: "Customer Health Score", description: "Retention risk scoring for customers.", status: "inbox", priority: 5, assignee: "agent:sales:main" },
  { title: "Sales Forecast Dashboard", description: "30/60/90 day forecast projections.", status: "inbox", priority: 5, assignee: "agent:sales:main" },
  
  // 🔵 BACKLOG - Lower Priority
  { title: "Automated Invoice Reminder", description: "Chase overdue invoices automatically.", status: "inbox", priority: 3, assignee: "agent:operations:main" },
  { title: "Supplier Performance Scorecard", description: "Vendor tracking and performance metrics.", status: "inbox", priority: 3, assignee: "agent:operations:main" },
  { title: "Email Response Templates", description: "Standard templates for common customer inquiries.", status: "inbox", priority: 3, assignee: "agent:sales:main" },
];

async function seedTasks() {
  console.log(`Seeding ${TASKS.length} tasks into Convex...`);
  
  for (const task of TASKS) {
    const agentId = AGENT_MAP[task.assignee];
    
    try {
      await client.mutation("tasks:create", {
        title: task.title,
        description: task.description,
        priority: task.priority,
        createdBySession: "agent:main:main",
      });
      
      console.log(`✓ Created: ${task.title}`);
    } catch (err) {
      console.error(`✗ Failed: ${task.title}`, err.message);
    }
  }
  
  console.log("\nDone!");
}

seedTasks();
