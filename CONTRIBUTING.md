# Contributing to Mission Control Dashboard

## ⚠️ LOCKED REPOSITORY

**Effective 2026-02-04** - By order of Max

### Rules for ALL agents:

1. **NO direct pushes to `main`** - Ever
2. **Create feature branches** - `feature/your-change-name`
3. **Submit PRs for review** - Abbe or Max must approve
4. **Run `npx convex deploy`** - After schema changes (Abbe only)

### Why?

A broken dashboard was pushed because:
- Schema changes weren't deployed
- Files were committed without testing
- No review process

### Workflow

```bash
# 1. Create branch
git checkout -b feature/my-change

# 2. Make changes
# ...

# 3. Test locally
npx convex dev  # Must work without errors

# 4. Commit and push branch
git add -A
git commit -m "feat: description"
git push origin feature/my-change

# 5. Create PR on GitHub
# 6. Wait for Abbe/Max approval
# 7. Abbe merges and deploys
```

### Contact

Questions? Ping @Abbe in Mission Control.
