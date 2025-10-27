markdown# REFERRAL FLYWHEEL - COMPLETE BUILD SPECIFICATION

You are building a production-ready Whop marketplace app. This is a COMPLETE specification with ALL requirements. Follow it exactly.

═══════════════════════════════════════════════════════════════════════════════
PROJECT OVERVIEW
═══════════════════════════════════════════════════════════════════════════════

NAME: Referral Flywheel
PURPOSE: Automatically convert every paying member into an affiliate with lifetime commissions
MONETIZATION: Free app, revenue from 20% platform fee on referred sales
GOAL: Generate $10k/month profit from $50k in referred sales

EXISTING SETUP:
✅ Project folder: referral-flywheel
✅ Next.js 14 initialized with App Router
✅ Whop SDK installed (@whop/sdk)
✅ Environment variables configured
⏳ Need: Database setup (Prisma + PostgreSQL)
⏳ Need: All application code

═══════════════════════════════════════════════════════════════════════════════
🔴 CRITICAL: COMMISSION STRUCTURE (NEVER CHANGE)
═══════════════════════════════════════════════════════════════════════════════

THIS IS THE CORE BUSINESS MODEL. DO NOT MODIFY THESE PERCENTAGES.

For EVERY referred sale (initial + all recurring payments):
┌─────────────────────────────────────────────┐
│ Member (referrer):  10% (lifetime recurring)│
│ Creator:            70%                      │
│ Platform:           20%                      │
└─────────────────────────────────────────────┘

EXAMPLE: $49.99/month subscription
├─ Member earns:   $4.99/month (forever)
├─ Creator keeps:  $34.99/month
└─ Platform gets:  $9.99/month

EXAMPLE: 100 referrals at $49.99/month
├─ Member earns:   $499/month passive income
├─ Creator keeps:  $3,499/month
└─ Platform gets:  $999/month

═══════════════════════════════════════════════════════════════════════════════
TECH STACK
═══════════════════════════════════════════════════════════════════════════════

Frontend:       Next.js 14.2+ (App Router, React Server Components)
Language:       TypeScript 5+ (strict mode enabled)
Styling:        Tailwind CSS 3.4+
UI Components:  shadcn/ui (Radix UI primitives)
Database:       PostgreSQL 15+ (via Supabase)
ORM:            Prisma 5+
Authentication: Whop SDK (@whop/sdk)
Deployment:     Vercel (Edge Runtime)
Webhooks:       Whop webhook system (signature validation)

═══════════════════════════════════════════════════════════════════════════════
DATABASE SCHEMA (prisma/schema.prisma)
═══════════════════════════════════════════════════════════════════════════════

Create this EXACT schema:
```prisma
// prisma/schema.prisma

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
  previewFeatures = ["fullTextSearch"]
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CREATOR MODEL (Whop community owners)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
model Creator {
  id              String    @id @default(cuid())
  companyId       String    @unique        // Whop company ID
  companyName     String
  productId       String                   // Whop product ID
  
  // COMMISSION RATES (LOCKED - NEVER ALLOW CHANGES)
  memberRate      Float     @default(10)   // 10% to members
  creatorRate     Float     @default(70)   // 70% to creator
  platformRate    Float     @default(20)   // 20% to platform
  
  // REWARD TIERS (Customizable by creator)
  tier1Count      Int       @default(5)
  tier1Reward     String    @default("1 month free")
  tier2Count      Int       @default(10)
  tier2Reward     String    @default("3 months free")
  tier3Count      Int       @default(25)
  tier3Reward     String    @default("6 months free")
  tier4Count      Int       @default(100)
  tier4Reward     String    @default("Lifetime access")
  
  // SETTINGS
  autoApproveRewards Boolean @default(true)
  welcomeMessage  String?                  // Custom welcome message
  isActive        Boolean   @default(true)
  
  // CACHED STATS (Updated via webhook)
  totalReferrals  Int       @default(0)
  totalRevenue    Float     @default(0)
  monthlyRevenue  Float     @default(0)
  
  // RELATIONS
  members         Member[]
  commissions     Commission[]
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@index([companyId])
  @@index([productId])
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MEMBER MODEL (Customers with referral links)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
model Member {
  id              String    @id @default(cuid())
  
  // WHOP IDENTIFIERS
  userId          String    @unique        // Whop user ID
  membershipId    String    @unique        // Whop membership ID
  email           String
  username        String
  
  // REFERRAL SYSTEM
  referralCode    String    @unique        // Format: FIRSTNAME-ABC123
  referredBy      String?                  // Referrer's code (nullable if organic)
  
  // EARNINGS (10% lifetime recurring)
  lifetimeEarnings Float    @default(0)    // Total all-time earnings
  monthlyEarnings  Float    @default(0)    // Current month earnings
  totalReferred    Int      @default(0)    // Lifetime referral count
  monthlyReferred  Int      @default(0)    // Current month referrals
  
  // LEADERBOARD RANKINGS (Cached, updated hourly)
  globalEarningsRank  Int?                 // Rank by $$ earned globally
  globalReferralsRank Int?                 // Rank by # referred globally
  communityRank       Int?                 // Rank within creator's community
  
  // GAMIFICATION
  currentTier     String    @default("bronze")
  rewardsClaimed  Json      @default("[]") // Array of claimed rewards
  nextMilestone   Int?                     // Next reward threshold
  
  // METADATA
  welcomeMessageSent Boolean @default(false)
  lastActive      DateTime?
  
  // RELATIONS
  creatorId       String
  creator         Creator   @relation(fields: [creatorId], references: [id], onDelete: Cascade)
  
  referrer        Member?   @relation("Referrals", fields: [referredBy], references: [referralCode])
  referrals       Member[]  @relation("Referrals")
  
  commissions     Commission[]
  attributions    AttributionClick[]
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@index([userId])
  @@index([referralCode])
  @@index([referredBy])
  @@index([creatorId])
  @@index([globalEarningsRank])
  @@index([globalReferralsRank])
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ATTRIBUTION CLICK (30-day tracking window)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
model AttributionClick {
  id              String    @id @default(cuid())
  referralCode    String
  
  // VISITOR FINGERPRINTING (GDPR-safe)
  fingerprint     String                   // Hashed browser signature
  ipHash          String                   // SHA-256 hashed IP
  userAgent       String?
  
  // CONVERSION TRACKING
  converted       Boolean   @default(false)
  conversionValue Float?                   // Sale amount if converted
  convertedAt     DateTime?
  
  // EXPIRY (30 days from click)
  expiresAt       DateTime
  
  // RELATIONS
  memberId        String
  member          Member    @relation(fields: [memberId], references: [id], onDelete: Cascade)
  
  commissionId    String?   @unique
  commission      Commission? @relation(fields: [commissionId], references: [id])
  
  createdAt       DateTime  @default(now())
  
  @@index([referralCode, fingerprint])
  @@index([expiresAt])
  @@index([converted])
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMMISSION (10% / 70% / 20% split records)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
model Commission {
  id              String    @id @default(cuid())
  
  // PAYMENT DETAILS
  whopPaymentId   String    @unique        // Whop payment ID
  whopMembershipId String                  // Associated membership
  saleAmount      Float                    // Total sale amount (e.g., $49.99)
  
  // CALCULATED SPLITS
  memberShare     Float                    // 10% to referrer
  creatorShare    Float                    // 70% to creator
  platformShare   Float                    // 20% to platform
  
  // PAYMENT TYPE
  paymentType     String                   // "initial" | "recurring"
  subscriptionId  String?                  // If recurring
  
  // STATUS TRACKING
  status          String    @default("pending")  // pending | paid | failed
  paidAt          DateTime?
  failureReason   String?
  
  // RELATIONS
  memberId        String
  member          Member    @relation(fields: [memberId], references: [id], onDelete: Cascade)
  
  creatorId       String
  creator         Creator   @relation(fields: [creatorId], references: [id], onDelete: Cascade)
  
  attributionClick AttributionClick?
  
  createdAt       DateTime  @default(now())
  
  @@index([memberId])
  @@index([creatorId])
  @@index([status])
  @@index([paymentType])
  @@index([createdAt])
}
```

═══════════════════════════════════════════════════════════════════════════════
FILE GENERATION ORDER
═══════════════════════════════════════════════════════════════════════════════

Generate files in this EXACT order. Each file must be complete with no placeholders.

PHASE 1: DATABASE & UTILITIES (Foundation)
1. prisma/schema.prisma                     ← Database schema (above)
2. lib/db/prisma.ts                         ← Prisma client singleton
3. lib/utils/referral-code.ts               ← Generate FIRSTNAME-ABC123 codes
4. lib/utils/commission.ts                  ← Calculate 10/70/20 splits
5. lib/utils/attribution.ts                 ← Check cookies + database
6. lib/utils/fingerprint.ts                 ← Generate visitor fingerprints
7. lib/whop/messaging.ts                    ← Send welcome DMs via Whop API

PHASE 2: API ROUTES (Backend Logic)
8. app/api/webhooks/whop/route.ts           ← Payment webhook handler
9. app/r/[code]/route.ts                    ← Referral link redirect
10. app/api/leaderboard/route.ts            ← Leaderboard rankings API
11. app/api/referrals/stats/route.ts        ← Member stats API

PHASE 3: UI COMPONENTS (Reusable Pieces)
12. components/ui/button.tsx                ← shadcn button
13. components/ui/card.tsx                  ← shadcn card
14. components/ui/badge.tsx                 ← shadcn badge
15. components/ui/tabs.tsx                  ← shadcn tabs
16. components/dashboard/ReferralLinkCard.tsx   ← Copy/share widget
17. components/dashboard/StatsGrid.tsx          ← Earnings display
18. components/dashboard/LeaderboardTable.tsx   ← Rankings table
19. components/dashboard/RewardProgress.tsx     ← Milestone tracker

PHASE 4: PAGES (User-Facing Views)
20. app/customer/[experienceId]/page.tsx    ← Member dashboard
21. app/seller-product/[experienceId]/page.tsx ← Creator dashboard
22. app/discover/page.tsx                   ← Public marketplace listing

PHASE 5: CONFIGURATION
23. tailwind.config.ts                      ← Tailwind + design tokens
24. components.json                         ← shadcn/ui config

═══════════════════════════════════════════════════════════════════════════════
DETAILED IMPLEMENTATION REQUIREMENTS
═══════════════════════════════════════════════════════════════════════════════

────────────────────────────────────────────────────────────────────────────────
FILE 2: lib/db/prisma.ts
────────────────────────────────────────────────────────────────────────────────
```typescript
// lib/db/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

────────────────────────────────────────────────────────────────────────────────
FILE 3: lib/utils/referral-code.ts
────────────────────────────────────────────────────────────────────────────────
```typescript
// lib/utils/referral-code.ts

/**
 * Generate unique referral code in format: FIRSTNAME-ABC123
 * Example: MIKE-A2X9K7
 */
export function generateReferralCode(name: string): string {
  // Extract first name (everything before space or @)
  const firstName = name
    .split(/[\s@]/)[0]
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 10);
  
  // Generate random alphanumeric suffix
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude ambiguous chars
  const suffix = Array.from({ length: 6 }, () => 
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
  
  return `${firstName || 'USER'}-${suffix}`;
}

/**
 * Validate referral code format
 */
export function isValidReferralCode(code: string): boolean {
  return /^[A-Z]+-[A-Z0-9]{6}$/.test(code);
}
```

────────────────────────────────────────────────────────────────────────────────
FILE 4: lib/utils/commission.ts
────────────────────────────────────────────────────────────────────────────────
```typescript
// lib/utils/commission.ts

/**
 * Calculate commission splits: 10% member, 70% creator, 20% platform
 */
export function calculateCommission(saleAmount: number) {
  const memberShare = Number((saleAmount * 0.10).toFixed(2));   // 10%
  const creatorShare = Number((saleAmount * 0.70).toFixed(2));  // 70%
  const platformShare = Number((saleAmount * 0.20).toFixed(2)); // 20%
  
  return {
    memberShare,
    creatorShare,
    platformShare,
    total: memberShare + creatorShare + platformShare,
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}
```

────────────────────────────────────────────────────────────────────────────────
FILE 5: lib/utils/attribution.ts
────────────────────────────────────────────────────────────────────────────────
```typescript
// lib/utils/attribution.ts
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db/prisma';

/**
 * Check for attribution via cookie or database lookup
 * Returns the referral code if found within 30-day window
 */
export async function checkAttribution(
  request: Request,
  userId: string
): Promise {
  // 1. Check cookie first (primary method)
  const cookieStore = cookies();
  const refCodeCookie = cookieStore.get('ref_code');
  
  if (refCodeCookie?.value) {
    // Validate the click is still within 30 days
    const click = await prisma.attributionClick.findFirst({
      where: {
        referralCode: refCodeCookie.value,
        expiresAt: { gte: new Date() },
        converted: false,
      },
      orderBy: { createdAt: 'desc' },
    });
    
    if (click) {
      return { referralCode: click.referralCode, id: click.id };
    }
  }
  
  // 2. Fallback: Check database by fingerprint (if cookie was cleared)
  const fingerprint = await import('./fingerprint').then(m => 
    m.generateFingerprint(request)
  );
  
  const click = await prisma.attributionClick.findFirst({
    where: {
      fingerprint,
      expiresAt: { gte: new Date() },
      converted: false,
    },
    orderBy: { createdAt: 'desc' },
  });
  
  if (click) {
    return { referralCode: click.referralCode, id: click.id };
  }
  
  return null;
}
```

────────────────────────────────────────────────────────────────────────────────
FILE 6: lib/utils/fingerprint.ts
────────────────────────────────────────────────────────────────────────────────
```typescript
// lib/utils/fingerprint.ts
import crypto from 'crypto';

/**
 * Generate visitor fingerprint (GDPR-safe, no PII)
 * Combines user agent + IP hash for uniqueness
 */
export async function generateFingerprint(request: Request): Promise {
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             'unknown';
  
  const data = `${userAgent}|${ip}`;
  
  return crypto
    .createHash('sha256')
    .update(data)
    .digest('hex')
    .slice(0, 32);
}

/**
 * Hash IP address for GDPR compliance
 */
export function hashIP(ip: string): string {
  return crypto
    .createHash('sha256')
    .update(ip)
    .digest('hex');
}
```

────────────────────────────────────────────────────────────────────────────────
FILE 7: lib/whop/messaging.ts
────────────────────────────────────────────────────────────────────────────────
```typescript
// lib/whop/messaging.ts
import { WhopAPI } from '@whop/sdk';

const whop = new WhopAPI(process.env.WHOP_API_KEY!);

/**
 * Send welcome message with referral link via Whop DM
 */
export async function sendWelcomeMessage(
  member: {
    userId: string;
    username: string;
    referralCode: string;
  },
  creator: {
    companyName: string;
    tier1Count: number;
    tier1Reward: string;
    tier2Count: number;
    tier2Reward: string;
    tier3Count: number;
    tier3Reward: string;
    tier4Count: number;
    tier4Reward: string;
  }
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.example.com';
  const referralLink = `${appUrl}/r/${member.referralCode}`;
  
  const message = `🎉 Welcome to ${creator.companyName}!

💰 EARN MONEY BY SHARING
You have a unique referral link that pays you 10% LIFETIME commission on every person you refer.

Your link: ${referralLink}

How it works:
→ Share your link with friends
→ They join and pay monthly
→ You earn 10% of their payment EVERY month they stay
→ Refer 100 people = $499/month passive income

🏆 LEADERBOARD REWARDS
Compete with other members and unlock exclusive rewards:
- ${creator.tier1Count} referrals: ${creator.tier1Reward}
- ${creator.tier2Count} referrals: ${creator.tier2Reward}
- ${creator.tier3Count} referrals: ${creator.tier3Reward}
- ${creator.tier4Count} referrals: ${creator.tier4Reward}

Ready to start earning? View your dashboard to get started!`;

  try {
    await whop.messages.send({
      user_id: member.userId,
      content: message,
    });
    
    console.log(`✅ Welcome message sent to ${member.username}`);
  } catch (error) {
    console.error('❌ Failed to send welcome message:', error);
  }
}
```

────────────────────────────────────────────────────────────────────────────────
FILE 8: app/api/webhooks/whop/route.ts (CRITICAL FILE)
────────────────────────────────────────────────────────────────────────────────
```typescript
// app/api/webhooks/whop/route.ts
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db/prisma';
import { generateReferralCode } from '@/lib/utils/referral-code';
import { calculateCommission } from '@/lib/utils/commission';
import { checkAttribution } from '@/lib/utils/attribution';
import { sendWelcomeMessage } from '@/lib/whop/messaging';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 1. VALIDATE WEBHOOK SIGNATURE
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const body = await request.text();
    const signature = request.headers.get('whop-signature');
    const secret = process.env.WHOP_WEBHOOK_SECRET!;
    
    // Only validate signature if present (test webhooks may not have it)
    if (signature) {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex');
      
      if (signature !== expectedSignature) {
        console.error('❌ Invalid webhook signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    } else {
      console.log('⚠️  No signature (test webhook)');
    }
    
    const payload = JSON.parse(body);
    console.log('📦 Webhook received:', payload.action);
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 2. HANDLE PAYMENT SUCCESS EVENT
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (payload.action === 'app_payment.succeeded') {
      const { data } = payload;
      
      // Check if member already exists
      const existingMember = await prisma.member.findUnique({
        where: { membershipId: data.membership_id }
      });
      
      if (existingMember) {
        // Handle recurring payment for existing member
        console.log('💳 Recurring payment for:', existingMember.username);
        await handleRecurringPayment(existingMember, data);
        return NextResponse.json({ ok: true });
      }
      
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 3. CHECK FOR ATTRIBUTION (Cookie or Database)
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      const attribution = await checkAttribution(request, data.user_id);
      
      if (attribution) {
        console.log('🎯 Attribution found:', attribution.referralCode);
      } else {
        console.log('🔗 Organic signup (no referral)');
      }
      
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 4. CREATE NEW MEMBER
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      const referralCode = generateReferralCode(
        data.username || data.email.split('@')[0]
      );
      
      // Get or create creator
      let creator = await prisma.creator.findUnique({
        where: { companyId: data.company_id }
      });
      
      if (!creator) {
        creator = await prisma.creator.create({
          data: {
            companyId: data.company_id,
            companyName: data.company_name || 'Community',
            productId: data.product_id,
          }
        });
      }
      
      const member = await prisma.member.create({
        data: {
          userId: data.user_id,
          membershipId: data.membership_id,
          email: data.email,
          username: data.username || data.email.split('@')[0],
          referralCode,
          referredBy: attribution?.referralCode || null,
          creatorId: creator.id,
        },
      });
      
      console.log('✅ Member created:', member.referralCode);
      
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 5. PROCESS COMMISSION IF REFERRED
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      if (attribution) {
        await processCommission({
          referrerCode: attribution.referralCode,
          saleAmount: data.final_amount / 100, // Convert cents to dollars
          paymentId: data.id,
          membershipId: data.membership_id,
          creatorId: creator.id,
          attributionId: attribution.id,
        });
      }
      
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 6. SEND WELCOME MESSAGE
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      await sendWelcomeMessage(member, creator);
      
      // Mark welcome message as sent
      await prisma.member.update({
        where: { id: member.id },
        data: { welcomeMessageSent: true }
      });
    }
    
    return NextResponse.json({ ok: true });
    
  } catch (error) {
    console.error('❌ Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPER: Process commission (10/70/20 split)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function processCommission({
  referrerCode,
  saleAmount,
  paymentId,
  membershipId,
  creatorId,
  attributionId,
}: {
  referrerCode: string;
  saleAmount: number;
  paymentId: string;
  membershipId: string;
  creatorId: string;
  attributionId: string;
}) {
  // Find referrer
  const referrer = await prisma.member.findUnique({
    where: { referralCode: referrerCode }
  });
  
  if (!referrer) {
    console.error('❌ Referrer not found:', referrerCode);
    return;
  }
  
  // Calculate splits (10/70/20)
  const { memberShare, creatorShare, platformShare } = calculateCommission(saleAmount);
  
  // Create commission record
  await prisma.commission.create({
    data: {
      whopPaymentId: paymentId,
      whopMembershipId: membershipId,
      saleAmount,
      memberShare,
      creatorShare,
      platformShare,
      paymentType: 'initial',
      status: 'paid',
      paidAt: new Date(),
      memberId: referrer.id,
      creatorId,
      attributionClick: {
        connect: { id: attributionId }
      }
    }
  });
  
  // Update referrer stats
  await prisma.member.update({
    where: { id: referrer.id },
    data: {
      lifetimeEarnings: { increment: memberShare },
      monthlyEarnings: { increment: memberShare },
      totalReferred: { increment: 1 },
      monthlyReferred: { increment: 1 },
    }
  });
  
  // Mark attribution as converted
  await prisma.attributionClick.update({
    where: { id: attributionId },
    data: {
      converted: true,
      conversionValue: saleAmount,
      convertedAt: new Date(),
    }
  });
  
  console.log(`💰 Commission processed: $${memberShare} → ${referrerCode}`);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPER: Handle recurring payment
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function handleRecurringPayment(member: any, data: any) {
  // If this member was referred, credit their referrer
  if (member.referredBy) {
    const referrer = await prisma.member.findUnique({
      where: { referralCode: member.referredBy }
    });
    
    if (referrer) {
      const saleAmount = data.final_amount / 100;
      const { memberShare, creatorShare, platformShare } = calculateCommission(saleAmount);
      
      // Create recurring commission
      await prisma.commission.create({
        data: {
          whopPaymentId: data.id,
          whopMembershipId: data.membership_id,
          saleAmount,
          memberShare,
          creatorShare,
          platformShare,
          paymentType: 'recurring',
          status: 'paid',
          paidAt: new Date(),
          memberId: referrer.id,
          creatorId: member.creatorId,
        }
      });
      
      // Update referrer earnings
      await prisma.member.update({
        where: { id: referrer.id },
        data: {
          lifetimeEarnings: { increment: memberShare },
          monthlyEarnings: { increment: memberShare },
        }
      });
      
      console.log(`💰 Recurring commission: $${memberShare} → ${referrer.referralCode}`);
    }
  }
}

// GET endpoint for testing
export async function GET() {
  return NextResponse.json({ 
    ok: true, 
    message: 'Webhook endpoint is alive',
    timestamp: new Date().toISOString()
  });
}
```

────────────────────────────────────────────────────────────────────────────────
FILE 9: app/r/[code]/route.ts
────────────────────────────────────────────────────────────────────────────────
```typescript
// app/r/[code]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { generateFingerprint, hashIP } from '@/lib/utils/fingerprint';

export async function GET(
  request: Request,
  { params }: { params: { code: string } }
) {
  const { code } = params;
  
  try {
    // 1. Validate referral code exists
    const member = await prisma.member.findUnique({
      where: { referralCode: code },
      include: { creator: true }
    });
    
    if (!member) {
      console.log('❌ Invalid referral code:', code);
      return NextResponse.redirect(process.env.NEXT_PUBLIC_APP_URL + '/discover');
    }
    
    // 2. Generate visitor fingerprint
    const fingerprint = await generateFingerprint(request);
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    const ipHash = hashIP(ip);
    
    // 3. Check if this visitor already clicked (prevent duplicates)
    const existingClick = await prisma.attributionClick.findFirst({
      where: {
        referralCode: code,
        fingerprint,
        expiresAt: { gte: new Date() }
      }
    });
    
    if (!existingClick) {
      // Record new attribution click
      await prisma.attributionClick.create({
        data: {
          referralCode: code,
          memberId: member.id,
          fingerprint,
          ipHash,
          userAgent: request.headers.get('user-agent') || '',
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        }
      });
      
      console.log('✅ Attribution click recorded:', code);
    } else {
      console.log('ℹ️  Duplicate click (already tracked)');
    }
    
    // 4. Set attribution cookie (30 days)
    const productUrl = `https://whop.com/${member.creator.companyId}`;
    const response = NextResponse.redirect(productUrl);
    
    response.cookies.set('ref_code', code, {
      maxAge: 30 * 24 * 60 * 60, // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });
    
    return response;
    
  } catch (error) {
    console.error('❌ Referral tracking error:', error);
    return NextResponse.redirect(process.env.NEXT_PUBLIC_APP_URL + '/discover');
  }
}
```

────────────────────────────────────────────────────────────────────────────────
FILE 10: app/api/leaderboard/route.ts
────────────────────────────────────────────────────────────────────────────────
```typescript
// app/api/leaderboard/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'earnings'; // earnings | referrals
  const scope = searchParams.get('scope') || 'global'; // global | community
  const creatorId = searchParams.get('creatorId');
  const limit = parseInt(searchParams.get('limit') || '10');
  
  try {
    const orderBy = type === 'earnings' 
      ? { lifetimeEarnings: 'desc' as const }
      : { totalReferred: 'desc' as const };
    
    const where = scope === 'community' && creatorId
      ? { creatorId }
      : {};
    
    const leaderboard = await prisma.member.findMany({
      where,
      orderBy,
      take: limit,
      select: {
        id: true,
        username: true,
        referralCode: true,
        lifetimeEarnings: true,
        monthlyEarnings: true,
        totalReferred: true,
        monthlyReferred: true,
        globalEarningsRank: true,
        globalReferralsRank: true,
        communityRank: true,
      }
    });
    
    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error('❌ Leaderboard error:', error);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}
```

═══════════════════════════════════════════════════════════════════════════════
DESIGN SYSTEM & UI COMPONENTS
═══════════════════════════════════════════════════════════════════════════════

COLORS (Dark Theme):
- Background:   #0F0F0F (near black)
- Card:         #1A1A1A (dark gray)
- Border:       #2A2A2A (lighter gray)
- Primary:      #8B5CF6 (purple-600)
- Secondary:    #6366F1 (indigo-600)
- Success:      #10B981 (green-500)
- Warning:      #F59E0B (amber-500)
- Danger:       #EF4444 (red-500)
- Text:         #FFFFFF (white)
- Text Muted:   #9CA3AF (gray-400)

TYPOGRAPHY:
- Font Family: system-ui, -apple-system, sans-serif
- Headings: font-bold
- Body: font-normal
- Code: font-mono

SPACING SCALE:
- xs:  4px
- sm:  8px
- md:  16px
- lg:  24px
- xl:  32px
- 2xl: 48px

────────────────────────────────────────────────────────────────────────────────
FILE 16: components/dashboard/ReferralLinkCard.tsx
────────────────────────────────────────────────────────────────────────────────
```typescript
'use client';

import { useState } from 'react';
import { Copy, Check, Twitter, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ReferralLinkCardProps {
  code: string;
  url: string;
}

export function ReferralLinkCard({ code, url }: ReferralLinkCardProps) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const shareToTwitter = () => {
    const text = encodeURIComponent(
      `Just joined an amazing community! Join me and start earning 👇\n${url}`
    );
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
  };
  
  return (
    
      
        {/* Header */}
        
          
            💰 Your Referral Link
          
          
            Share this link and earn 10% on every sale, forever
          
        
        
        {/* Link Display */}
        
          
            {url}
          
          
            {copied ? (
              
            ) : (
              
            )}
          
        
        
        {/* Share Buttons */}
        
          
            
            {copied ? 'Copied!' : 'Copy Link'}
          
          
            
          
        
      
    
  );
}
```

────────────────────────────────────────────────────────────────────────────────
FILE 20: app/customer/[experienceId]/page.tsx
────────────────────────────────────────────────────────────────────────────────
```typescript
// app/customer/[experienceId]/page.tsx
import { prisma } from '@/lib/db/prisma';
import { ReferralLinkCard } from '@/components/dashboard/ReferralLinkCard';
import { formatCurrency } from '@/lib/utils/commission';
import { notFound } from 'next/navigation';

export default async function MemberDashboard({
  params
}: {
  params: { experienceId: string }
}) {
  // Fetch member data
  const member = await prisma.member.findUnique({
    where: { membershipId: params.experienceId },
    include: {
      creator: true,
      referrals: {
        select: {
          username: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      }
    }
  });
  
  if (!member) {
    notFound();
  }
  
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const referralUrl = `${appUrl}/r/${member.referralCode}`;
  
  return (
    
      {/* Header */}
      
        
          
            Welcome to {member.creator.companyName}
          
          
            Earn 10% lifetime commission on every referral
          
        
      
      
      
        {/* Referral Link Card */}
        
        
        {/* Stats Grid */}
        
          
          
          
          <StatCard
            title="Global Rank"
            value={member.globalEarningsRank ? `#${member.globalEarningsRank}` : 'N/A'}
            subtitle="By earnings"
          />
        
        
        {/* Reward Progress */}
        
          🎁 Reward Progress
          
            
            
            
            
          
        
        
        {/* Recent Referrals */}
        {member.referrals.length > 0 && (
          
            📊 Your Recent Referrals
            
              {member.referrals.map((referral, i) => (
                
                  {referral.username}
                  
                    {new Date(referral.createdAt).toLocaleDateString()}
                  
                
              ))}
            
          
        )}
      
    
  );
}

// Helper Components
function StatCard({ title, value, subtitle, trend }: any) {
  return (
    
      {title}
      {value}
      {subtitle}
      {trend && {trend}}
    
  );
}

function RewardTier({ count, reward, current }: any) {
  const progress = Math.min((current / count) * 100, 100);
  const isUnlocked = current >= count;
  
  return (
    
      
        
          {isUnlocked ? '✅' : '🔒'} {count} referrals
        
        {reward}
      
      
        
      
    
  );
}
```

═══════════════════════════════════════════════════════════════════════════════
DEPLOYMENT & TESTING
═══════════════════════════════════════════════════════════════════════════════

ENVIRONMENT VARIABLES (.env.local):
```env
# Database (from Supabase)
DATABASE_URL="postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres"

# Whop API
WHOP_API_KEY="[YOUR_WHOP_API_KEY]"
WHOP_WEBHOOK_SECRET="[YOUR_WEBHOOK_SECRET]"
NEXT_PUBLIC_WHOP_APP_ID="app_xa1a8NaAKUVPuO"

# App URLs
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

INSTALLATION COMMANDS:
```bash
# Install dependencies
pnpm install @prisma/client prisma @whop/sdk lucide-react

# Install shadcn/ui
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card badge tabs table toast

# Setup database
npx prisma generate
npx prisma migrate dev --name init

# Start development server
whop-proxy --command "pnpm next dev"
```

TESTING CHECKLIST:
□ Webhook endpoint returns 200 OK
□ Member created with referral code
□ Welcome message sent
□ Referral link redirects correctly
□ Attribution cookie set
□ Commission calculated as 10/70/20
□ Member dashboard loads
□ Earnings display correctly
□ Leaderboard shows rankings

═══════════════════════════════════════════════════════════════════════════════
CODE QUALITY REQUIREMENTS
═══════════════════════════════════════════════════════════════════════════════

✅ TypeScript: Strict mode, explicit types, no 'any'
✅ Error Handling: try/catch on all async operations
✅ Logging: console.log for debugging (✅/❌/ℹ️  emojis)
✅ Validation: Input validation on all API routes
✅ Security: HTTPS only, httpOnly cookies, GDPR-safe hashing
✅ Performance: Optimized queries, indexed fields, cached data
✅ Responsive: Mobile-first, works on all screen sizes
✅ Accessibility: Semantic HTML, ARIA labels where needed

═══════════════════════════════════════════════════════════════════════════════
FINAL INSTRUCTIONS
═══════════════════════════════════════════════════════════════════════════════

Generate ALL files in the order specified. For each file:
1. Create the complete file (no placeholders or TODOs)
2. Include all imports
3. Add TypeScript types
4. Add error handling
5. Add console.logs for debugging
6. Add comments for complex logic
7. Ensure it integrates with other files

Start now with Phase 1 (Database & Utilities).
Generate file 1 (prisma/schema.prisma) first.