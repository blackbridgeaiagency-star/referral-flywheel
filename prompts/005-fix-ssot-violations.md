<objective>
Fix all 8 SSOT (Single Source of Truth) violations identified in the pre-launch audit report.

SSOT violations cause data inconsistency, confusion, and maintenance burden. Fixing these ensures:
- Every piece of data has ONE authoritative source
- No duplicate business logic across files
- Consistent behavior throughout the application

This is the "final quality gate" for data consistency before launch.
</objective>

<context>
**Project**: Referral Flywheel - Viral growth engine for Whop communities
**Tech Stack**: Next.js 14.0.4, TypeScript, Prisma, PostgreSQL

Read `.claude/CLAUDE.md` for full project context.
Read `./reviews/001-prelaunch-audit-report.md` for complete audit findings.

**Business Rules to Maintain**:
- Commission split: 10/70/20 (member/creator/platform) at base tier
- Tiered commission: 10%/15%/18% for starter/ambassador/elite
- Creator gets 70% at all tiers (constant)
</context>

<ssot_violations>

## SSOT-001: Dual Tier Systems (CRITICAL)

**Problem**: Two completely separate tier systems exist:
1. **Commission Tiers** (lib/utils/tiered-commission.ts): starter/ambassador/elite
2. **Gamification Tiers** (lib/utils/tier-calculator.ts): bronze/silver/gold/platinum

**Impact**: Users see different "tiers" in different contexts, causing confusion.

**Decision**: Keep BOTH systems but clearly differentiate them in the UI:
- Commission tiers → "Commission Level" (affects earnings percentage)
- Gamification tiers → "Reward Tier" (affects milestone rewards)

**Required Fix**:

1. Rename types and functions for clarity:

```typescript
// lib/utils/tiered-commission.ts
export type CommissionLevel = 'starter' | 'ambassador' | 'elite';
export interface CommissionLevelConfig {
  level: CommissionLevel;
  minReferrals: number;
  memberRate: number;
  creatorRate: number;
  platformRate: number;
}

export function getCommissionLevel(referralCount: number): CommissionLevelConfig { ... }
```

```typescript
// lib/utils/tier-calculator.ts
export type RewardTier = 'unranked' | 'bronze' | 'silver' | 'gold' | 'platinum';
export function getRewardTier(referralCount: number, creatorThresholds: CreatorThresholds): RewardTier { ... }
```

2. Update component displays to use clear labels:
- "Commission Level: Starter (10%)" vs "Reward Tier: Bronze"

## SSOT-002: Hardcoded Commission Tier Thresholds (CRITICAL)

**Problem**: Commission tier thresholds (50, 100) are hardcoded, not creator-configurable.

**Current Code**:
```typescript
export const COMMISSION_TIERS = [
  { tierName: 'starter', minReferrals: 0, ... },
  { tierName: 'ambassador', minReferrals: 50, ... },  // HARDCODED
  { tierName: 'elite', minReferrals: 100, ... },      // HARDCODED
];
```

**Required Fix**:

1. Add fields to Creator model (schema.prisma):
```prisma
model Creator {
  // ... existing fields
  commissionTierAmbassador Int @default(50)
  commissionTierElite      Int @default(100)
}
```

2. Update tiered-commission.ts to accept creator config:
```typescript
export function getCommissionLevel(
  referralCount: number,
  creatorConfig?: { ambassadorThreshold?: number; eliteThreshold?: number }
): CommissionLevelConfig {
  const ambassadorMin = creatorConfig?.ambassadorThreshold ?? 50;
  const eliteMin = creatorConfig?.eliteThreshold ?? 100;

  if (referralCount >= eliteMin) {
    return { level: 'elite', minReferrals: eliteMin, memberRate: 0.18, ... };
  }
  if (referralCount >= ambassadorMin) {
    return { level: 'ambassador', minReferrals: ambassadorMin, memberRate: 0.15, ... };
  }
  return { level: 'starter', minReferrals: 0, memberRate: 0.10, ... };
}
```

3. Update webhook handler to pass creator config when calculating commissions.

## SSOT-003: Duplicate formatCurrency (HIGH)

**Problem**: `formatCurrency` defined in 3 places:
1. `lib/utils/commission.ts:18` - Main implementation
2. `lib/constants/metrics.ts:84` - Duplicate
3. Various inline usages

**Required Fix**:

1. Keep only `lib/utils/commission.ts` version
2. Remove from `lib/constants/metrics.ts`
3. Update all imports to use single source:
```typescript
import { formatCurrency } from '@/lib/utils/commission';
```

4. Search and replace all inline implementations:
```typescript
// FIND: .toLocaleString('en-US', { style: 'currency', currency: 'USD' })
// REPLACE WITH: formatCurrency(amount)
```

## SSOT-004: Multiple Query Implementations (HIGH)

**Problem**: Overlapping query implementations:
- `lib/data/centralized-queries.ts` (primary SSOT - 1230 lines)
- `lib/db/queries-optimized.ts` (duplicate)
- `lib/cache/cached-queries.ts` (wrapper)
- `lib/queries/creator.ts` (creator queries)
- `lib/queries/earnings.ts` (earnings queries)
- `lib/queries/referrals.ts` (referral queries)

**Required Fix**:

1. `centralized-queries.ts` is the SSOT - keep it
2. Delete or deprecate `lib/db/queries-optimized.ts`
3. Ensure `lib/cache/cached-queries.ts` wraps centralized-queries.ts
4. Move useful functions from `lib/queries/*.ts` into centralized-queries.ts
5. Update all imports to use centralized-queries.ts

Deprecation approach:
```typescript
// lib/db/queries-optimized.ts
/**
 * @deprecated Use centralized-queries.ts instead
 * This file will be removed in the next release.
 */
import { getMemberStats } from '@/lib/data/centralized-queries';
export { getMemberStats }; // Re-export for backwards compatibility
```

## SSOT-005: Member.totalReferred Cached Field (HIGH)

**Problem**: `Member.totalReferred` is a cached field that can become stale vs calculated from Commission records.

**Current**: The field exists on Member model and is sometimes updated, sometimes not.

**SSOT Principle**: Commission table is the source of truth.

**Required Fix**:

Option A (Recommended): Remove the cached field entirely
- Remove `totalReferred` from Member model
- Always calculate from Commission records:
```typescript
const totalReferred = await prisma.commission.count({
  where: { memberId, status: { not: 'refunded' } },
});
```

Option B: Keep but ensure it's always updated
- Add database trigger to update on Commission changes
- Or ensure all code paths that create/update Commission also update Member.totalReferred

**Decision**: Go with Option A (remove cached field) for true SSOT.

Note: This requires a database migration. Generate with `npx prisma migrate dev`.

## SSOT-006: Commission Rates as Magic Numbers (MEDIUM)

**Problem**: `10/70/20` appears in multiple files as magic numbers.

**Required Fix**:

Create constants file (or add to existing):
```typescript
// lib/constants/commission.ts
export const COMMISSION_RATES = {
  STARTER: {
    member: 0.10,
    creator: 0.70,
    platform: 0.20,
  },
  AMBASSADOR: {
    member: 0.15,
    creator: 0.70,
    platform: 0.15,
  },
  ELITE: {
    member: 0.18,
    creator: 0.70,
    platform: 0.12,
  },
} as const;

// For display purposes
export const COMMISSION_PERCENTAGES = {
  memberBase: 10,
  creator: 70,
  platform: 20,
} as const;
```

Then replace all hardcoded values with these constants.

## SSOT-007: Attribution Window Duplication (MEDIUM)

**Problem**: 30-day attribution window defined in multiple places.

**Required Fix**:

Add to constants:
```typescript
// lib/constants/attribution.ts
export const ATTRIBUTION_WINDOW_DAYS = 30;
export const ATTRIBUTION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
```

Update all usages to import from this single source.

## SSOT-008: Inconsistent Tier Names (MEDIUM)

**Problem**: Tier names inconsistent:
- Commission: "starter", "ambassador", "elite"
- Gamification: "unranked", "bronze", "silver", "gold", "platinum"

**Resolution**: This is intentional - they are different systems (see SSOT-001 fix).

**Required Fix**:
- Update all UI displays to use clear labels differentiating the two
- Add helper functions for display:
```typescript
// lib/utils/tier-display.ts
export function getCommissionLevelDisplay(level: CommissionLevel): string {
  const displays = {
    starter: 'Starter (10%)',
    ambassador: 'Ambassador (15%)',
    elite: 'Elite (18%)',
  };
  return displays[level];
}

export function getRewardTierDisplay(tier: RewardTier): string {
  const displays = {
    unranked: 'Unranked',
    bronze: 'Bronze',
    silver: 'Silver',
    gold: 'Gold',
    platinum: 'Platinum',
  };
  return displays[tier];
}
```

</ssot_violations>

<implementation_steps>

1. **Fix SSOT-001 and SSOT-008 together** (tier naming):
   - Update type names in tiered-commission.ts
   - Create tier-display.ts helper functions
   - Update UI components to show clear labels

2. **Fix SSOT-002** (configurable thresholds):
   - Update schema.prisma with new Creator fields
   - Run `npx prisma generate`
   - Update tiered-commission.ts to accept config
   - Update webhook handler

3. **Fix SSOT-003** (formatCurrency):
   - Remove duplicate from lib/constants/metrics.ts
   - Search for all inline currency formatting
   - Update imports across codebase

4. **Fix SSOT-004** (query consolidation):
   - Mark queries-optimized.ts as deprecated
   - Migrate useful functions to centralized-queries.ts
   - Update all imports

5. **Fix SSOT-005** (cached totalReferred):
   - Update centralized-queries to always calculate from Commission
   - Remove usage of Member.totalReferred
   - Consider removing field from schema (migration required)

6. **Fix SSOT-006** (commission rate constants):
   - Create/update lib/constants/commission.ts
   - Replace magic numbers throughout codebase

7. **Fix SSOT-007** (attribution window):
   - Create lib/constants/attribution.ts
   - Update all usages

8. **Verify**: Run build and test

</implementation_steps>

<verification>
After completing all fixes:

1. **Build passes**: `npm run build` completes without errors

2. **Search for violations**:
   - `grep -r "0.10" --include="*.ts"` - should only be in constants
   - `grep -r "0.70" --include="*.ts"` - should only be in constants
   - `grep -r "formatCurrency" --include="*.ts"` - should import from one place

3. **Tier display**:
   - Commission level shows: "Starter (10%)", "Ambassador (15%)", "Elite (18%)"
   - Reward tier shows: "Bronze", "Silver", "Gold", "Platinum"

4. **Query paths**:
   - All dashboard data flows through centralized-queries.ts

</verification>

<success_criteria>
- All 8 SSOT violations are fixed
- Commission rates defined in ONE place
- Attribution window defined in ONE place
- formatCurrency has ONE implementation
- Tier systems are clearly differentiated
- Build passes with no errors
- No functionality is broken
</success_criteria>

<output>
After fixing, update the audit report:
- Edit `./reviews/001-prelaunch-audit-report.md`
- Change SSOT-001 through SSOT-008 status from OPEN to FIXED
- Update the executive summary counts
</output>
