<objective>
Fix all 4 MEDIUM severity security issues and 5 functionality issues identified in the pre-launch audit report.

These are important polish items that improve security and user experience:
- Sensitive data in error messages
- Missing content-type validation
- Input length limits
- Functionality gaps in user flows
</objective>

<context>
**Project**: Referral Flywheel - Viral growth engine for Whop communities
**Tech Stack**: Next.js 14.0.4, TypeScript, Prisma, PostgreSQL

Read `.claude/CLAUDE.md` for full project context.
Read `./reviews/001-prelaunch-audit-report.md` for complete audit findings.

**Prerequisite**: Critical and High security fixes should be completed first.
</context>

<medium_security_issues>

## M1-SEC: Sensitive Data in Error Messages

**Problem**: Some error handlers return stack traces or internal details.

**Required Fix**:

1. Create production-safe error handler:
```typescript
// lib/utils/error-handler.ts
import logger from '@/lib/logger';

export function handleApiError(error: unknown, context: string): Response {
  // Log full error for debugging
  logger.error(`${context} failed`, {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });

  // Return safe error to client
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    // Generic message in production
    return Response.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }

  // More detail in development
  return Response.json(
    {
      error: error instanceof Error ? error.message : 'Unknown error',
      // Never include stack trace in response
    },
    { status: 500 }
  );
}
```

2. Update all API routes to use this handler:
```typescript
try {
  // ... handler logic
} catch (error) {
  return handleApiError(error, 'Creating commission');
}
```

## M2-SEC: Missing Content-Type Validation

**Problem**: API routes don't validate request Content-Type headers.

**Required Fix**:

Create middleware helper:
```typescript
// lib/utils/request-validation.ts
export function validateContentType(request: Request, expected: string = 'application/json'): boolean {
  const contentType = request.headers.get('Content-Type');
  return contentType?.includes(expected) ?? false;
}

// Usage in API routes:
export async function POST(req: Request) {
  if (!validateContentType(req)) {
    return Response.json(
      { error: 'Content-Type must be application/json' },
      { status: 415 }
    );
  }

  const body = await req.json();
  // ... rest of handler
}
```

Apply to all POST/PATCH/PUT routes that expect JSON.

## M3-SEC: No Input Length Limits

**Problem**: Large payloads could cause memory issues.

**Required Fix**:

1. Add request body size limit:
```typescript
// lib/utils/request-validation.ts
export async function parseJsonBody<T>(
  request: Request,
  maxSizeBytes: number = 100 * 1024 // 100KB default
): Promise<T | null> {
  const contentLength = request.headers.get('Content-Length');

  if (contentLength && parseInt(contentLength) > maxSizeBytes) {
    return null;
  }

  try {
    const body = await request.text();
    if (body.length > maxSizeBytes) {
      return null;
    }
    return JSON.parse(body) as T;
  } catch {
    return null;
  }
}

// Usage:
export async function POST(req: Request) {
  const body = await parseJsonBody<CreateMemberRequest>(req);
  if (!body) {
    return Response.json({ error: 'Invalid or too large request body' }, { status: 400 });
  }
  // ... rest of handler
}
```

2. Add string length validation with Zod:
```typescript
const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  code: z.string().min(4).max(20),
});
```

## M4-SEC: Insecure Default for New Members

**Problem**: Auto-created members get predictable temporary email pattern.

**Current**:
```typescript
email: `member@${params.experienceId}.temp`
```

**Required Fix**:

1. Use a more secure temporary placeholder:
```typescript
import crypto from 'crypto';

const tempId = crypto.randomBytes(16).toString('hex');
email: `pending-${tempId}@temp.referralflywheel.com`
```

2. Better approach - mark email as pending:
```typescript
// In schema.prisma, add:
emailVerified Boolean @default(false)

// In member creation:
email: '', // Empty until webhook provides real email
emailVerified: false,
```

3. Ensure real email is populated from Whop webhook data when available.

</medium_security_issues>

<functionality_issues>

## F1: Member Auto-Creation Uses defaultCreator

**Problem**: Uses "defaultCreator" fallback which may assign wrong creator.

**File**: `app/customer/[experienceId]/page.tsx`

**Current**:
```typescript
const defaultCreator = await prisma.creator.findFirst({
  orderBy: { createdAt: 'desc' },
});
```

**Required Fix**:

The proper approach is to determine the creator from the membership context:

```typescript
// Try to get creator from Whop context headers
const whopContext = await getWhopContext();
const companyId = whopContext.companyId;

if (companyId) {
  // Find creator by company ID from Whop headers
  const creator = await prisma.creator.findUnique({
    where: { companyId },
    select: { id: true, companyId: true }
  });

  if (creator) {
    // Create member with correct creator
    member = await prisma.member.create({
      data: {
        membershipId: params.experienceId,
        creatorId: creator.id,
        // ... other fields
      }
    });
  }
}

// If no company context, return error instead of using default
if (!member) {
  throw new Error('Unable to determine creator for membership. Please access through Whop.');
}
```

## F2: WhopUsername Setup Not Enforced

**Problem**: Members can skip WhopUsername setup, breaking their referral links.

**File**: `components/dashboard/WhopUsernameSetup.tsx`

**Required Fix**:

1. Make it a blocking modal instead of dismissable banner:
```typescript
// In MemberDashboard, if whopUsername is not set:
if (!data.whopUsername) {
  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white">
      <WhopUsernameSetup
        memberId={data.memberId}
        currentWhopUsername={data.whopUsername}
        referralCode={data.referralCode}
        required={true}  // New prop to make it blocking
        onComplete={() => router.refresh()}
      />
    </div>
  );
}
```

2. Update WhopUsernameSetup component to support required mode:
- Hide dismiss/skip button when `required={true}`
- Show clear explanation of why it's needed
- Prevent closing modal until username is set

## F3: Tier Display Confusion

**Problem**: Two different tier systems shown to users without clear differentiation.

**Already addressed in SSOT-001 and SSOT-008 fixes.**

## F4: Attribution Window Not Enforced Consistently

**Problem**: 30-day attribution window not enforced consistently.

**Required Fix**:

1. Already addressed in SSOT-007 (single constant).

2. Verify webhook handler checks attribution timing:
```typescript
// In webhook handler, when processing referral:
const attributionClick = await prisma.attributionClick.findFirst({
  where: {
    referralCode,
    clickedAt: {
      gte: new Date(Date.now() - ATTRIBUTION_WINDOW_MS),
    },
  },
});

if (!attributionClick) {
  logger.info('Referral outside attribution window', { referralCode });
  // Process without affiliate attribution
}
```

Note: Strategy B (Whop native) handles attribution differently. This applies to Strategy A fallback.

## F5: Streak Reset Timezone Handling

**Problem**: Edge case with timezone handling for daily streak reset.

**Required Fix**:

Ensure streak logic uses UTC consistently:

```typescript
// lib/utils/streak-calculator.ts
export function isNewReferralDay(lastReferralDate: Date | null): boolean {
  if (!lastReferralDate) return true;

  // Use UTC dates to avoid timezone issues
  const today = new Date();
  const todayUTC = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());

  const last = new Date(lastReferralDate);
  const lastUTC = Date.UTC(last.getUTCFullYear(), last.getUTCMonth(), last.getUTCDate());

  return todayUTC > lastUTC;
}

export function isConsecutiveDay(lastReferralDate: Date | null): boolean {
  if (!lastReferralDate) return false;

  const today = new Date();
  const todayUTC = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());

  const last = new Date(lastReferralDate);
  const lastUTC = Date.UTC(last.getUTCFullYear(), last.getUTCMonth(), last.getUTCDate());

  const oneDayMs = 24 * 60 * 60 * 1000;
  return (todayUTC - lastUTC) === oneDayMs;
}
```

</functionality_issues>

<implementation_steps>

1. **Fix M1-SEC** (error messages):
   - Create error-handler.ts
   - Update all API routes to use safe error handler

2. **Fix M2-SEC** (content-type):
   - Add validateContentType helper
   - Apply to POST/PATCH/PUT routes

3. **Fix M3-SEC** (input limits):
   - Add parseJsonBody with size limit
   - Add Zod string length validations

4. **Fix M4-SEC** (temporary email):
   - Use random placeholder or empty string
   - Mark email as unverified

5. **Fix F1** (defaultCreator):
   - Get creator from Whop context
   - Fail gracefully if not available

6. **Fix F2** (WhopUsername):
   - Make setup required/blocking
   - Can't use dashboard until set

7. **Fix F4** (attribution window):
   - Verify constant is used everywhere
   - Check webhook handler

8. **Fix F5** (streak timezone):
   - Use UTC consistently
   - Test across day boundaries

</implementation_steps>

<verification>
After completing all fixes:

1. **Build passes**: `npm run build` completes without errors

2. **Error messages safe**:
   - Trigger an error in production mode
   - Response should not contain stack trace

3. **Content-Type enforced**:
   - Send POST without Content-Type header
   - Should return 415 error

4. **Large payloads rejected**:
   - Send > 100KB payload
   - Should return 400 error

5. **Member creation**:
   - New member gets correct creator
   - WhopUsername setup is required before full dashboard access

</verification>

<success_criteria>
- All 4 MEDIUM security issues are fixed
- All 5 functionality issues are fixed
- Error messages don't leak sensitive data
- Input validation is comprehensive
- User flows work smoothly end-to-end
- Build passes with no errors
</success_criteria>

<output>
After fixing, update the audit report:
- Edit `./reviews/001-prelaunch-audit-report.md`
- Change M1-SEC through M4-SEC status from OPEN to FIXED
- Change F1 through F5 status from OPEN to FIXED
- Update the executive summary counts
</output>
