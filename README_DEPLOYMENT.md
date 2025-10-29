# Referral Flywheel - Deployment Guide

## 🚀 Quick Deploy to Production

### Prerequisites
- Vercel account
- Supabase account  
- Whop developer account
- Resend account (for emails)

---

## Step 1: Database Setup

### Supabase Setup
```bash
# 1. Create project at supabase.com
# 2. Get your connection string (use pooling port 6543)
# 3. Run migrations

npx prisma db push
```

**Environment Variable:**
```
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:6543/postgres?pgbouncer=true
```

---

## Step 2: Whop Integration

### Create Whop App
1. Go to https://whop.com/dashboard/developer
2. Click "Create App"
3. Set up webhooks:
   - Webhook URL: `https://your-domain.com/api/webhooks/whop`
   - Events: `payment.succeeded`, `membership.deleted`
4. Get your API keys

**Environment Variables:**
```
WHOP_API_KEY=your_api_key
WHOP_WEBHOOK_SECRET=your_webhook_secret
NEXT_PUBLIC_WHOP_APP_ID=app_xxx
NEXT_PUBLIC_WHOP_COMPANY_ID=biz_xxx
```

---

## Step 3: Email Setup (Resend)

### Configure Resend
1. Sign up at resend.com
2. Verify your domain
3. Get API key

**Environment Variable:**
```
RESEND_API_KEY=re_xxx
```

---

## Step 4: Deploy to Vercel

### Deploy Command
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Vercel Environment Variables
Add all env vars from `.env.local` to Vercel dashboard:
- `DATABASE_URL`
- `WHOP_API_KEY`
- `WHOP_WEBHOOK_SECRET`
- `NEXT_PUBLIC_WHOP_APP_ID`
- `NEXT_PUBLIC_WHOP_COMPANY_ID`
- `NEXT_PUBLIC_APP_URL`
- `RESEND_API_KEY`

---

## Step 5: Post-Deployment Checks

### Test Checklist
- [ ] Homepage loads correctly
- [ ] Discover page shows communities
- [ ] Creator dashboard accessible
- [ ] Member dashboard accessible
- [ ] Referral links work
- [ ] Webhooks process correctly
- [ ] Emails send successfully
- [ ] Onboarding wizard functions

### Test URLs
```
https://your-domain.com/
https://your-domain.com/discover
https://your-domain.com/seller-product/biz_xxx
https://your-domain.com/customer/mem_xxx
https://your-domain.com/r/TEST-CODE
```

---

## 🔧 Environment Variables Reference

### Required
| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Supabase connection string | `postgresql://...` |
| `WHOP_API_KEY` | Whop API key | `whop_xxx` |
| `WHOP_WEBHOOK_SECRET` | Webhook verification | `whsec_xxx` |
| `NEXT_PUBLIC_WHOP_APP_ID` | Whop app ID | `app_xxx` |
| `NEXT_PUBLIC_WHOP_COMPANY_ID` | Your company ID | `biz_xxx` |
| `NEXT_PUBLIC_APP_URL` | Production URL | `https://yourdomain.com` |

### Optional
| Variable | Description | Example |
|----------|-------------|---------|
| `RESEND_API_KEY` | Email service (recommended) | `re_xxx` |

---

## 📊 Monitoring

### Key Metrics to Track
1. **Webhook Success Rate** - Should be > 99%
2. **Page Load Times** - Should be < 2 seconds
3. **Error Rate** - Should be < 0.1%
4. **Database Query Performance** - Should be < 200ms

### Monitoring Tools
- Vercel Analytics (built-in)
- Supabase Logs
- Sentry (recommended for error tracking)
- PostHog (recommended for user analytics)

---

## 🔒 Security Checklist

- [ ] All API keys stored as environment variables
- [ ] Webhook signature verification enabled
- [ ] HTTPS enforced
- [ ] Security headers configured (see next.config.js)
- [ ] Rate limiting enabled on sensitive endpoints
- [ ] Database connection uses pooling
- [ ] CORS properly configured

---

## 🐛 Common Deployment Issues

### Issue: Database Connection Failed
**Solution:** Verify DATABASE_URL uses port 6543 with `?pgbouncer=true`

### Issue: Webhooks Not Working
**Solution:** 
1. Verify WHOP_WEBHOOK_SECRET is set
2. Check webhook URL in Whop dashboard
3. Test with Whop webhook tester

### Issue: Build Fails
**Solution:**
```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

### Issue: Environment Variables Not Loading
**Solution:** Restart Vercel deployment after adding env vars

---

## 📈 Scaling Considerations

### < 100 Communities
Current setup handles this easily

### 100-1000 Communities
Consider:
- Redis caching for frequently accessed data
- CDN for static assets
- Database read replicas

### 1000+ Communities
Implement:
- Horizontal scaling with load balancer
- Separate write/read databases
- Background job queue for webhooks
- Full CDN integration

---

## 🔄 Backup Strategy

### Database Backups
Supabase automatically backs up daily. For extra safety:
```bash
# Manual backup
npx prisma db pull
npx prisma db push --preview-feature
```

### Code Backups
- Git repository (primary)
- GitHub (recommended)
- Vercel (automatic deployments)

---

## 📞 Support

### Issues?
1. Check [Troubleshooting Guide](./docs/TROUBLESHOOTING.md)
2. Review Vercel logs
3. Check Supabase logs
4. Contact support@referralflywheel.app

---

*Last Updated: 2025-10-29*
