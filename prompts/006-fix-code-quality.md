<objective>
Fix all 12 code quality issues identified in the pre-launch audit report.

Code quality improvements ensure:
- Maintainable, readable codebase
- Type safety through proper TypeScript usage
- Clean production code without debug artifacts
- Consistent patterns throughout the application

These are the final polish items before launch.
</objective>

<context>
**Project**: Referral Flywheel - Viral growth engine for Whop communities
**Tech Stack**: Next.js 14.0.4, TypeScript, Prisma, PostgreSQL

Read `.claude/CLAUDE.md` for full project context.
Read `./reviews/001-prelaunch-audit-report.md` for complete audit findings.

**Prerequisite**: Security fixes (003, 004) and SSOT fixes (005) should be completed first.
</context>

<code_quality_issues>

## C1-CODE: Hardcoded Admin Token in Client Code (CRITICAL)

**Problem**: Admin authentication token visible in client-side JavaScript.

**Required Fix**:
1. Search for any hardcoded tokens:
```bash
grep -r "admin" --include="*.tsx" --include="*.ts" | grep -i "token\|key\|secret"
```

2. Remove any hardcoded tokens from client components
3. Move to server-side only (API routes or server components)
4. Use environment variables for admin configuration

Example of what to look for and remove:
```typescript
// BAD - in client component
const ADMIN_TOKEN = 'admin_secret_123';

// GOOD - server-side only
// In API route:
const adminToken = process.env.ADMIN_TOKEN;
```

## H1-CODE: 100+ Uses of `any` Type (HIGH)

**Problem**: TypeScript `any` type used extensively, defeating type safety.

**Files to Check**:
- `app/api/webhooks/whop/route.ts` - Multiple `any` casts
- `lib/data/centralized-queries.ts` - Some return types as `any`
- Various component props typed as `any`

**Required Fix**:

1. Find all `any` usages:
```bash
grep -r ": any" --include="*.ts" --include="*.tsx" | wc -l
```

2. Replace with proper types. Priority order:
   - Webhook payloads → Create Whop webhook types
   - API responses → Create response types
   - Props → Use specific prop types
   - Temporary unknowns → Use `unknown` instead of `any`

Example fixes:
```typescript
// BAD
function processPayment(data: any) { ... }

// GOOD - Define proper types
interface WhopPaymentWebhook {
  id: string;
  event: string;
  data: {
    id: string;
    amount: number;
    currency: string;
    affiliate_account_id?: string;
    // ... other fields
  };
  created_at: string;
}

function processPayment(data: WhopPaymentWebhook) { ... }
```

Create a types file for Whop webhooks:
```typescript
// types/whop-webhooks.ts
export interface WhopWebhookPayload {
  id: string;
  event: string;
  action: string;
  data: WhopWebhookData;
  created_at: string;
}

export interface WhopWebhookData {
  id: string;
  // ... specific to each event type
}

export interface WhopPaymentData extends WhopWebhookData {
  amount: number;
  currency: string;
  affiliate_account_id?: string;
  membership_id?: string;
  user_id?: string;
}

// etc.
```

## H2-CODE: 50+ console.log Statements (HIGH)

**Problem**: Development logging left in production code.

**Required Fix**:

1. Find all console.log statements:
```bash
grep -r "console.log" --include="*.ts" --include="*.tsx"
```

2. Replace with structured logger:
```typescript
// BAD
console.log('Payment processed:', paymentId);

// GOOD - Use the existing logger
import logger from '@/lib/logger';
logger.info('Payment processed', { paymentId });
```

3. Categories for replacement:
   - Debug/development logs → `logger.debug()` or remove
   - Important events → `logger.info()`
   - Warnings → `logger.warn()`
   - Errors → `logger.error()`

4. Also check for:
   - `console.warn` → `logger.warn()`
   - `console.error` → `logger.error()`

## H3-CODE: Duplicate Functions (HIGH)

**Problem**: Functions duplicated across files:
- `formatCurrency` (3 locations) - FIXED in SSOT-003
- Date formatting helpers (multiple)
- Error response handlers (multiple)

**Required Fix**:

1. Date formatting - consolidate:
```typescript
// lib/utils/date-format.ts
import { format, formatDistanceToNow } from 'date-fns';

export function formatDate(date: Date | string): string {
  return format(new Date(date), 'MMM d, yyyy');
}

export function formatDateTime(date: Date | string): string {
  return format(new Date(date), 'MMM d, yyyy h:mm a');
}

export function formatRelative(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}
```

2. Error response handlers - consolidate:
```typescript
// lib/utils/api-response.ts
export function errorResponse(message: string, status: number = 400): Response {
  return Response.json({ error: message }, { status });
}

export function successResponse<T>(data: T, status: number = 200): Response {
  return Response.json(data, { status });
}

export function unauthorizedResponse(): Response {
  return Response.json({ error: 'Unauthorized' }, { status: 401 });
}

export function forbiddenResponse(): Response {
  return Response.json({ error: 'Forbidden' }, { status: 403 });
}
```

## H4-CODE: Incomplete TODO Comments (HIGH)

**Problem**: TODOs indicate incomplete features:
- "TODO: Implement actual Whop auth" - FIXED in 003
- "TODO: Add rate limiting" - FIXED in 004
- "TODO: Validate signature" - FIXED in 004

**Required Fix**:

1. Find all TODOs:
```bash
grep -r "TODO" --include="*.ts" --include="*.tsx"
```

2. For each TODO:
   - If already fixed → Remove the comment
   - If needs fixing → Fix it or create GitHub issue
   - If not applicable → Remove the comment

3. Don't leave TODOs in production code. Either:
   - Fix the issue
   - Create a tracked issue and remove the TODO
   - Document as "won't fix" and remove

## MEDIUM Code Issues

### Empty Catch Blocks

**Problem**: Catch blocks that swallow errors silently.

**Find**:
```bash
grep -r "catch" --include="*.ts" -A 2 | grep -B 1 "{ }"
```

**Fix**:
```typescript
// BAD
try {
  await riskyOperation();
} catch (e) {}

// GOOD
try {
  await riskyOperation();
} catch (error) {
  logger.error('Operation failed', { error });
  // Decide: rethrow, return error, or handle gracefully
}
```

### Magic Numbers

**Problem**: Numbers without explanation.

Already addressed in SSOT-006 and SSOT-007 for commission rates and attribution window.

Check for other magic numbers:
```typescript
// BAD
const limit = 100;
const timeout = 30000;

// GOOD
const MAX_RESULTS_PER_PAGE = 100;
const API_TIMEOUT_MS = 30 * 1000; // 30 seconds
```

### Long Functions

**Problem**: Functions that do too much.

Guidelines:
- Functions should be <50 lines ideally
- Single responsibility principle
- Extract helper functions for complex logic

### Inconsistent Error Handling

**Problem**: Mix of throw, return null, return error objects.

**Standardize**:
- API routes: Return Response with appropriate status
- Internal functions: Throw errors with clear messages
- Async functions: Use try/catch, never .catch() alone

### Mixed async/await and .then()

**Problem**: Inconsistent promise handling.

**Standardize**: Use async/await everywhere:
```typescript
// BAD
function getData() {
  return fetch(url)
    .then(res => res.json())
    .then(data => process(data));
}

// GOOD
async function getData() {
  const res = await fetch(url);
  const data = await res.json();
  return process(data);
}
```

## Dead Code Removal

**Identified Dead Code**:
- `types/jsonwebtoken.d.ts` - Already deleted
- Unused imports in components
- Deprecated query files (addressed in SSOT-004)

**Required Fix**:

1. Run ESLint to find unused imports:
```bash
npm run lint
```

2. Remove unused imports from all files

3. Delete deprecated files marked in SSOT-004:
   - `lib/db/queries-optimized.ts` (if not already deprecated)
   - Any other unused utility files

4. Check for unused exports:
   - Functions exported but never imported elsewhere

</code_quality_issues>

<implementation_steps>

1. **Fix C1-CODE** (hardcoded tokens):
   - Search for any hardcoded secrets
   - Remove from client code
   - Move to server-side/env vars

2. **Fix H1-CODE** (any types):
   - Create `types/whop-webhooks.ts` with proper types
   - Update webhook handler to use types
   - Fix other `any` usages throughout

3. **Fix H2-CODE** (console.log):
   - Search and replace with logger
   - Remove debug-only logs
   - Keep important logs as logger.info()

4. **Fix H3-CODE** (duplicates):
   - Verify formatCurrency is consolidated (from SSOT-003)
   - Create date-format.ts utility
   - Create api-response.ts utility
   - Update all usages

5. **Fix H4-CODE** (TODOs):
   - Find all TODOs
   - Remove completed ones
   - Fix or document remaining ones

6. **Fix Medium issues**:
   - Find and fix empty catch blocks
   - Replace magic numbers with constants
   - Break up long functions where practical
   - Standardize error handling
   - Convert .then() to async/await

7. **Remove dead code**:
   - Run lint to find unused imports
   - Remove deprecated files
   - Clean up unused exports

8. **Final verification**: Run build and lint

</implementation_steps>

<verification>
After completing all fixes:

1. **Build passes**: `npm run build` completes without errors

2. **Lint passes**: `npm run lint` has minimal warnings

3. **Type check**:
```bash
npx tsc --noEmit
```
Should have no errors and reduced `any` usage.

4. **Search verifications**:
```bash
# Should find minimal console.log
grep -r "console.log" --include="*.ts" --include="*.tsx" | wc -l

# Should find no TODOs (or only documented ones)
grep -r "TODO" --include="*.ts" --include="*.tsx"

# Should find minimal any
grep -r ": any" --include="*.ts" --include="*.tsx" | wc -l
```

5. **No hardcoded secrets**:
```bash
grep -ri "token\|secret\|key" --include="*.tsx" # Client files only
```

</verification>

<success_criteria>
- Hardcoded admin token removed from client code
- 80%+ reduction in `any` type usage
- All console.log replaced with logger
- Duplicate functions consolidated
- TODO comments resolved or documented
- Empty catch blocks fixed
- Code builds and lints cleanly
</success_criteria>

<output>
After fixing, update the audit report:
- Edit `./reviews/001-prelaunch-audit-report.md`
- Change all code quality issues status from OPEN to FIXED
- Update the executive summary counts
- Add "Files Modified" section with list of changed files
</output>
