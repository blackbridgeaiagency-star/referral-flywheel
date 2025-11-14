# Deployment Guide - Referral Flywheel

**Last Updated:** 2025-11-12

This guide explains how to deploy updates to your Referral Flywheel app after it's live in the Whop App Store.

---

## Quick Reference

```bash
# Local development
npm run dev

# Type check
npx tsc --noEmit

# Build check
npm run build

# Deploy to production (PREFERRED METHOD)
vercel --prod --yes

# Health check after deploy
curl https://referral-flywheel.vercel.app/api/health
```

---

## Update Workflow Options

### Option 1: Direct Vercel Deployment (Recommended)

**Best for:** Quick updates, bug fixes, feature additions

**Steps:**

1. **Make your changes locally**
   ```bash
   # Edit files in VS Code or your preferred editor
   # Example: Update reward amounts, fix bugs, add features
   ```

2. **Test locally**
   ```bash
   npm run dev
   # Test at http://localhost:3000
   # Verify your changes work as expected
   ```

3. **Validate TypeScript**
   ```bash
   npx tsc --noEmit
   # Should show 0 errors
   ```

4. **Build check**
   ```bash
   npm run build
   # Ensures production build succeeds
   ```

5. **Deploy to production**
   ```bash
   vercel --prod --yes
   ```

6. **Verify deployment**
   ```bash
   # Health check
   curl https://referral-flywheel.vercel.app/api/health

   # Test creator dashboard
   curl https://referral-flywheel.vercel.app/seller-product/biz_kkGoY7OvzWXRdK
   ```

**Timeline:** 2-3 minutes from command to live

---

### Option 2: GitHub Auto-Deploy

**Best for:** Collaborative work, maintaining version history

**Steps:**

1. **Make your changes locally**

2. **Test and validate** (same as Option 1, steps 2-4)

3. **Commit and push**
   ```bash
   git add .
   git commit -m "Description of your changes"
   git push origin master
   ```

4. **Vercel auto-deploys**
   - Triggered automatically when you push to `master`
   - Watch progress at: https://vercel.com/blackbridges-projects/referral-flywheel/deployments

5. **Verify deployment** (same as Option 1, step 6)

**Timeline:** 3-5 minutes from push to live

---

## What Needs Re-Approval vs Auto-Updates

### Automatic Updates (No Review Needed)

- Code changes
- Bug fixes
- New features
- API endpoint changes
- UI/UX improvements
- Database schema updates
- Performance optimizations

**These go live immediately after deployment!**

### Requires Whop Review

- App name changes
- App description updates
- App icon/logo changes
- Screenshot updates
- Permission changes
- OAuth scope changes

**Submit these through Whop Developer Dashboard**

---

## Pre-Deployment Checklist

Before running `vercel --prod --yes`:

- [ ] Changes tested locally with `npm run dev`
- [ ] TypeScript check passes (`npx tsc --noEmit`)
- [ ] Build succeeds (`npm run build`)
- [ ] No console errors in browser
- [ ] Database queries tested (if applicable)
- [ ] API endpoints return expected results
- [ ] Mobile responsive (if UI changes)

---

## Post-Deployment Verification

After deploying, always verify:

### 1. Health Check
```bash
curl https://referral-flywheel.vercel.app/api/health
```

**Expected response:**
```json
{
  "status": "healthy",
  "checks": {
    "database": { "healthy": true },
    "environment": { "healthy": true }
  }
}
```

### 2. Creator Dashboard
```bash
# Should return HTML without errors
curl -I https://referral-flywheel.vercel.app/seller-product/biz_kkGoY7OvzWXRdK
# Look for "HTTP/2 200"
```

### 3. Member Dashboard (if applicable)
```bash
curl -I https://referral-flywheel.vercel.app/customer/[experienceId]
```

### 4. Check Vercel Logs
1. Go to: https://vercel.com/blackbridges-projects/referral-flywheel/deployments
2. Click latest deployment
3. Click "Runtime Logs" tab
4. Verify no errors

---

## Emergency Rollback

If you deployed a broken update:

### Method 1: Vercel Dashboard (Fastest)

1. Go to: https://vercel.com/blackbridges-projects/referral-flywheel/deployments
2. Find the last working deployment
3. Click the three dots (•••)
4. Click **"Promote to Production"**
5. Confirm

**Timeline:** 30 seconds to rollback

### Method 2: Redeploy Previous Commit

```bash
git log --oneline  # Find the working commit hash
git checkout <commit-hash>
vercel --prod --yes
git checkout master  # Return to latest code
```

---

## Environment Variables

### When to Update

Environment variables only need updating when:
- Adding new API keys
- Changing database credentials
- Updating webhook secrets
- Adding new configuration values

### How to Update

1. Go to: https://vercel.com/blackbridges-projects/referral-flywheel/settings/environment-variables
2. Find the variable to update
3. Click "Edit" (pencil icon)
4. Update the value
5. Check all environments (Production, Preview, Development)
6. Click "Save"
7. **Redeploy** for changes to take effect:
   ```bash
   vercel --prod --yes
   ```

### Current Environment Variables

```env
# Database
DATABASE_URL                    # Supabase connection string

# Whop Integration
WHOP_API_KEY                    # Whop API key
WHOP_WEBHOOK_SECRET             # Webhook verification
NEXT_PUBLIC_WHOP_APP_ID         # Your app ID
NEXT_PUBLIC_WHOP_COMPANY_ID     # Your company ID
NEXT_PUBLIC_WHOP_AGENT_USER_ID  # Agent user ID

# App Configuration
NEXT_PUBLIC_APP_URL             # Production URL

# Security
ADMIN_API_KEY                   # Admin endpoints
CRON_SECRET                     # Scheduled jobs
EXPORT_API_KEY                  # Data export
SESSION_SECRET                  # Session encryption
```

---

## Common Update Scenarios

### Scenario 1: Update Reward Amounts

```bash
# 1. Edit the creator dashboard page
code app/seller-product/[companyId]/page.tsx

# 2. Change the default tier values
# Example: tier1Count: 10 → tier1Count: 5

# 3. Test locally
npm run dev

# 4. Deploy
vercel --prod --yes
```

### Scenario 2: Fix a Bug

```bash
# 1. Fix the bug in your code

# 2. Test the fix
npm run dev

# 3. Verify TypeScript
npx tsc --noEmit

# 4. Deploy
vercel --prod --yes

# 5. Verify fix in production
curl https://referral-flywheel.vercel.app/api/health
```

### Scenario 3: Add a New Feature

```bash
# 1. Implement the feature
# Example: Add new API endpoint

# 2. Test thoroughly locally
npm run dev

# 3. Build check
npm run build

# 4. Deploy
vercel --prod --yes

# 5. Test new feature in production
curl https://referral-flywheel.vercel.app/api/your-new-endpoint
```

### Scenario 4: Database Schema Change

```bash
# 1. Update Prisma schema
code prisma/schema.prisma

# 2. Push to database
npx prisma db push

# 3. Regenerate Prisma client
npx prisma generate

# 4. Update application code to use new schema

# 5. Test locally
npm run dev

# 6. Deploy
vercel --prod --yes
```

---

## Monitoring Deployments

### Watch Live Deployment

```bash
# After running `vercel --prod --yes`, you'll see:
# ✓ Deployment ready
# Production: https://referral-flywheel.vercel.app
```

### View Deployment History

https://vercel.com/blackbridges-projects/referral-flywheel/deployments

### Check Runtime Logs

1. Go to deployments page
2. Click on the deployment
3. Click "Runtime Logs" tab
4. Monitor for errors or warnings

### Set Up Alerts (Optional)

1. Go to: https://vercel.com/blackbridges-projects/referral-flywheel/settings/notifications
2. Enable email/Slack notifications for:
   - Deployment failures
   - Runtime errors
   - Performance issues

---

## Performance Best Practices

### Before Deploying Large Changes

1. **Test with realistic data**
   - Use production-like database size
   - Test with multiple concurrent users

2. **Check bundle size**
   ```bash
   npm run build
   # Look for "Page Size" warnings
   ```

3. **Monitor API response times**
   - Health endpoint should respond in <1s
   - Dashboard pages should load in <3s

### After Deployment

1. **Monitor Vercel Analytics**
   - Go to: https://vercel.com/blackbridges-projects/referral-flywheel/analytics
   - Check Web Vitals, page load times

2. **Check Database Performance**
   - Monitor Supabase dashboard for slow queries
   - Ensure connection pooling is working

---

## Troubleshooting Common Issues

### Issue: "Environment variable not found"

**Cause:** Missing or incorrect environment variable in Vercel

**Fix:**
1. Check: https://vercel.com/blackbridges-projects/referral-flywheel/settings/environment-variables
2. Ensure variable is set for Production environment
3. Redeploy after adding/fixing

### Issue: "Database connection timeout"

**Cause:** DATABASE_URL incorrect or database down

**Fix:**
1. Verify DATABASE_URL has correct format:
   ```
   postgresql://postgres:[PASSWORD]@db.[PROJECT_ID].supabase.co:6543/postgres?pgbouncer=true&connection_limit=1
   ```
2. Check Supabase is online: https://supabase.com/dashboard
3. Verify port is **6543** (not 5432)

### Issue: "500 Internal Server Error"

**Cause:** Code error or missing dependency

**Fix:**
1. Check Vercel Runtime Logs for error details
2. Test locally to reproduce
3. Fix the error
4. Redeploy

### Issue: "Build failed"

**Cause:** TypeScript errors or missing dependencies

**Fix:**
1. Run locally: `npm run build`
2. Fix any errors shown
3. Commit and redeploy

---

## Version Control Best Practices

### Commit Messages

Use clear, descriptive commit messages:

```bash
# Good
git commit -m "Fix leaderboard tie-breaking logic"
git commit -m "Add CSV export for creator dashboard"
git commit -m "Update reward tier thresholds"

# Bad
git commit -m "fixes"
git commit -m "update"
git commit -m "changes"
```

### Branching (Optional)

For larger features, consider using branches:

```bash
# Create feature branch
git checkout -b feature/new-analytics-dashboard

# Make changes, test, commit

# Deploy to preview (not production)
vercel

# Get preview URL, test thoroughly

# Merge to master and deploy to production
git checkout master
git merge feature/new-analytics-dashboard
vercel --prod --yes
```

---

## Security Considerations

### Never Commit Secrets

**DON'T:**
```bash
# Bad - exposes secrets
git add .env.local
git commit -m "Add config"
```

**DO:**
```bash
# Good - secrets stay in Vercel
# Update secrets via Vercel dashboard only
```

### Rotate Keys If Exposed

If you accidentally commit a secret:

1. **Immediately rotate** the exposed key
   - Whop API keys: Regenerate in Whop Dashboard
   - Database: Change password in Supabase
   - Security keys: Generate new with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

2. **Update Vercel environment variables**

3. **Redeploy**

4. **Remove from Git history**
   ```bash
   git filter-branch --force --index-filter \
   "git rm --cached --ignore-unmatch .env.local" \
   --prune-empty --tag-name-filter cat -- --all
   ```

---

## Support and Debugging

### Useful Debug Endpoints

```bash
# Health check
curl https://referral-flywheel.vercel.app/api/health

# Environment variable check
curl https://referral-flywheel.vercel.app/api/debug/check-env

# Whop API test
curl "https://referral-flywheel.vercel.app/api/debug/whop-test?companyId=biz_kkGoY7OvzWXRdK"

# Database test
curl https://referral-flywheel.vercel.app/api/debug/db-test
```

### Log Locations

- **Vercel Logs:** https://vercel.com/blackbridges-projects/referral-flywheel/deployments → Runtime Logs
- **Local Logs:** Terminal where `npm run dev` is running
- **Database Logs:** https://supabase.com/dashboard/project/eerhpmjherotaqklpqnc/logs

---

## Quick Command Reference

```bash
# Development
npm run dev                    # Start local dev server
npm run build                  # Test production build
npx tsc --noEmit              # TypeScript check
npx prisma db push            # Update database schema
npx prisma generate           # Regenerate Prisma client
npx prisma studio             # Open database GUI

# Deployment
vercel --prod --yes           # Deploy to production
vercel                        # Deploy to preview
vercel logs                   # View deployment logs

# Git
git status                    # Check changes
git add .                     # Stage all changes
git commit -m "message"       # Commit with message
git push                      # Push to GitHub
git log --oneline            # View commit history

# Testing
curl https://referral-flywheel.vercel.app/api/health
```

---

## Getting Help

- **Vercel Docs:** https://vercel.com/docs
- **Next.js Docs:** https://nextjs.org/docs
- **Whop Developer Docs:** https://dev.whop.com/
- **Prisma Docs:** https://www.prisma.io/docs

---

## Summary

**Deployment is easy:**

1. Make changes locally
2. Test with `npm run dev`
3. Deploy with `vercel --prod --yes`
4. Verify with health check

**Key points:**

- Code updates are instant (no Whop review needed)
- Always test locally first
- Direct Vercel deployment is preferred
- Rollback is quick if needed
- Environment variables only need setting once

**You're ready to iterate and improve your app!**
