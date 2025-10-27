# 🚀 Referral Flywheel - Deployment Guide

## Pre-Production Deployment Setup

### Prerequisites
- Node.js 18+ installed
- Vercel account (free tier works)
- Supabase account for database
- GitHub repository (for CI/CD)
- Whop API credentials

## 📋 Deployment Steps

### 1. Database Setup (Supabase)
```bash
# Create a new Supabase project
# Get your connection string from Supabase dashboard

# Update .env with production database URL
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:6543/postgres?pgbouncer=true

# Run migrations
npx prisma generate
npx prisma db push

# Seed with test data (optional)
npm run db:seed:accurate
```

### 2. Vercel Deployment

#### A. Install Vercel CLI
```bash
npm i -g vercel
```

#### B. Deploy to Vercel
```bash
# Login to Vercel
vercel login

# Deploy (follow prompts)
vercel

# Set environment variables
vercel env add DATABASE_URL
vercel env add WHOP_API_KEY
vercel env add WHOP_WEBHOOK_SECRET
vercel env add NEXT_PUBLIC_WHOP_APP_ID
vercel env add NEXT_PUBLIC_WHOP_COMPANY_ID
vercel env add NEXT_PUBLIC_APP_URL
```

#### C. Production Deployment
```bash
# Deploy to production
vercel --prod
```

### 3. Environment Variables

Required environment variables for production:

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://...` |
| `WHOP_API_KEY` | Whop API key | `wFlUR9...` |
| `WHOP_WEBHOOK_SECRET` | Webhook signature secret | `ws_450...` |
| `NEXT_PUBLIC_WHOP_APP_ID` | Public Whop App ID | `app_xa1...` |
| `NEXT_PUBLIC_WHOP_COMPANY_ID` | Public Company ID | `biz_kkG...` |
| `NEXT_PUBLIC_APP_URL` | Production URL | `https://your-app.vercel.app` |

### 4. GitHub Actions Setup

To enable CI/CD, add these secrets to your GitHub repository:

1. Go to Settings → Secrets → Actions
2. Add the following secrets:
   - `VERCEL_TOKEN` - Get from Vercel account settings
   - `VERCEL_ORG_ID` - Your Vercel organization ID
   - `VERCEL_PROJECT_ID` - Your Vercel project ID
   - `DATABASE_URL` - Production database URL
   - `NEXT_PUBLIC_APP_URL` - Production app URL

### 5. Testing Production

After deployment, test these critical paths:

#### Member Dashboard
```
https://your-app.vercel.app/customer/[membershipId]
```
- [ ] Stats display correctly
- [ ] Earnings chart loads
- [ ] Leaderboards show data
- [ ] Referral link works

#### Creator Dashboard
```
https://your-app.vercel.app/seller-product/[productId]
```
- [ ] Revenue metrics accurate
- [ ] Community stats display
- [ ] Reward management works
- [ ] Custom rewards save

#### Referral Flow
```
https://your-app.vercel.app/r/[referralCode]
```
- [ ] Redirects properly
- [ ] Sets attribution cookie
- [ ] Tracks for 30 days

#### API Endpoints
- [ ] `/api/webhooks/whop` - Webhook processing
- [ ] `/api/leaderboard` - Rankings data
- [ ] `/api/earnings/history` - Earnings chart data

### 6. Monitoring & Maintenance

#### Health Checks
- Monitor API response times
- Check database connection pool
- Verify webhook processing

#### Performance Optimization
- Enable Vercel Analytics
- Set up error tracking (Sentry)
- Configure rate limiting

#### Database Maintenance
```bash
# Regular backups
pg_dump $DATABASE_URL > backup.sql

# Update indexes periodically
npx prisma db push

# Clean old attribution data (>30 days)
```

## 🧪 Testing Commands

### Local Testing
```bash
# Run all tests
npm test

# Run specific test suite
npm run test:member
npm run test:creator
npm run test:referral
npm run test:leaderboard

# Interactive test UI
npm run test:ui

# Debug mode
npm run test:debug
```

### Seed Data Options
```bash
# Fast seed (for quick testing)
npm run db:seed:fast

# Accurate seed (mathematically correct)
npm run db:seed:accurate

# Original seed
npm run db:seed
```

## 📊 Production Readiness Checklist

### Security
- [x] Environment variables secured
- [x] Database connection pooled
- [x] Webhook signature validation
- [x] CORS headers configured
- [x] Rate limiting ready (optional)

### Performance
- [x] Database indexes created
- [x] API response caching
- [x] Image optimization
- [x] Bundle size optimized

### Monitoring
- [ ] Error tracking setup
- [ ] Analytics configured
- [ ] Uptime monitoring
- [ ] Database monitoring

### Testing
- [x] Unit tests passing
- [x] E2E tests passing
- [x] Load testing completed
- [x] Mobile responsive verified

## 🔧 Troubleshooting

### Common Issues

#### Database Connection Errors
```bash
# Check connection string
vercel env pull
# Verify DATABASE_URL format
```

#### Build Failures
```bash
# Clear cache and rebuild
vercel build --force
rm -rf .next
npm run build
```

#### Webhook Issues
```bash
# Test webhook locally
curl -X POST http://localhost:3000/api/webhooks/whop \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

## 📞 Support

For deployment issues:
1. Check Vercel logs: `vercel logs`
2. Review GitHub Actions tab
3. Check Supabase dashboard for database issues
4. Contact support with deployment ID

## 🎉 Success Metrics

After successful deployment, you should see:
- ✅ 0 build errors
- ✅ All tests passing (25+ test cases)
- ✅ < 3s page load time
- ✅ 100% uptime
- ✅ Successful webhook processing
- ✅ Accurate commission calculations

---

**Last Updated**: October 2024
**Version**: 1.0.0
**Status**: Production Ready