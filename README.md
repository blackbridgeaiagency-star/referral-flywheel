# Referral Flywheel

A production-ready Whop marketplace app that automatically converts every paying member into an affiliate with lifetime commissions.

## 🚀 Features

- **10% Lifetime Commissions**: Members earn 10% on every referral, forever
- **Automatic Attribution**: 30-day cookie tracking with database fallback
- **Gamification**: Leaderboards, reward tiers, and milestone tracking
- **Real-time Stats**: Live earnings and referral tracking
- **Creator Dashboard**: Manage communities and track performance
- **Mobile Responsive**: Works perfectly on all devices

## 💰 Commission Structure

**FIXED RATES (Cannot be changed):**
- Member (Referrer): 10% lifetime recurring
- Creator: 70% 
- Platform: 20%

## 🛠 Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **UI**: shadcn/ui components
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Whop SDK
- **Deployment**: Vercel

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Setup database:**
   ```bash
   pnpm db:generate
   pnpm db:push
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your values
   ```

4. **Start development:**
   ```bash
   pnpm dev
   ```

## 📁 Project Structure

```
├── app/
│   ├── api/webhooks/whop/     # Webhook handlers
│   ├── customer/[id]/         # Member dashboard
│   ├── seller-product/[id]/   # Creator dashboard
│   └── discover/              # Public marketplace
├── components/
│   ├── ui/                    # shadcn/ui components
│   └── dashboard/             # Dashboard widgets
├── lib/
│   ├── db/                    # Database client
│   ├── utils/                 # Utility functions
│   └── whop/                  # Whop API integration
└── prisma/
    └── schema.prisma          # Database schema
```

## 🔧 Configuration

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://..."

# Whop API
WHOP_API_KEY="..."
WHOP_WEBHOOK_SECRET="..."
NEXT_PUBLIC_WHOP_APP_ID="..."

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Database Schema

The app uses a comprehensive schema with:
- **Creator**: Community owners and settings
- **Member**: Users with referral links
- **Commission**: Payment tracking (10/70/20 split)
- **AttributionClick**: 30-day tracking window

## 🎯 Key Features

### Attribution System
- Cookie-based tracking (30 days)
- Database fingerprint fallback
- GDPR-compliant hashing
- Duplicate click prevention

### Commission Processing
- Automatic webhook handling
- Real-time payment processing
- Recurring payment support
- Commission calculation (10/70/20)

### Member Experience
- Personalized referral links
- Real-time earnings tracking
- Leaderboard rankings
- Reward milestone progress
- Social sharing tools

### Creator Tools
- Community management
- Performance analytics
- Commission tracking
- Reward customization

## 🚀 Deployment

1. **Database Setup:**
   - Create PostgreSQL database (Supabase recommended)
   - Run migrations: `pnpm db:push`

2. **Environment Variables:**
   - Set all required environment variables
   - Configure Whop webhook URL

3. **Deploy to Vercel:**
   ```bash
   vercel --prod
   ```

## 🧪 Testing

Test the complete flow:

1. ✅ Webhook endpoint responds
2. ✅ Member creation with referral code
3. ✅ Welcome message sent
4. ✅ Referral link redirects correctly
5. ✅ Attribution cookie set
6. ✅ Commission calculated correctly
7. ✅ Dashboard loads with data
8. ✅ Leaderboard shows rankings

## 📊 Business Model

- **Free app** for users
- **20% platform fee** on all referred sales
- **Goal**: $10k/month profit from $50k referred sales
- **Scalable**: Works with any Whop community

## 🔒 Security

- HTTPS-only in production
- HttpOnly cookies
- GDPR-safe fingerprinting
- Webhook signature validation
- Input validation on all endpoints

## 📈 Performance

- Optimized database queries
- Indexed fields for fast lookups
- Cached leaderboard data
- Mobile-first responsive design
- Edge runtime deployment

## 🤝 Support

For issues or questions:
1. Check the logs for error messages
2. Verify webhook configuration
3. Test database connectivity
4. Review environment variables

---

**Built with ❤️ for the Whop ecosystem**