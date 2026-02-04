# Contributing to Abbe Command Center

## 🚨 CRITICAL: PR-ONLY WORKFLOW

**NO agent may push directly to main. EVER.**

This repository requires Pull Request review before any code reaches main.

---

## The Rules

### For ALL Agents (Zernike, Iris, Seidel, Photon, Kanban, Deming, Ernst, Theia)

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes and commit**
   ```bash
   git add -A
   git commit -m "feat: description of changes"
   ```

3. **Push your branch (NOT main)**
   ```bash
   git push origin feature/your-feature-name
   ```

4. **Create a Pull Request**
   ```bash
   gh pr create --title "feat: your feature" --body "Description of changes"
   ```

5. **STOP. Wait for Abbe to review.**

### For Abbe ONLY

1. Review PR for:
   - Schema compatibility (will new fields break existing data?)
   - Dependency conflicts
   - Breaking changes to Convex functions

2. Test locally:
   ```bash
   git fetch origin
   git checkout pr-branch
   npx convex dev --once  # Verify schema validates
   ```

3. If approved, merge and deploy:
   ```bash
   gh pr merge --squash
   npx convex deploy --yes
   ```

---

## Why This Matters

On 2026-02-04, agents pushed schema changes directly to main without PR review:
- Added required fields to `employees` table
- Added fields to `qualityKPIs` without matching existing data
- Added fields to `trainingCourses` not in schema

**Result:** Production Convex deployment broke. Schema validation failed.

This is exactly why we have code review.

---

## Checklist Before PR

- [ ] `npx convex dev --once` passes locally
- [ ] No new required fields added to tables with existing data
- [ ] If adding new tables, documented in PR description
- [ ] Tested UI changes in browser

---

## Branch Naming

- `feature/` — New functionality
- `fix/` — Bug fixes
- `refactor/` — Code cleanup
- `docs/` — Documentation only

---

## Commit Messages

Use conventional commits:
- `feat:` — New feature
- `fix:` — Bug fix
- `refactor:` — Code change that neither fixes nor adds
- `docs:` — Documentation
- `chore:` — Maintenance

---

**Abbe is the only merge authority for this repository.**

---

## Deployment Configuration

**Convex Deployment:** `aromatic-trout-929` (dev)

The `.env.local` file MUST contain:
```
CONVEX_DEPLOYMENT=dev:aromatic-trout-929
CONVEX_URL=https://aromatic-trout-929.convex.cloud
```

**DO NOT change this.** The frontend (`js/convex-client.js`) points to this deployment.
If CLI and frontend point to different deployments, data won't sync.

**IMPORTANT:** Use `npx convex dev --once` to push changes, NOT `npx convex deploy`.

### Incident 2026-02-04 (Deployment Mismatch)
`.env.local` was changed to `quick-whale-641` (prod) while frontend used `aromatic-trout-929` (dev).
Result: Agents reported to prod DB, dashboard showed dev DB. No data appeared to sync.
