// Task seed data extracted from PROJECT-TRACKER recovery documents
// Run this after DB.init() to populate tasks

const SEED_TASKS = [
  // 🔴 BLOCKED
  { title: "Acumatica API Integration", description: "VAR needs to add 'api' scope. OAuth login works, waiting for scope.", status: "inbox", priority: "high", assigneeId: "agent:engineering:main" },
  
  // 🟡 NEEDS INPUT
  { title: "Twitter/X for Commonlands", description: "Browser login needed. Configure bird CLI with auth_token and ct0.", status: "inbox", priority: "high", assigneeId: "agent:marketing:main" },
  { title: "COS Platform v2.0 - Planning", description: "Full rebuild with Acumatica. Spec complete (4,648 lines). Project location + database hosting decision needed.", status: "assigned", priority: "urgent", assigneeId: "agent:softwaredeveloper:main" },
  { title: "Shopify MCP Setup", description: "Custom app + Admin API token. Deadline Feb 7. Decision: MCP vs direct API.", status: "inbox", priority: "high", assigneeId: "agent:operations:main" },
  { title: "Zemax API Integration", description: "Optical design automation. Hardware purchase decision pending.", status: "inbox", priority: "medium", assigneeId: "agent:engineering:main" },
  { title: "Apollo.io API Key", description: "Need API key added to 1Password vault 'Clawd'.", status: "inbox", priority: "medium", assigneeId: "agent:sales:main" },
  { title: "PhantomBuster API Key", description: "Need API key added to 1Password.", status: "inbox", priority: "medium", assigneeId: "agent:sales:main" },
  { title: "Firecrawl API Key", description: "Need API key added to 1Password.", status: "inbox", priority: "low", assigneeId: "agent:operations:main" },
  { title: "Google Ads Developer Token", description: "ads.google.com → Tools → API Center. Apply for developer token.", status: "inbox", priority: "medium", assigneeId: "agent:marketing:main" },
  { title: "GEO Skill Approval", description: "Customized for Commonlands SEO. Awaiting approval to install.", status: "inbox", priority: "low", assigneeId: "agent:marketing:main" },
  
  // 🟢 ACTIVE
  { title: "COS Dashboard v1.5.0", description: "Running on Railway. Partially functional - needs Acumatica API.", status: "in_progress", priority: "high", assigneeId: "agent:softwaredeveloper:main" },
  { title: "B2B Sales System", description: "Schema + UI built. Awaiting API keys for full functionality.", status: "in_progress", priority: "high", assigneeId: "agent:sales:main" },
  { title: "Lead Management System", description: "Architecture complete. Ready for implementation.", status: "in_progress", priority: "high", assigneeId: "agent:sales:main" },
  { title: "Morning Briefing System", description: "Daily automated summary: emails, HubSpot pipeline, inbound shipments.", status: "done", priority: "high", assigneeId: "agent:main:main" },
  { title: "Customer Matching UI", description: "UI built, waiting for Acumatica API connection.", status: "review", priority: "medium", assigneeId: "agent:softwaredeveloper:main" },
  { title: "Marketing Dashboard", description: "Built and ready. Needs GA4 + Google Ads connections.", status: "review", priority: "medium", assigneeId: "agent:marketing:main" },
  { title: "Security Hardening v1.5.0", description: "Implemented injection scanner, threat checklist, and security protocols.", status: "done", priority: "high", assigneeId: "agent:softwaredeveloper:main" },
  { title: "ERP Marketing Email Filter", description: "Script ready to filter marketing emails from erp@commonlands.com.", status: "assigned", priority: "medium", assigneeId: "agent:operations:main" },
  
  // 🔵 BACKLOG - High Priority
  { title: "TIB Integration", description: "Parse OTS entry billing packet emails and populate COS TIB dashboard. Auto-extract entry numbers, import dates, expiration dates, part numbers, quantities, values. Track 6-month export deadlines.", status: "inbox", priority: "high", assigneeId: "agent:softwaredeveloper:main" },
  { title: "Duty Drawback Module", description: "Build out COS duty drawback tracking. Track eligible exports, calculate recoverable duties, generate drawback claims. Connect to customs entry data.", status: "inbox", priority: "high", assigneeId: "agent:softwaredeveloper:main" },
  { title: "Shopify DigiKey Sync", description: "Sync DigiKey inventory data with Shopify. High priority.", status: "inbox", priority: "high", assigneeId: "agent:operations:main" },
  { title: "Lead Follow-up Tracker", description: "Stale deal alerts. Track leads that need follow-up.", status: "inbox", priority: "high", assigneeId: "agent:sales:main" },
  { title: "Quote-to-Close Dashboard", description: "Win rate metrics. Track quote conversion rates.", status: "inbox", priority: "high", assigneeId: "agent:sales:main" },
  { title: "Customer Reorder Prediction", description: "ML-lite forecasting for customer reorder patterns.", status: "inbox", priority: "high", assigneeId: "agent:operations:main" },
  
  // 🔵 BACKLOG - Medium Priority
  { title: "Drip Campaign Builder", description: "Email sequences for nurturing leads.", status: "inbox", priority: "medium", assigneeId: "agent:marketing:main" },
  { title: "Inventory Velocity Report", description: "Fast/slow movers analysis.", status: "inbox", priority: "medium", assigneeId: "agent:operations:main" },
  { title: "Competitor Price Monitor", description: "Web scraper to track competitor pricing.", status: "inbox", priority: "medium", assigneeId: "agent:marketing:main" },
  { title: "Customer Health Score", description: "Retention risk scoring for customers.", status: "inbox", priority: "medium", assigneeId: "agent:sales:main" },
  { title: "Sales Forecast Dashboard", description: "30/60/90 day forecast projections.", status: "inbox", priority: "medium", assigneeId: "agent:sales:main" },
  
  // 🔵 BACKLOG - Lower Priority
  { title: "Automated Invoice Reminder", description: "Chase overdue invoices automatically.", status: "inbox", priority: "low", assigneeId: "agent:operations:main" },
  { title: "Supplier Performance Scorecard", description: "Vendor tracking and performance metrics.", status: "inbox", priority: "low", assigneeId: "agent:operations:main" },
  { title: "Email Response Templates", description: "Standard templates for common customer inquiries.", status: "inbox", priority: "low", assigneeId: "agent:sales:main" },
  
  // ✅ COMPLETED
  { title: "Memory Index Phase 1", description: "11 PM maintenance cron. Memory parsing and indexing.", status: "done", priority: "high", assigneeId: "agent:main:main" },
  { title: "Shopify Login Skill", description: "Skill for Shopify authentication.", status: "done", priority: "medium", assigneeId: "agent:softwaredeveloper:main" },
  { title: "1Password Integration", description: "CLI integration for secure credential access.", status: "done", priority: "high", assigneeId: "agent:main:main" },
  { title: "FedEx API Integration", description: "Shipment tracking + cron (6:05am/9am/1:30pm).", status: "done", priority: "high", assigneeId: "agent:operations:main" },
  { title: "HubSpot Integration", description: "89 deals, $46k pipeline. Full API access.", status: "done", priority: "high", assigneeId: "agent:sales:main" },
  { title: "Microsoft Graph Integration", description: "erp@commonlands.com email access.", status: "done", priority: "high", assigneeId: "agent:operations:main" },
  { title: "Databricks Connection", description: "Can query cos.inbound.shipments and write data.", status: "done", priority: "high", assigneeId: "agent:engineering:main" },
  { title: "HubSpot Contact Cleanup", description: "2,840 contacts deleted. Backup saved.", status: "done", priority: "medium", assigneeId: "agent:sales:main" },
  { title: "B2B Prospecting Skills", description: "Apollo, PhantomBuster, Firecrawl skills installed.", status: "done", priority: "medium", assigneeId: "agent:sales:main" },
  { title: "Customer Matcher UI", description: "Match customers in Acumatica to HubSpot.", status: "done", priority: "medium", assigneeId: "agent:softwaredeveloper:main" },
  { title: "Outbound Sales System", description: "Lead generation and outreach automation.", status: "done", priority: "high", assigneeId: "agent:sales:main" },
  { title: "Inbound Leads UI", description: "Dashboard for incoming leads.", status: "done", priority: "high", assigneeId: "agent:sales:main" },
  { title: "Abbe Command Center", description: "Desktop application for project tracking and memory visualization.", status: "in_progress", priority: "high", assigneeId: "agent:main:main" },
];

async function seedTasks() {
  if (!window.DB) {
    console.error("DB not initialized");
    return;
  }
  
  // Check if tasks already seeded
  const existing = await window.DB.tasks.list();
  if (existing.length > 0) {
    console.log(`Tasks already seeded (${existing.length} tasks). Skipping.`);
    return existing.length;
  }
  
  console.log(`Seeding ${SEED_TASKS.length} tasks...`);
  
  for (const task of SEED_TASKS) {
    await window.DB.tasks.add(task);
  }
  
  console.log(`✓ Seeded ${SEED_TASKS.length} tasks`);
  return SEED_TASKS.length;
}

// Auto-seed when script loads (after DB init)
if (window.DB) {
  seedTasks().then(() => {
    if (window.Mission) {
      window.Mission.refresh();
    }
  });
} else {
  // Wait for DB init
  const checkDB = setInterval(() => {
    if (window.DB) {
      clearInterval(checkDB);
      seedTasks().then(() => {
        if (window.Mission) {
          window.Mission.refresh();
        }
      });
    }
  }, 100);
}

window.seedTasks = seedTasks;
