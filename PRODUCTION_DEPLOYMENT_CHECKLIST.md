# Production Deployment Checklist
**Date**: 2025-10-29
**Project**: Referral Flywheel
**Status**: Ready to Deploy ✅

---

## 📋 Pre-Deployment Checklist

- [x] Build successful (0 errors)
- [x] All changes committed to git
- [x] Vercel CLI installed (v48.6.7)
- [ ] Environment variables documented
- [ ] Deployment plan reviewed

---

## 🔐 Environment Variables for Vercel

### Required Variables

Copy these to Vercel Dashboard (`vercel env add`):

```bash
# Database (Supabase)
DATABASE_URL=postgresql://postgres:[REGENERATE_PASSWORD]@db.eerhpmjherotaqklpqnc.supabase.co:6543/postgres?pgbouncer=true

# Whop Integration (Get from https://whop.com/dashboard/developer)
WHOP_API_KEY=[REGENERATE_IN_WHOP_DASHBOARD]
WHOP_WEBHOOK_SECRET=[REGENERATE_IN_WHOP_DASHBOARD]

# Whop Public IDs (Keep these as is - they're public)
NEXT_PUBLIC_WHOP_APP_ID=app_xa1a8NaAKUVPuO
NEXT_PUBLIC_WHOP_COMPANY_ID=biz_kkGoY7OvzWXRdK
NEXT_PUBLIC_WHOP_AGENT_USER_ID=user_QzqUqxWUTwyHz

# App URL (UPDATE THIS!)
NEXT_PUBLIC_APP_URL=https://your-production-domain.vercel.app

# Security Tokens (Generate new ones with: openssl rand -hex 32)
ADMIN_API_KEY=[GENERATE_NEW_WITH: openssl rand -hex 32]
CRON_SECRET=[GENERATE_NEW_WITH: openssl rand -hex 32]
EXPORT_API_KEY=[GENERATE_NEW_WITH: openssl rand -hex 32]
```

### Optional but Recommended

```bash
# Email Service (Resend) - HIGHLY RECOMMENDED
RESEND_API_KEY=re_XXXXXXXXXXXXXXXXXXXXX
# Get your key from: https://resend.com/api-keys
```

**⚠️ IMPORTANT**: You need to sign up at [resend.com](https://resend.com) and get an API key for email functionality.

---

## 🚀 Deployment Steps

### Step 1: Login to Vercel
```bash
vercel login
```

### Step 2: Deploy to Production
```bash
# First deployment (will prompt for configuration)
vercel --prod

# Or if project already exists
vercel deploy --prod
```

### Step 3: Configure Environment Variables

**Option A: Via Vercel Dashboard**
1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to Settings > Environment Variables
4. Add each variable from the list above
5. Make sure to select "Production" environment

**Option B: Via CLI**
```bash
# Add each variable individually
vercel env add DATABASE_URL production
vercel env add WHOP_API_KEY production
vercel env add WHOP_WEBHOOK_SECRET production
vercel env add NEXT_PUBLIC_WHOP_APP_ID production
vercel env add NEXT_PUBLIC_WHOP_COMPANY_ID production
vercel env add NEXT_PUBLIC_WHOP_AGENT_USER_ID production
vercel env add NEXT_PUBLIC_APP_URL production
vercel env add ADMIN_API_KEY production
vercel env add CRON_SECRET production
vercel env add EXPORT_API_KEY production
vercel env add RESEND_API_KEY production
```

### Step 4: Update NEXT_PUBLIC_APP_URL

After deployment, update the `NEXT_PUBLIC_APP_URL` with your actual production URL:
1. Get your production URL from Vercel (e.g., `https://referral-flywheel.vercel.app`)
2. Update the environment variable in Vercel dashboard
3. Redeploy: `vercel --prod`

---

## 🔗 Whop Configuration

### Update Webhook URL

1. Go to https://whop.com/dashboard/developer
2. Find your app: `app_xa1a8NaAKUVPuO`
3. Update Webhook URL to:
   ```
   https://YOUR-PRODUCTION-DOMAIN.vercel.app/api/webhooks/whop
   ```
4. Ensure these events are enabled:
   - `payment.succeeded`
   - `membership.deleted`
   - `membership.went_valid`

### Update Whop Dashboard View

1. In Whop Dashboard settings
2. Update "Dashboard View URL" to:
   ```
   https://YOUR-PRODUCTION-DOMAIN.vercel.app/seller-product/{experienceId}
   ```

---

## ✅ Post-Deployment Testing Checklist

### Critical Tests (Do these FIRST)

- [ ] **Homepage loads**: `https://your-domain.vercel.app/`
- [ ] **Discover page works**: `https://your-domain.vercel.app/discover`
- [ ] **Health check passes**: `https://your-domain.vercel.app/api/health`
- [ ] **Database connection works**: Check health endpoint response

### Feature Tests

- [ ] **Creator Dashboard**
  - Navigate to `/seller-product/biz_kkGoY7OvzWXRdK`
  - Verify data loads correctly
  - Check if company name is fetched from Whop
  - Test onboarding wizard if first time

- [ ] **Member Dashboard**
  - Create a test member via webhook or direct DB
  - Navigate to `/customer/[memberId]`
  - Verify referral link is generated
  - Test share menu (all 7 platforms)
  - Generate QR code

- [ ] **Referral Link**
  - Copy a referral link
  - Open in incognito mode
  - Verify redirect works
  - Check attribution click is tracked

### Integration Tests

- [ ] **Webhook Processing**
  1. In Whop dashboard, find webhook settings
  2. Use "Test Webhook" feature
  3. Send a `payment.succeeded` event
  4. Check Vercel logs for processing
  5. Verify commission is created in database

- [ ] **Email Sending** (if RESEND_API_KEY is set)
  1. Trigger a welcome message
  2. Check if email is sent
  3. Verify email content is correct
  4. Check spam folder if not in inbox

- [ ] **Social Sharing**
  1. Click each platform share button
  2. Verify correct URL is shared
  3. Check if share tracking works (database)

---

## 📊 Monitoring (First 24 Hours)

### Check Vercel Logs

```bash
# Real-time logs
vercel logs --prod --follow

# Recent logs
vercel logs --prod
```

### Key Metrics to Watch

1. **Error Rate**
   - Go to Vercel Dashboard > Analytics
   - Check for 5xx errors
   - Target: < 0.1%

2. **Response Time**
   - Check Vercel Analytics
   - Target: < 2 seconds for all pages

3. **Webhook Success Rate**
   - Go to `/admin/webhook-monitor`
   - Target: > 99%

4. **Database Connections**
   - Monitor Supabase dashboard
   - Watch for connection pool exhaustion

### Common Issues to Watch For

- [ ] High error rate on webhook endpoint
- [ ] Database connection timeouts
- [ ] Missing environment variables (check logs)
- [ ] CORS errors (should be resolved by middleware)
- [ ] Slow page loads (check bundle size)

---

## 🐛 Troubleshooting

### Issue: Deployment fails

**Solution**:
```bash
# Check build logs
vercel logs --prod

# Common fixes:
# 1. Ensure all environment variables are set
# 2. Check for TypeScript errors
# 3. Verify database is accessible
```

### Issue: Webhooks not processing

**Solution**:
1. Verify `WHOP_WEBHOOK_SECRET` is correct
2. Check webhook URL in Whop dashboard
3. Review Vercel logs for webhook errors
4. Test with Whop's webhook tester

### Issue: Database connection failed

**Solution**:
1. Verify `DATABASE_URL` is correct
2. Ensure port 6543 is used (pooling)
3. Check Supabase project is not paused
4. Test connection with `/api/debug/db-test`

### Issue: Emails not sending

**Solution**:
1. Verify `RESEND_API_KEY` is set
2. Check Resend dashboard for errors
3. Verify domain is verified in Resend
4. Check Vercel logs for email errors

---

## 🔒 Security Checklist

- [x] Security headers configured (next.config.js)
- [x] Rate limiting on sensitive endpoints
- [x] Webhook signature verification enabled
- [x] HTTPS enforced by Vercel
- [ ] Secrets not committed to git
- [ ] Environment variables set in Vercel (not in code)
- [ ] API keys rotated if exposed

---

## 📈 Success Criteria

### Deployment Successful If:

- ✅ All pages load without errors
- ✅ Webhooks process correctly
- ✅ Database queries complete in < 200ms
- ✅ Zero critical errors in logs
- ✅ Email sending works (if configured)
- ✅ Referral tracking works end-to-end

### Expected Performance:

- **Build Time**: ~2-3 minutes
- **Page Load**: < 2 seconds
- **API Response**: < 500ms
- **Webhook Processing**: < 1 second

---

## 📞 Support Resources

- **Deployment Guide**: `README_DEPLOYMENT.md`
- **Troubleshooting**: `docs/TROUBLESHOOTING.md`
- **Creator Guide**: `docs/CREATOR_GUIDE.md`
- **Member Guide**: `docs/MEMBER_GUIDE.md`

---

## 🎯 Next Steps After Deployment

1. **Monitor logs for first hour** - Watch for unexpected errors
2. **Test with real webhook** - Trigger actual payment in Whop
3. **Verify email delivery** - Check spam folder initially
4. **Share with beta testers** - Get real user feedback
5. **Set up monitoring** - Consider Sentry for error tracking
6. **Configure custom domain** - Optional but recommended
7. **Set up analytics** - PostHog or similar

---

## ✅ Deployment Complete Checklist

- [ ] Vercel deployment successful
- [ ] All environment variables configured
- [ ] Production URL updated everywhere
- [ ] Whop webhook URL updated
- [ ] Health check passes
- [ ] Database connection verified
- [ ] Test webhook processed successfully
- [ ] Email sending tested (if configured)
- [ ] Referral link tested end-to-end
- [ ] Logs monitored for 1 hour
- [ ] No critical errors detected

---

**Status**: Ready to Deploy 🚀
**Confidence**: 95%
**Time to Deploy**: ~15-30 minutes

*Generated: 2025-10-29*
*Last Updated: 2025-10-29*
