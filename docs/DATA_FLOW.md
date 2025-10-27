# DATA FLOW & METRICS MAPPING
*Complete source-of-truth for all data calculations*
*Last Updated: 2025-01-27*

---

## 🎯 Purpose
This document maps EVERY metric displayed in dashboards to its exact database source and calculation logic. Use this to verify data accuracy and debug discrepancies.

---

## 📊 CREATOR DASHBOARD METRICS

### Revenue Metrics Section (`RevenueMetrics.tsx`)

#### 1. Total Revenue (All-Time)
**Display:** "Total Revenue: $12,499.00"
**Source:** `lib/queries/creator.ts` → `getMonthlyRevenueBreakdown()`
**Calculation:**
```typescript
prisma.commission.aggregate({
  where: {
    creatorId,
    status: 'paid',
  },
  _sum: { saleAmount: true }
})
```
**Database Fields:**
- `Commission.saleAmount` (sum of all paid commissions)
- `Commission.status` (must be 'paid')

**Logic:** Sum of ALL paid commission sale amounts (includes both initial and recurring payments from referred members ONLY)

**⚠️ Important:** This does NOT include organic member subscriptions (no commissions generated for organic members)

---

#### 2. Monthly Revenue
**Display:** "Monthly Revenue: $999.00"
**Source:** `lib/queries/creator.ts` → `getMonthlyRevenueBreakdown()`
**Calculation:**
```typescript
// Sum ALL active member subscriptions (organic + referred)
allMembers.reduce((sum, member) => sum + member.subscriptionPrice, 0)
```
**Database Fields:**
- `Member.subscriptionPrice` (monthly subscription amount)
- `Member.creatorId` (filter by creator)

**Logic:** Sum of ALL active members' monthly subscription prices

**✅ Includes:**
- Organic members ($49.99 each)
- Referred members ($49.99 each)

---

#### 3. Referral Contribution
**Display:** "Referral Revenue: $500.00"
**Source:** `lib/queries/creator.ts` → `getMonthlyRevenueBreakdown()`
**Calculation:**
```typescript
allMembers
  .filter(m => m.memberOrigin === 'referred')
  .reduce((sum, member) => sum + member.subscriptionPrice, 0)
```
**Database Fields:**
- `Member.subscriptionPrice`
- `Member.memberOrigin` (filter by 'referred')

**Logic:** Sum of ONLY referred members' monthly subscriptions

---

#### 4. Active Subscriptions
**Display:** "Active Members: 50"
**Source:** `lib/queries/creator.ts` → `getMonthlyRevenueBreakdown()`
**Calculation:**
```typescript
await prisma.member.count({
  where: { creatorId }
})
```
**Database Fields:**
- `Member.creatorId`

**Logic:** Count of ALL members (organic + referred)

---

#### 5. Conversion Rate
**Display:** "Conversion Rate: 12.5%"
**Source:** `lib/queries/creator.ts` → `getMonthlyRevenueBreakdown()`
**Current Calculation (MAY BE INCORRECT):**
```typescript
// Using AttributionClick counts
const totalActiveClicks = await prisma.attributionClick.count({
  where: {
    member: { creatorId },
    expiresAt: { gte: new Date() }
  }
})

const convertedClicks = // count of converted attribution clicks

conversionRate = (convertedClicks / totalActiveClicks) * 100
```

**⚠️ ISSUE:** Current implementation might be using attribution click conversions instead of actual referred member count

**CORRECT Calculation (to implement):**
```typescript
const referredMembers = await prisma.member.count({
  where: { creatorId, memberOrigin: 'referred' }
})

const totalClicks = await prisma.attributionClick.count({
  where: {
    member: { creatorId },
    expiresAt: { gte: new Date() }
  }
})

conversionRate = totalClicks > 0 ? (referredMembers / totalClicks) * 100 : 0
```

**Database Fields:**
- `Member.memberOrigin` = 'referred' (actual conversions)
- `AttributionClick.expiresAt` (active clicks within 30-day window)

---

### Top Performers Table (`TopPerformersTable.tsx`)

#### Current Columns:
1. **Rank** - Position in sorted list (1, 2, 3...)
2. **Member** - `Member.username`
3. **Total Referrals** - `Member.totalReferred` (all-time)
4. **Tier** - `Member.currentTier` (bronze, silver, gold, platinum)

#### Missing Column (NEEDS TO BE ADDED):
5. **Referrals This Month** - `Member.monthlyReferred` (⚠️ FIELD DOESN'T EXIST YET)

**Source:** `lib/queries/creator.ts` → `getTopPerformers()`
**Current Query:**
```typescript
await prisma.member.findMany({
  where: { creatorId },
  select: {
    username: true,
    totalReferred: true,      // ✅ All-time
    monthlyReferred: true,     // ❌ FIELD MISSING IN SCHEMA
    lifetimeEarnings: true,
    currentTier: true,
  },
  orderBy: { totalReferred: 'desc' },
  take: limit,
})
```

**⚠️ ACTION REQUIRED:**
1. Add `monthlyReferred` field to `Member` model in `schema.prisma`
2. Add `lastMonthReset` field to track when monthly stats were last reset
3. Update webhook to increment both `totalReferred` AND `monthlyReferred`
4. Create cron job to reset `monthlyReferred = 0` on 1st of each month

---

### Community Stats Grid (`CommunityStatsGrid.tsx`)

#### 1. Total Members
**Source:** `lib/queries/creator.ts` → `getCommunityStats()`
**Calculation:**
```typescript
await prisma.member.aggregate({
  where: { creatorId },
  _count: true
})
```
**Database Fields:** `Member.creatorId`

---

#### 2. Total Referral Links Clicked
**Source:** `lib/queries/creator.ts` → `getCommunityStats()`
**Calculation:**
```typescript
await prisma.attributionClick.groupBy({
  by: ['converted'],
  where: {
    member: { creatorId },
  },
  _count: true
})
// Sum all counts
```
**Database Fields:**
- `AttributionClick.memberId` → `Member.creatorId`

**Logic:** Count of ALL attribution clicks (converted + non-converted, expired + active)

---

#### 3. Average Referrals Per Member
**Source:** `lib/queries/creator.ts` → `getCommunityStats()`
**Calculation:**
```typescript
await prisma.member.aggregate({
  where: { creatorId },
  _avg: { totalReferred: true }
})
```
**Database Fields:** `Member.totalReferred`

---

#### 4. Average Earnings Per Member
**Source:** `lib/queries/creator.ts` → `getCommunityStats()`
**Calculation:**
```typescript
await prisma.member.aggregate({
  where: { creatorId },
  _avg: { lifetimeEarnings: true }
})
```
**Database Fields:** `Member.lifetimeEarnings`

---

## 📊 MEMBER DASHBOARD METRICS

### Member Stats Section

#### 1. Lifetime Earnings
**Source:** Member record
**Database Field:** `Member.lifetimeEarnings`
**Updated By:** Webhook handler when commission is paid

---

#### 2. Monthly Earnings
**Source:** Member record
**Database Field:** `Member.monthlyEarnings`
**Updated By:** Webhook handler (⚠️ NEEDS MONTHLY RESET CRON)

---

#### 3. Total Referrals
**Source:** Member record
**Database Field:** `Member.totalReferred`
**Updated By:** Webhook handler when conversion occurs

---

#### 4. Monthly Referrals
**Source:** Member record
**Database Field:** `Member.monthlyReferred` (⚠️ FIELD MISSING)
**Updated By:** Webhook handler + monthly reset cron

---

## 🔄 WEBHOOK DATA FLOW

### Payment Received Webhook (`app/api/webhooks/whop/route.ts`)

**Event:** `payment.succeeded`

**Actions:**
1. Find attribution click by membership ID
2. Create commission record with 10/70/20 split
3. Update member earnings:
   - `lifetimeEarnings += memberShare`
   - `monthlyEarnings += memberShare` (⚠️ NEEDS MONTHLY RESET)
4. Update referrer's referral count:
   - `totalReferred += 1`
   - `monthlyReferred += 1` (⚠️ FIELD MISSING)
5. Update creator cached stats:
   - `totalReferrals += 1`
   - `totalRevenue += saleAmount`
   - `monthlyRevenue += saleAmount` (⚠️ NEEDS MONTHLY RESET)

---

## 🔍 DATA CONSISTENCY RULES

### Rule 1: Total Referrals Match
```typescript
// Sum of all member referral counts MUST equal creator's total
SUM(Member.totalReferred WHERE creatorId = X) === Creator.totalReferrals WHERE id = X
```

### Rule 2: Revenue Match
```typescript
// Sum of all commission sale amounts MUST equal creator's total revenue
SUM(Commission.saleAmount WHERE creatorId = X AND status = 'paid') === Creator.totalRevenue WHERE id = X
```

### Rule 3: Member Earnings Match
```typescript
// Member's lifetime earnings MUST equal sum of their commission shares
Member.lifetimeEarnings === SUM(Commission.memberShare WHERE memberId = member.id AND status = 'paid')
```

### Rule 4: Commission Split Validation
```typescript
// Every commission MUST split exactly 100%
Commission.memberShare + Commission.creatorShare + Commission.platformShare === Commission.saleAmount

// Percentages MUST be exact:
Commission.memberShare === Commission.saleAmount * 0.10   // 10%
Commission.creatorShare === Commission.saleAmount * 0.70  // 70%
Commission.platformShare === Commission.saleAmount * 0.20 // 20%
```

### Rule 5: Conversion Count Match
```typescript
// Count of referred members MUST match count of converted attribution clicks
Member.count WHERE memberOrigin = 'referred' === AttributionClick.count WHERE converted = true
```

---

## ❌ KNOWN DATA ISSUES

### Issue 1: Missing Monthly Tracking Fields
**Problem:** `Member.monthlyReferred` and `Member.lastMonthReset` don't exist
**Impact:** Cannot show "Referrals This Month" column in Top Performers table
**Fix:** Add fields to schema + create monthly reset cron job

### Issue 2: Monthly Stats Never Reset
**Problem:** No cron job to reset monthly metrics on 1st of month
**Impact:** Monthly earnings and referrals accumulate indefinitely
**Fix:** Create `app/api/cron/reset-monthly-stats/route.ts`

### Issue 3: Conversion Rate Calculation Unclear
**Problem:** May be using attribution click conversions instead of actual member count
**Impact:** Conversion rate might be inaccurate
**Fix:** Use `Member.count WHERE memberOrigin = 'referred'` as numerator

### Issue 4: Revenue Definitions Inconsistent
**Problem:** "Total Revenue" vs "Monthly Revenue" definitions overlap
**Impact:** Confusing which metrics include organic vs referred members
**Fix:** Clear documentation + UI labels

---

## ✅ VERIFICATION CHECKLIST

Use this checklist to verify data accuracy:

- [ ] Creator total revenue = SUM of all paid commission sale amounts
- [ ] Creator total referrals = SUM of all member totalReferred counts
- [ ] Member lifetime earnings = SUM of their commission member shares
- [ ] Every commission splits exactly 100% (10% + 70% + 20%)
- [ ] Referred member count = Converted attribution click count
- [ ] Top Performers table shows correct all-time referral counts
- [ ] Monthly stats reset to 0 on 1st of each month
- [ ] Webhook increments both total AND monthly metrics
- [ ] Conversion rate = (referred members / total active clicks) × 100%
- [ ] Monthly revenue = SUM of all active member subscription prices

---

## 🔧 FILES TO UPDATE

1. **Schema Changes:**
   - `prisma/schema.prisma` - Add `monthlyReferred`, `lastMonthReset`

2. **Query Updates:**
   - `lib/queries/creator.ts` - Fix conversion rate, add monthly tracking

3. **Webhook Updates:**
   - `app/api/webhooks/whop/route.ts` - Increment monthly stats

4. **New Cron Job:**
   - `app/api/cron/reset-monthly-stats/route.ts` - Monthly reset

5. **UI Updates:**
   - `components/dashboard/TopPerformersTable.tsx` - Add "This Month" column

---

## 📈 FUTURE METRICS TO ADD

### Today's Stats Card (PLANNED)
- New referrals today
- Clicks today
- Revenue today

**Source:** New function `getTodayStats(creatorId)`
**Calculation:** Filter all metrics by `createdAt >= startOfDay(new Date())`

---

*This document is the source of truth for all data calculations. Update whenever metrics or calculations change.*
