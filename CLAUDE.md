# Referral Flywheel - Master Context
*Last Updated: 2025-01-27*

## 🎯 Project Mission
Build a viral growth engine for Whop communities. Every member becomes an automatic affiliate earning 10% lifetime commissions. Creators get 70%, platform gets 20%.

## 🏗️ Architecture Overview

### Tech Stack
```yaml
Framework: Next.js 14.0.4 (App Router, React Server Components)
Language: TypeScript 5+ (strict mode)
Styling: Tailwind CSS 3.4+ + shadcn/ui
Database: PostgreSQL 15 (Supabase)
ORM: Prisma 5.7.1
Auth: Whop SDK (messaging temporarily disabled)
Deployment: Vercel
```

### Database Schema (4 Tables)
```prisma
Creator       → Whop community owners, reward settings
Member        → Users with unique referral codes (FIRSTNAME-ABC123)
AttributionClick → 30-day tracking window, fingerprint-based
Commission    → Payment records with 10/70/20 split
```

### Critical Business Rules
**⚠️ NEVER MODIFY THESE:**
- Member commission: 10% (lifetime recurring)
- Creator commission: 70%
- Platform commission: 20%
- Attribution window: 30 days
- Referral code format: FIRSTNAME-ABC123

## ✅ Current State (Production Ready)
- [x] Complete database schema with all 4 tables
- [x] Prisma client configured
- [x] All utility functions (referral code, commission calc, attribution, fingerprint)
- [x] Webhook handler with safety checks for test webhooks
- [x] Referral redirect route with attribution tracking
- [x] API routes (leaderboard, stats, earnings/history)
- [x] Member dashboard with referral links, stats, rewards, leaderboard, earnings chart
- [x] Creator dashboard with analytics and commission tracking
- [x] Discover page with community listings
- [x] shadcn/ui components (button, card, badge, tabs)
- [x] Dashboard components (ReferralLinkCard, StatsGrid, LeaderboardTable, RewardProgress, EarningsChart, EarningsChartWrapper)
- [x] Responsive dark theme design
- [x] Font system (Inter font)
- [x] Layout structure (WhopApp wrapper removed)

## ⚠️ Known Issues
- Whop messaging disabled (logs to console only)
- Database migrations not run yet
- Environment variables need configuration

## 🎯 Next Priorities
1. Run database migrations (`prisma db push`)
2. Configure environment variables
3. Test webhook flow end-to-end
4. Deploy to production

## 📊 Success Metrics
- Revenue Goal: $10k/month (from 20% platform fee)
- Target: 100 communities × 50 members each × 2 referrals = 10,000 referrals
- Average sale: $49.99/month
- Platform revenue: $49.99 × 10,000 × 20% = $99,980/month
- Do not forget we have screenshotting capabilites as noted in @scripts\ui-refinement\ Whenever you nede to double check UI features, use this to double check if a UI is working
- Do not forget we have screenshotting capabilites as noted in scripts\ui-refinement\ Whenever you
 nede to double check UI features, use this to double check if a UI is working
- do not forget to use the conductor agent and other agents in @.claude\agents\ see the conductor and delegate jobs when needed.
- Please use the conductor agent and other agents in @.claude\agents\ and
 delegate jobs when needed.
- Please use the conductor agent and other agents in .claude\agents\ and
  delegate jobs when needed.