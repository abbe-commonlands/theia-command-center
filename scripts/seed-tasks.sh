#!/bin/bash
# Seed tasks into Convex

cd ~/clawd/projects/abbe-command-center

# Helper function to create task
create_task() {
  local title="$1"
  local desc="$2"
  local priority="$3"
  local status="$4"
  
  npx convex run tasks:create "{\"title\": \"$title\", \"description\": \"$desc\", \"priority\": $priority}" 2>/dev/null
  echo "✓ $title"
}

echo "Seeding tasks into Convex..."

# 🔴 HIGH PRIORITY (P9)
create_task "Microsoft SSO Integration" "Set up Microsoft SSO for COS. High priority." 9 inbox
create_task "Shopify MCP Setup" "Custom app + Admin API token. Deadline Feb 7. Decision: MCP vs direct API." 9 inbox

# 🟠 HIGH PRIORITY (P7-8)
create_task "COS Platform v2.0 - Planning" "Full rebuild with Acumatica. Spec complete. Project location + database hosting decision needed." 8 assigned
create_task "Acumatica API Integration" "VAR needs to add api scope. OAuth login works, waiting for scope." 7 inbox
create_task "Twitter/X for Commonlands" "Browser login needed. Configure bird CLI with auth_token and ct0." 7 inbox
create_task "COS Dashboard v1.5.0" "Running on Railway. Partially functional - needs Acumatica API." 7 in_progress
create_task "B2B Sales System" "Schema + UI built. Awaiting API keys for full functionality." 7 in_progress
create_task "Lead Management System" "Architecture complete. Ready for implementation." 7 in_progress
create_task "TIB Integration" "Parse OTS entry billing packet emails. Track 6-month export deadlines." 7 inbox
create_task "Duty Drawback Module" "Build COS duty drawback tracking. Calculate recoverable duties." 7 inbox
create_task "Shopify DigiKey Sync" "Sync DigiKey inventory data with Shopify." 7 inbox
create_task "Lead Follow-up Tracker" "Stale deal alerts. Track leads that need follow-up." 7 inbox
create_task "Quote-to-Close Dashboard" "Win rate metrics. Track quote conversion rates." 7 inbox
create_task "Customer Reorder Prediction" "ML-lite forecasting for customer reorder patterns." 7 inbox

# 🟡 MEDIUM PRIORITY (P5)
create_task "Zemax API Integration" "Optical design automation. Hardware purchase decision pending." 5 inbox
create_task "Apollo.io API Key" "Need API key added to 1Password vault Clawd." 5 inbox
create_task "PhantomBuster API Key" "Need API key added to 1Password." 5 inbox
create_task "Google Ads Developer Token" "ads.google.com - Tools - API Center. Apply for developer token." 5 inbox
create_task "Customer Matching UI" "UI built, waiting for Acumatica API connection." 5 review
create_task "Marketing Dashboard" "Built and ready. Needs GA4 + Google Ads connections." 5 review
create_task "ERP Marketing Email Filter" "Script ready to filter marketing emails from erp@commonlands.com." 5 assigned
create_task "Drip Campaign Builder" "Email sequences for nurturing leads." 5 inbox
create_task "Inventory Velocity Report" "Fast/slow movers analysis." 5 inbox
create_task "Competitor Price Monitor" "Web scraper to track competitor pricing." 5 inbox
create_task "Customer Health Score" "Retention risk scoring for customers." 5 inbox
create_task "Sales Forecast Dashboard" "30/60/90 day forecast projections." 5 inbox

# 🟢 LOWER PRIORITY (P3)
create_task "Firecrawl API Key" "Need API key added to 1Password." 3 inbox
create_task "GEO Skill Approval" "Customized for Commonlands SEO. Awaiting approval to install." 3 inbox
create_task "Automated Invoice Reminder" "Chase overdue invoices automatically." 3 inbox
create_task "Supplier Performance Scorecard" "Vendor tracking and performance metrics." 3 inbox
create_task "Email Response Templates" "Standard templates for common customer inquiries." 3 inbox

echo ""
echo "Done! Created tasks in Convex."
