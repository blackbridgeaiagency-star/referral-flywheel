<objective>
Conduct a thorough code quality and security audit of the Referral Flywheel application before Whop App Store launch.

This is a pre-launch review - any issues found could prevent successful deployment or cause production incidents. You are acting as a senior software engineer with expertise in Next.js, TypeScript, and affiliate tracking systems.
</objective>

<context>
Referral Flywheel is a Whop app that turns every community member into an affiliate with 10% lifetime commissions. The app handles:
- Payment webhooks from Whop
- Commission calculations (10% member / 70% creator / 20% platform)
- Member and creator dashboards
- Referral link tracking via Whop's native ?a= parameter (Strategy B)

Tech Stack: Next.js 14 (App Router), TypeScript, Prisma, PostgreSQL (Supabase), Tailwind CSS

First, read the project conventions:
@.claude/CLAUDE.md
</context>

<audit_scope>
Thoroughly analyze these critical areas:

1. **Security Vulnerabilities (CRITICAL)**
   - SQL injection risks in Prisma queries
   - XSS vulnerabilities in user-rendered content
   - CSRF protection on API routes
   - Webhook signature validation
   - Rate limiting implementation
   - Sensitive data exposure in logs or responses
   - Environment variable handling

2. **Error Handling & Resilience**
   - Uncaught exceptions that could crash the app
   - Missing try/catch blocks in async operations
   - Database connection error handling
   - External API failure handling (Whop API)
   - Graceful degradation patterns

3. **Type Safety & Code Quality**
   - TypeScript strict mode compliance
   - Any `any` types that should be properly typed
   - Null/undefined handling
   - Unused imports or dead code
   - Console.log statements that shouldn't be in production

4. **Database & Performance**
   - N+1 query patterns
   - Missing indexes for frequent queries
   - Transaction handling for multi-step operations
   - Connection pooling configuration
</audit_scope>

<files_to_examine>
Read and analyze these critical files:

API Routes (highest priority):
@app/api/webhooks/whop/route.ts
@app/api/leaderboard/route.ts
@app/api/referrals/stats/route.ts
@app/api/creator/[companyId]/onboarding/route.ts
@app/api/member/whop-username/route.ts

Security utilities:
@lib/security/rate-limit-utils.ts (if exists)
@lib/utils/webhook-retry.ts (if exists)

Database layer:
@lib/db/prisma.ts
@lib/data/centralized-queries.ts
@prisma/schema.prisma

Core business logic:
@lib/utils/commission.ts
@lib/utils/tiered-commission.ts
@lib/utils/referral-code.ts
@app/r/[code]/route.ts
</files_to_examine>

<output_format>
Create a detailed findings report at:
`./reviews/001-security-code-quality-findings.md`

Structure the report as:

# Code Quality & Security Audit - Pre-Launch Review

## CRITICAL Issues (Must Fix Before Launch)
[Issues that could cause security breaches, data loss, or production crashes]

## HIGH Priority Issues
[Issues that could cause user-facing bugs or performance problems]

## MEDIUM Priority Issues
[Code quality improvements, technical debt]

## LOW Priority Issues
[Nice-to-haves, minor improvements]

## Summary
- Total issues found: X
- Critical: X | High: X | Medium: X | Low: X

For each issue, include:
- **Location**: File path and line number
- **Issue**: Clear description of the problem
- **Risk**: What could go wrong
- **Fix**: Specific code change needed
</output_format>

<verification>
Before completing:
1. Verify you've read ALL files in the files_to_examine list
2. Confirm each critical area in audit_scope has been checked
3. Ensure every issue has a specific, actionable fix recommendation
4. Run `npx tsc --noEmit` to check for TypeScript errors
</verification>

<success_criteria>
- All API routes audited for security vulnerabilities
- Webhook signature validation confirmed working
- Database queries checked for injection risks
- Error handling patterns verified
- Report saved to ./reviews/001-security-code-quality-findings.md
- Ready to pass findings to next review phase
</success_criteria>
