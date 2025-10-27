# Commission Timestamp System

## Overview
All referral conversion metrics use **Commission timestamps** rather than Member creation dates to ensure accuracy and consistency across the platform.

## Key Principle
**A referral is only counted when the user makes their first payment**, not when they sign up.

- ❌ **Wrong**: Using `Member.createdAt` (account signup date)
- ✅ **Correct**: Using `Commission.createdAt` (first payment date)

## Implementation

### 1. Recent Referrals Display
**Location**: `app/customer/[experienceId]/page.tsx`

```typescript
// Fetch referrals with their first commission (conversion date)
referrals: {
  select: {
    username: true,
    createdAt: true,
    commissions: {
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
      take: 1  // Get first commission (conversion date)
    }
  },
  where: {
    commissions: {
      some: {}  // Only show referrals that have converted
    }
  }
}

// Display conversion date
const conversionDate = referral.commissions[0]?.createdAt || referral.createdAt;
```

**Result**: Shows "Converted [date]" instead of signup date

### 2. Monthly Metrics
**Location**: `app/api/webhooks/whop/route.ts`

```typescript
// When commission is created (payment received)
await prisma.member.update({
  where: { id: referrer.id },
  data: {
    monthlyReferred: { increment: 1 },  // ✅ Incremented on payment
    totalReferred: { increment: 1 },
  }
});
```

**Result**: Monthly counts reflect actual conversions (payments), not signups

### 3. Revenue Metrics
**Location**: `lib/queries/creator.ts`

```typescript
// Use commission timestamps for all revenue calculations
const monthStart = startOfMonth(new Date());
await prisma.commission.aggregate({
  where: {
    creatorId,
    status: 'paid',
    createdAt: { gte: monthStart }  // ✅ Commission timestamp
  }
});
```

**Result**: All revenue metrics based on payment dates

### 4. Helper Functions
**Location**: `lib/queries/referrals.ts`

- `getMonthlyReferralStats()` - Commission-based monthly counts
- `getReferralList()` - Referrals with conversion dates
- `getMonthlyGrowth()` - Growth tracking by commission dates

## Data Flow

```
User Signs Up → Member.createdAt set
       ↓
User Makes Payment → Commission.createdAt set
       ↓
Webhook Handler → monthlyReferred++
       ↓
Dashboard Shows "Converted [Commission.createdAt]"
```

## Why This Matters

### Problem with Member.createdAt:
- User signs up January 15th
- User pays February 1st
- Using Member.createdAt would count this as January referral ❌

### Solution with Commission.createdAt:
- User signs up January 15th
- User pays February 1st
- Using Commission.createdAt counts this as February referral ✅

## Consistency Checklist

✅ Recent Referrals → Shows commission timestamps
✅ Monthly Metrics → Updated on commission creation
✅ Revenue Reports → Uses commission.createdAt
✅ Growth Analytics → Based on commission dates
✅ Earnings Chart → Groups by commission.createdAt

## Future Improvements

Consider implementing dynamic calculations instead of cached values:

```typescript
// Instead of cached member.monthlyReferred
const monthlyReferred = await prisma.commission.count({
  where: {
    memberId,
    paymentType: 'initial',
    status: 'paid',
    createdAt: { gte: startOfMonth(new Date()) }
  }
});
```

This would provide real-time accuracy without depending on webhook increments.

## Testing

Verify timestamp consistency:
1. Create test member
2. Create commission 5 days after member creation
3. Check "Recent Referrals" shows commission date (+5 days)
4. Check monthly count reflects commission month, not signup month

## Related Files

- `app/customer/[experienceId]/page.tsx` - Member dashboard with conversion dates
- `app/api/webhooks/whop/route.ts` - Webhook handler that creates commissions
- `lib/queries/creator.ts` - Creator revenue metrics
- `lib/queries/referrals.ts` - Referral statistics helpers
- `lib/queries/earnings.ts` - Earnings chart data (commission-based)

## Summary

**All metrics are now consistent**: They track when users **actually converted (paid)**, not when they signed up. This provides accurate growth tracking, revenue reporting, and referral attribution.
