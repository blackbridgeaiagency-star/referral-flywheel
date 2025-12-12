<objective>
Fix all 5 CRITICAL security vulnerabilities identified in the pre-launch audit report.

This is the HIGHEST PRIORITY task that MUST be completed before launch. These vulnerabilities allow:
- Complete authentication bypass (anyone can access any dashboard)
- IDOR attacks (users can modify other users' data)
- Debug endpoint information disclosure

The application is a referral/affiliate system for Whop communities. Security is paramount because it handles financial data (commissions) and user data.
</objective>

<context>
**Project**: Referral Flywheel - Viral growth engine for Whop communities
**Tech Stack**: Next.js 14.0.4, TypeScript, Prisma, PostgreSQL
**Auth Method**: Whop iframe authentication (headers: X-Whop-User-Id, X-Whop-Company-Id)

Read `.claude/CLAUDE.md` for full project context.
Read `./reviews/001-prelaunch-audit-report.md` for complete audit findings.

**Critical Files to Fix**:
1. `lib/whop/simple-auth.ts` - Authentication bypass (C1-SEC)
2. `app/api/creator/onboarding/route.ts` - IDOR vulnerability (C2-SEC)
3. `app/api/creator/rewards/route.ts` - IDOR vulnerability (C3-SEC)
4. `app/api/member/update-code/route.ts` - IDOR vulnerability (C4-SEC)
5. `app/api/debug/*` - Debug endpoints exposed (C5-SEC)
</context>

<critical_issues>

## C1-SEC: Authentication Bypass (CRITICAL)

**File**: `lib/whop/simple-auth.ts`

**Current Problem**:
```typescript
export async function canAccessCreatorDashboard(whopId: string): Promise<boolean> {
  return true; // CRITICAL: Always allows access!
}

export async function canAccessMemberDashboard(membershipId: string): Promise<boolean> {
  return true; // CRITICAL: Always allows access!
}
```

**Required Fix**:
Implement real authentication using Whop context headers:

```typescript
export async function canAccessCreatorDashboard(companyId: string): Promise<boolean> {
  const context = await getWhopContext();
  if (!context.userId) return false;

  // Verify user owns this company
  const creator = await prisma.creator.findUnique({
    where: { companyId },
    select: { whopUserId: true }
  });

  // User must be the creator (owner) of this company
  return creator?.whopUserId === context.userId;
}

export async function canAccessMemberDashboard(membershipId: string): Promise<boolean> {
  const context = await getWhopContext();
  if (!context.userId) return false;

  // Verify user owns this membership
  const member = await prisma.member.findUnique({
    where: { membershipId },
    select: { userId: true }
  });

  return member?.userId === context.userId;
}
```

## C2-SEC: IDOR in Creator Onboarding (CRITICAL)

**File**: `app/api/creator/onboarding/route.ts`

**Required Fix**:
Add authorization check at the start of POST handler:

```typescript
import { getWhopContext, canAccessCreatorDashboard } from '@/lib/whop/simple-auth';

export async function POST(req: Request) {
  const body = await req.json();
  const { creatorId, companyId, step, data } = body;

  // AUTHORIZATION CHECK - verify user owns this creator account
  const canAccess = await canAccessCreatorDashboard(companyId);
  if (!canAccess) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // ... rest of handler
}
```

## C3-SEC: IDOR in Rewards API (CRITICAL)

**File**: `app/api/creator/rewards/route.ts`

**Required Fix**: Same pattern as C2 - add authorization check.

## C4-SEC: IDOR in Member Update Code (CRITICAL)

**File**: `app/api/member/update-code/route.ts`

**Required Fix**:
```typescript
import { getWhopContext, canAccessMemberDashboard } from '@/lib/whop/simple-auth';

export async function PATCH(req: Request) {
  const body = await req.json();
  const { memberId, membershipId, newCode } = body;

  // AUTHORIZATION CHECK - verify user owns this member account
  const canAccess = await canAccessMemberDashboard(membershipId);
  if (!canAccess) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // ... rest of handler
}
```

## C5-SEC: Debug Endpoints Exposed (CRITICAL)

**Files**: All files in `app/api/debug/`

**Required Fix**: Delete these files entirely OR protect with admin-only authentication:
- `app/api/debug/check-env/route.ts`
- `app/api/debug/db-test/route.ts`
- `app/api/debug/connection-test/route.ts`
- `app/api/debug/whop-test/route.ts`
- `app/api/debug/whop-params/route.ts`

**Decision**: Delete them. Debug endpoints should not exist in production.

</critical_issues>

<implementation_steps>

1. **First, read the existing auth file**:
   - Read `lib/whop/simple-auth.ts` completely
   - Understand the `getWhopContext()` function
   - See how headers are extracted from Whop iframe

2. **Fix C1-SEC - Authentication**:
   - Modify `canAccessCreatorDashboard()` to verify user owns company
   - Modify `canAccessMemberDashboard()` to verify user owns membership
   - Add database imports and queries
   - Handle edge cases (missing context, missing records)

3. **Fix C2-SEC - Creator Onboarding IDOR**:
   - Read `app/api/creator/onboarding/route.ts`
   - Add authorization check at start of POST handler
   - Return 403 if unauthorized

4. **Fix C3-SEC - Rewards API IDOR**:
   - Read `app/api/creator/rewards/route.ts`
   - Add authorization check to POST and PATCH handlers
   - Return 403 if unauthorized

5. **Fix C4-SEC - Member Update Code IDOR**:
   - Read `app/api/member/update-code/route.ts`
   - Add authorization check to PATCH handler
   - Return 403 if unauthorized

6. **Fix C5-SEC - Delete Debug Endpoints**:
   - Delete all files in `app/api/debug/` directory
   - Verify no other code imports from these files

7. **Verify changes**:
   - Run `npm run build` to ensure no TypeScript errors
   - Check that auth functions are properly exported and imported

</implementation_steps>

<constraints>
**DO NOT**:
- Change any UI/visual appearance
- Modify business logic or commission calculations
- Remove functionality that users rely on
- Skip authorization checks - EVERY state-changing endpoint needs protection

**DO**:
- Use consistent error response format: `{ error: string }` with appropriate status codes
- Log unauthorized access attempts for security monitoring
- Handle edge cases gracefully (missing headers, missing records)
- Ensure backwards compatibility with existing Whop iframe integration
</constraints>

<verification>
After completing all fixes, verify:

1. **Build passes**: `npm run build` completes without errors

2. **Auth logic test** (mental verification):
   - User A accessing User B's dashboard → should return 403
   - User A accessing their own dashboard → should work
   - No headers (direct API access) → should return 403

3. **Debug endpoints removed**:
   - Verify `app/api/debug/` directory is empty or deleted
   - No broken imports in other files

4. **All IDOR endpoints protected**:
   - `/api/creator/onboarding` - POST protected
   - `/api/creator/rewards` - POST/PATCH protected
   - `/api/member/update-code` - PATCH protected
</verification>

<success_criteria>
- All 5 CRITICAL security issues are fixed
- Authentication functions return `false` by default, only `true` when verified
- All state-changing API endpoints verify authorization
- Debug endpoints are deleted
- Build passes with no errors
- No functionality is broken
</success_criteria>

<output>
After fixing, update the audit report status:
- Edit `./reviews/001-prelaunch-audit-report.md`
- Change C1-SEC through C5-SEC status from OPEN to FIXED
- Update the executive summary counts
</output>
