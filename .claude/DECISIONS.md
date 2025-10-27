# Architecture Decision Record (ADR)

## ADR-001: Database Choice (2025-10-23)

**Status**: Accepted

**Context**: Need scalable, serverless-friendly database for Vercel deployment.

**Decision**: PostgreSQL via Supabase with connection pooling (port 6543).

**Rationale**:
- Prisma ORM support excellent
- Free tier supports 500MB (sufficient for MVP)
- Connection pooling required for serverless
- Built-in table editor for debugging
- Row-level security for future multi-tenancy

**Alternatives Considered**:
- MongoDB: No strong relations, harder with Prisma
- PlanetScale: MySQL, less feature-rich than Postgres
- Neon: Similar to Supabase, less mature ecosystem

**Consequences**:
- ✅ Fast queries with indexes
- ✅ Strong data consistency
- ⚠️ Must use pooled connection (port 6543)
- ⚠️ Connection limit on free tier (need to monitor)

---

## ADR-002: Commission Structure Enforcement (2025-10-23)

**Status**: Accepted

**Context**: Commission split is core business model and must never change accidentally.

**Decision**: Hard-code 10/70/20 split in database defaults AND calculation function.

**Implementation**:
```typescript
// Database defaults (prisma/schema.prisma)
memberRate:   Float @default(10)  // Locked
creatorRate:  Float @default(70)  // Locked
platformRate: Float @default(20)  // Locked

// Calculation function (lib/utils/commission.ts)
export function calculateCommission(saleAmount: number) {
  const memberShare = saleAmount * 0.10;   // Never change
  const creatorShare = saleAmount * 0.70;  // Never change
  const platformShare = saleAmount * 0.20; // Never change
  return { memberShare, creatorShare, platformShare };
}
```

**Rationale**:
- Prevents accidental modification via UI
- Clear business model for creators
- Legal compliance (promised rate to members)
- Simple to audit

**Consequences**:
- ✅ Impossible to accidentally change split
- ✅ Easy to verify in database
- ⚠️ If rates need to change (future), requires migration
- ⚠️ Need versioning system if dynamic rates added later

---

## ADR-003: Whop SDK Implementation Strategy (2025-10-23)

**Status**: Accepted

**Context**: Need to integrate with Whop for payments and messaging.

**Decision**: Use @whop/sdk package, but keep messaging as optional feature.

**Rationale**:
- Official SDK provides type safety
- Webhook validation built-in
- Welcome messages are "nice to have" not critical
- Can fall back to console logging during development

**Implementation**:
```typescript
// lib/whop/messaging.ts - Graceful degradation
export async function sendWelcomeMessage(member, creator) {
  try {
    await whop.messages.send({ user_id: member.userId, content: message });
    console.log(`✅ Welcome message sent to ${member.username}`);
  } catch (error) {
    console.error('❌ Failed to send welcome message:', error);
  }
}
```

**Consequences**:
- ✅ App works even if messaging fails
- ✅ Can test without real Whop integration
- ⚠️ Need to monitor error logs
- ⚠️ Manual outreach needed if messages fail

---

## ADR-004: Referral Code Format (2025-10-23)

**Status**: Accepted

**Decision**: Format is FIRSTNAME-XXXXXX where X is alphanumeric (no ambiguous chars).

**Example**: MIKE-A2X9K7

**Rationale**:
- Human-readable (easy to share verbally)
- Unique (6 chars = 36^6 = 2.1B combinations)
- Memorable (includes user's name)
- URL-safe (no special chars)
- Avoids confusion (no 0/O, 1/I/l)

**Implementation**:
```typescript
// lib/utils/referral-code.ts
const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No 0,O,1,I,L
const suffix = 6 random chars from above
return `${FIRSTNAME}-${suffix}`;
```

**Consequences**:
- ✅ Easy for members to share
- ✅ Brandable (name recognition)
- ✅ Collision-resistant
- ⚠️ Leaks first name (privacy consideration)

---

## ADR-005: Attribution Tracking Strategy (2025-10-23)

**Status**: Accepted

**Context**: Need to track referrals across 30-day window with cookie deletion protection.

**Decision**: Dual-layer tracking: HTTP-only cookie (primary) + database fingerprint (backup).

**Implementation**:
```typescript
// 1. Set cookie on referral click (30 days)
response.cookies.set('ref_code', code, {
  maxAge: 30 * 24 * 60 * 60,
  httpOnly: true,
  secure: true
});

// 2. Store fingerprint in database
await prisma.attributionClick.create({
  fingerprint: hashOf(userAgent + IP),
  referralCode: code,
  expiresAt: now + 30 days
});

// 3. Check both on payment
const attribution = await checkAttribution(request);
// Returns: cookie first, falls back to fingerprint
```

**Rationale**:
- Cookies work for 95% of users
- Fingerprinting catches cookie deletions
- GDPR-safe (hashed data, no PII)
- 30-day window is industry standard

**Consequences**:
- ✅ High attribution accuracy
- ✅ Resilient to cookie deletion
- ⚠️ Fingerprints can collide (rare)
- ⚠️ VPN users may change fingerprints

---

## ADR-006: Earnings Chart Implementation (2025-10-23)

**Status**: Accepted

**Context**: Members need visual feedback on earnings growth to stay motivated. Current dashboard shows numeric stats but lacks trend visualization.

**Decision**:
1. Use Recharts library for visualization (Area chart with purple gradient)
2. Fetch data in Server Component (no separate API endpoint)
3. Query Commission table directly with Prisma aggregation
4. Display last 30 days with daily granularity
5. Lazy-load chart component to reduce initial bundle size

**Implementation**:
```typescript
// Query pattern
const commissions = await prisma.$queryRaw`
  SELECT
    DATE(createdAt) as date,
    SUM(memberShare) as earnings,
    COUNT(*) as count
  FROM Commission
  WHERE memberId = ${memberId}
    AND status = 'paid'
    AND createdAt >= ${thirtyDaysAgo}
  GROUP BY DATE(createdAt)
  ORDER BY date ASC
`;

// Component structure
<EarningsChart
  data={processedEarningsData}
  gradient="purple-600"
  height={300}
/>
```

**Rationale**:
- **Recharts**: React-native library with excellent TypeScript support, SSR-compatible
- **Server Component**: Avoids API waterfall, faster initial load for single consumer
- **30-day window**: Balances detail (see daily trends) vs motivation (not too sparse for new users)
- **Lazy loading**: Chart library is 90KB, loading it on-demand improves Time to Interactive

**Alternatives Considered**:
- **Chart.js**: More popular but requires canvas wrapper, harder to customize
- **Separate API endpoint**: More reusable but adds latency, overkill for single use case
- **7-day window**: Too short, doesn't show meaningful trends
- **Eager load chart**: Slows down dashboard for users who don't scroll to chart

**Consequences**:
- ✅ Visual motivation for members (gamification)
- ✅ Fast implementation (2-3 hours)
- ✅ No additional API surface to maintain
- ✅ Scales to 10,000 members without optimization
- ⚠️ Chart component not reusable (acceptable for MVP)
- ⚠️ Must refactor to API if creator dashboard needs same chart
- ⚠️ Real-time updates require page refresh (acceptable for earnings data)

---

## ADR-007: Creator Dashboard Architecture (2025-10-23)

**Status**: Accepted

**Context**: Creators need a comprehensive dashboard to monitor their referral program performance, manage rewards, view top performers, and access analytics. Current system only has member-facing dashboard.

**Decision**:

### 1. Data Model
**No new tables required** - Creator table already has necessary fields. We'll use aggregated queries from existing tables:
- Revenue: Aggregate from Commission table (`creatorShare` field)
- Top Performers: Query Member table ordered by earnings/referrals
- Community Stats: COUNT queries on Member table filtered by creatorId
- Attribution Rate: Calculate from AttributionClick table (converted vs total signups)

**Indexes to add**:
```prisma
@@index([creatorId, createdAt]) on Commission  // For time-based revenue queries
@@index([creatorId, lifetimeEarnings]) on Member  // For top performers
```

### 2. API Routes
All routes will be Server Component queries (no separate API endpoints for MVP):

**Route Structure**:
- `/app/seller-product/[experienceId]/page.tsx` - Main dashboard page (Server Component)
- `/app/api/creator/rewards/route.ts` - POST endpoint for reward management
- `/app/api/creator/export/route.ts` - GET endpoint for CSV export

**Data Fetching Strategy**:
```typescript
// Direct database queries in Server Component
async function getCreatorDashboardData(creatorId: string) {
  const [revenue, topEarners, topReferrers, communityStats] = await Promise.all([
    getRevenueMetrics(creatorId),
    getTopPerformers(creatorId, 'earnings', 10),
    getTopPerformers(creatorId, 'referrals', 10),
    getCommunityStats(creatorId),
  ]);
  return { revenue, topEarners, topReferrers, communityStats };
}
```

### 3. Component Hierarchy
```
CreatorDashboard (page.tsx - Server Component)
├─ Header (Server Component)
├─ RevenueMetrics (Server Component)
│  ├─ MetricCard (total revenue)
│  ├─ MetricCard (monthly revenue)
│  ├─ MetricCard (avg sale value)
│  └─ MetricCard (conversion rate)
├─ TopPerformersSection (Server Component)
│  ├─ TopEarnersTable
│  └─ TopReferrersTable
├─ CommunityStatsGrid (Server Component)
│  ├─ StatCard (active members)
│  ├─ StatCard (total referrals)
│  ├─ StatCard (avg per member)
│  └─ StatCard (attribution rate)
└─ SettingsSection (Client Component - for form interactions)
   ├─ RewardTiersForm
   └─ WelcomeMessageForm
```

### 4. Performance Optimization Plan
**Target**: Dashboard loads in < 2 seconds with 1000+ members

**Strategies**:
1. **Parallel Queries**: Use `Promise.all()` to fetch all metrics simultaneously
2. **Indexed Queries**: All queries use existing indexes (no table scans)
3. **Limited Results**: Top performers limited to 10 (pagination not needed for MVP)
4. **Cached Stats**: Use Creator table cached stats (`totalReferrals`, `totalRevenue`, `monthlyRevenue`)
5. **Lazy Loading**: Settings forms only load when section expanded (React Suspense)

**Query Complexity**:
- Revenue metrics: 2 queries (total, monthly) - ~10ms each
- Top performers: 2 queries (earnings, referrals) - ~20ms each
- Community stats: 3 queries (counts, averages) - ~15ms each
- **Total: ~90ms** (well under 200ms budget)

### 5. Caching Strategy
**NO caching for MVP** - Real-time data more valuable than speed for creators

Rationale:
- Creators check dashboard infrequently (1-2x/day)
- They want real-time data to make decisions
- Dashboard load time is acceptable without caching (< 2s)
- Caching adds complexity (invalidation, stale data)

**Future**: Consider caching if dashboard becomes slow (1000+ members, 10k+ commissions)

**Rationale**:
- **Server Component Approach**: Fastest for single consumer, no API waterfall
- **No New Tables**: Use existing schema efficiently with aggregation queries
- **Parallel Queries**: Maximize performance with concurrent database calls
- **Real-Time Data**: No caching = always fresh data for decision-making

**Alternatives Considered**:

1. **Separate API Endpoints**:
   - Pros: Reusable, testable, cacheable
   - Cons: Adds latency (client → API → database), more code to maintain
   - Decision: Server Components sufficient for MVP

2. **New Analytics Table**:
   - Pros: Pre-computed stats, faster queries
   - Cons: Data duplication, sync complexity, migration overhead
   - Decision: Aggregation queries fast enough with proper indexes

3. **Real-Time WebSocket Updates**:
   - Pros: Live updates, no refresh needed
   - Cons: Adds significant complexity, websocket infrastructure
   - Decision: Page refresh acceptable for creator dashboard (not frequently viewed)

**Consequences**:
- ✅ Fast implementation (~6-8 hours)
- ✅ No new database tables or migrations needed
- ✅ Real-time data without caching complexity
- ✅ Scales to 1000+ members without optimization
- ✅ Single page load, no API waterfalls
- ⚠️ Must refresh page for updated data (acceptable for creators)
- ⚠️ Top performers list not paginated (10 max, sufficient for MVP)
- ⚠️ Settings changes require page refresh to see effect

**Success Metrics**:
- Dashboard loads in < 2 seconds
- All queries complete in < 200ms
- Mobile responsive (works at 320px width)
- Zero console errors

---

## Template for Future ADRs

## ADR-XXX: [Title] (YYYY-MM-DD)

**Status**: [Proposed | Accepted | Deprecated | Superseded]

**Context**: [What's the situation?]

**Decision**: [What are we doing?]

**Rationale**: [Why this choice?]

**Alternatives Considered**:
- Option A: Pros/Cons
- Option B: Pros/Cons

**Consequences**:
- ✅ Benefits
- ⚠️ Trade-offs
- ❌ Drawbacks
