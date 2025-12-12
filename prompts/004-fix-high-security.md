<objective>
Fix all 6 HIGH severity security issues identified in the pre-launch audit report.

These issues represent important security hardening that should be completed before launch:
- Missing authentication on admin endpoints
- Webhook signature bypass in development
- No replay attack prevention on webhooks
- Missing rate limiting
- SQL injection risk
- Missing CSRF protection

This prompt depends on 003-fix-critical-security.md being completed first.
</objective>

<context>
**Project**: Referral Flywheel - Viral growth engine for Whop communities
**Tech Stack**: Next.js 14.0.4, TypeScript, Prisma, PostgreSQL

Read `.claude/CLAUDE.md` for full project context.
Read `./reviews/001-prelaunch-audit-report.md` for complete audit findings.

**Prerequisite**: Critical security fixes (003) must be completed first.
</context>

<high_security_issues>

## H1-SEC: Missing Auth on Admin Analytics

**File**: `app/api/admin/analytics/route.ts`

**Problem**: Admin endpoints don't verify admin role.

**Required Fix**:
Create an admin authentication helper and apply it:

```typescript
// lib/whop/simple-auth.ts - add this function
export async function isAdmin(): Promise<boolean> {
  const context = await getWhopContext();
  if (!context.userId) return false;

  // Check if user is in admin list (from env or database)
  const adminUserIds = process.env.ADMIN_USER_IDS?.split(',') || [];
  return adminUserIds.includes(context.userId);
}

// In admin routes:
import { isAdmin } from '@/lib/whop/simple-auth';

export async function GET(req: Request) {
  if (!await isAdmin()) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  // ... rest of handler
}
```

Apply this to ALL admin routes:
- `app/api/admin/analytics/route.ts`
- `app/api/admin/stats/route.ts`
- `app/api/admin/sync-creator-names/route.ts`
- `app/api/admin/validate-consistency/route.ts`
- `app/api/admin/check-consistency/route.ts`
- `app/api/admin/webhook-stats/route.ts`
- `app/api/admin/remove-test-data/route.ts`

## H2-SEC: Webhook Signature Bypass in Dev

**File**: `app/api/webhooks/whop/route.ts`

**Problem**: Signature validation skipped when `WHOP_WEBHOOK_SECRET` not set.

**Current Code**:
```typescript
if (!WHOP_WEBHOOK_SECRET) {
  logger.warn('⚠️ WHOP_WEBHOOK_SECRET not set, skipping signature verification');
  // Continues processing without validation!
}
```

**Required Fix**:
```typescript
if (!WHOP_WEBHOOK_SECRET) {
  logger.error('WHOP_WEBHOOK_SECRET not configured - rejecting webhook');
  return Response.json(
    { error: 'Webhook secret not configured' },
    { status: 500 }
  );
}

// Then validate signature (existing code)
const signature = request.headers.get('X-Whop-Signature');
if (!signature || !validateSignature(payload, signature, WHOP_WEBHOOK_SECRET)) {
  logger.error('Invalid webhook signature');
  return Response.json({ error: 'Invalid signature' }, { status: 401 });
}
```

## H3-SEC: No Replay Attack Prevention

**File**: `app/api/webhooks/whop/route.ts`

**Problem**: Same webhook can be replayed multiple times, causing duplicate commissions.

**Required Fix**:
Add idempotency check and timestamp validation:

```typescript
// Near the start of POST handler, after signature validation:

// 1. Parse the payload to get webhook ID
const payload = JSON.parse(rawBody);
const webhookId = payload.id || payload.data?.id;

if (webhookId) {
  // 2. Check if we've already processed this webhook
  const existingEvent = await prisma.webhookEvent.findFirst({
    where: { whopEventId: webhookId }
  });

  if (existingEvent) {
    logger.info(`Webhook ${webhookId} already processed, skipping`);
    return Response.json({ status: 'already_processed' });
  }
}

// 3. Check timestamp is recent (within 5 minutes)
const eventTimestamp = payload.created_at || payload.timestamp;
if (eventTimestamp) {
  const eventTime = new Date(eventTimestamp);
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  if (eventTime < fiveMinutesAgo) {
    logger.warn(`Webhook timestamp too old: ${eventTimestamp}`);
    return Response.json({ error: 'Event too old' }, { status: 400 });
  }
}

// 4. Record this webhook event before processing
if (webhookId) {
  await prisma.webhookEvent.create({
    data: {
      whopEventId: webhookId,
      eventType: payload.event || payload.action,
      payload: payload,
      processedAt: new Date(),
    }
  });
}
```

Note: The WebhookEvent model should already exist in schema.prisma. Verify it has:
- `whopEventId` field (unique)
- `eventType` field
- `payload` field (Json)
- `processedAt` field (DateTime)

## H4-SEC: Missing Rate Limiting on APIs

**Problem**: Most API routes lack rate limiting.

**Required Fix**:
Apply rate limiting middleware to sensitive endpoints:

```typescript
// lib/security/rate-limit-utils.ts - ensure this exists with:
export async function applyRateLimit(
  request: Request,
  options: { maxRequests: number; windowMs: number; identifier?: string }
): Promise<{ success: boolean; remaining: number; reset: number }>

// Apply to sensitive endpoints:
// - /api/creator/* (10 requests/minute)
// - /api/member/* (10 requests/minute)
// - /api/referrals/* (20 requests/minute)
// - /api/leaderboard/* (30 requests/minute)
```

Add to each route handler:
```typescript
import { applyRateLimit } from '@/lib/security/rate-limit-utils';

export async function POST(req: Request) {
  const rateLimitResult = await applyRateLimit(req, {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
  });

  if (!rateLimitResult.success) {
    return Response.json(
      { error: 'Too many requests' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimitResult.reset.toString(),
        },
      }
    );
  }

  // ... rest of handler
}
```

## H5-SEC: SQL Injection Risk in Search

**File**: `app/api/creator/custom-rates/search/route.ts`

**Problem**: User input used in query without proper sanitization.

**Required Fix**:
Ensure all queries use Prisma's parameterized queries (which are safe by default):

```typescript
// UNSAFE (if exists):
const results = await prisma.$queryRaw`SELECT * FROM Member WHERE username LIKE '%${searchTerm}%'`;

// SAFE (use Prisma's built-in):
const results = await prisma.member.findMany({
  where: {
    username: {
      contains: searchTerm,
      mode: 'insensitive',
    },
  },
  take: 10,
});
```

Also add input validation:
```typescript
import { z } from 'zod';

const searchSchema = z.object({
  query: z.string().min(1).max(100).regex(/^[a-zA-Z0-9\s\-_@.]+$/),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');

  const validation = searchSchema.safeParse({ query });
  if (!validation.success) {
    return Response.json({ error: 'Invalid search query' }, { status: 400 });
  }

  // ... rest of handler using validation.data.query
}
```

## H6-SEC: No CSRF Protection on State-Changing APIs

**Problem**: POST/PATCH/DELETE endpoints don't validate CSRF tokens.

**Required Fix**:
Since this is an API consumed from Whop iframe (same-origin), implement Origin header validation:

```typescript
// lib/security/csrf.ts
export function validateOrigin(request: Request): boolean {
  const origin = request.headers.get('Origin');
  const referer = request.headers.get('Referer');

  // Allow if no Origin (same-origin requests don't send it)
  if (!origin) return true;

  // Allow Whop domains and our own domain
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    'https://whop.com',
    'https://dash.whop.com',
  ].filter(Boolean);

  return allowedOrigins.some(allowed =>
    origin === allowed || origin.startsWith(allowed + '/')
  );
}

// Apply to state-changing endpoints:
export async function POST(req: Request) {
  if (!validateOrigin(req)) {
    return Response.json({ error: 'Invalid origin' }, { status: 403 });
  }
  // ... rest of handler
}
```

</high_security_issues>

<implementation_steps>

1. **Add `isAdmin()` function to auth**:
   - Read `lib/whop/simple-auth.ts`
   - Add `isAdmin()` function
   - Add `ADMIN_USER_IDS` to `.env.example`

2. **Protect all admin routes**:
   - Add `isAdmin()` check to all files in `app/api/admin/`

3. **Fix webhook signature bypass**:
   - Read `app/api/webhooks/whop/route.ts`
   - Change the "no secret" case from warn to error/reject

4. **Add replay attack prevention**:
   - Add idempotency check using WebhookEvent model
   - Add timestamp validation (5 minute window)

5. **Add rate limiting**:
   - Verify `lib/security/rate-limit-utils.ts` exists
   - Apply to sensitive API routes

6. **Fix SQL injection risk**:
   - Read `app/api/creator/custom-rates/search/route.ts`
   - Ensure Prisma parameterized queries are used
   - Add Zod input validation

7. **Add CSRF/Origin validation**:
   - Create `lib/security/csrf.ts` with `validateOrigin()`
   - Apply to state-changing endpoints

8. **Update .env.example**:
   - Add `ADMIN_USER_IDS=user_xxx,user_yyy`

</implementation_steps>

<verification>
After completing all fixes:

1. **Build passes**: `npm run build` completes without errors

2. **Admin routes protected**:
   - Non-admin user accessing `/api/admin/*` → 403

3. **Webhook security**:
   - Missing secret → 500 error (not silent bypass)
   - Replay same webhook ID → "already_processed"
   - Old timestamp → 400 error

4. **Rate limiting active**:
   - Rapid requests → 429 after limit

5. **Input validation**:
   - Special characters in search → 400 error

</verification>

<success_criteria>
- All 6 HIGH security issues are fixed
- Admin routes require admin authentication
- Webhooks reject when secret is missing
- Replay attacks are prevented
- Rate limiting is applied to sensitive endpoints
- SQL injection is prevented
- CSRF/Origin validation is in place
- Build passes with no errors
</success_criteria>

<output>
After fixing, update the audit report:
- Edit `./reviews/001-prelaunch-audit-report.md`
- Change H1-SEC through H6-SEC status from OPEN to FIXED
- Update the executive summary counts
</output>
