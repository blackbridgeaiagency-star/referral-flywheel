<objective>
Perform a comprehensive pre-launch audit AND improvement pass of the Referral Flywheel application:

1. **Single Source of Truth (SSOT)** - Every data element stored exactly once, all references point to authoritative source
2. **Security hardening** - OWASP top 10, webhook security, auth flows, input validation
3. **Code clarity** - Every piece of code has clear purpose; remove waste
4. **Functionality audit** - Ensure every feature works smoothly as intended; improve flows where beneficial

This is the final quality gate before public launch. Deep understanding of the ENTIRE app is required. You WILL improve functionality where it makes the app run smoother - but you will NOT change the visual appearance/UI design.

**Goal**: After this audit, every user flow should work flawlessly, every data path should be traceable, and the codebase should be tight and purposeful.
</objective>

<context>
**Project**: Referral Flywheel - Viral growth engine for Whop communities
**Tech Stack**: Next.js 14.0.4, TypeScript, Prisma 5.22, PostgreSQL, Tailwind CSS
**Business Model**: Members earn 10% lifetime commission, Creators get 70%, Platform gets 20%

Read `.claude/CLAUDE.md` for full project context and conventions.

**Critical Files to Audit**:
- `prisma/schema.prisma` - Database schema (source of truth)
- `lib/data/centralized-queries.ts` - Data layer queries
- `lib/utils/tiered-commission.ts` - Commission calculations
- `lib/utils/tier-calculator.ts` - Member tier calculations
- `app/api/webhooks/whop/route.ts` - Payment webhook handler
- `app/customer/[experienceId]/page.tsx` - Member dashboard
- `app/seller-product/[companyId]/page.tsx` - Creator dashboard
- All files in `components/dashboard/`
- All files in `app/api/`
- All files in `lib/`
</context>

<audit_phases>

## Phase 1: Deep Understanding Pass
Before making ANY changes, thoroughly understand every part of the application:

1. **Map the entire application**:
   - Read and document purpose of EVERY file
   - Understand how each component connects to others
   - Trace all data flows end-to-end
   - Document all business logic rules

2. **User Journey Mapping**:
   - Member signup → dashboard → referral sharing → earning commissions
   - Creator onboarding → dashboard → viewing analytics → managing rewards
   - Payment webhook → commission creation → member notification
   - Referral click → attribution → conversion tracking

3. **Build mental model**:
   - What is each file's single responsibility?
   - What would break if this file changed?
   - What are the dependencies and dependents?

## Phase 2: Data Flow Mapping (SSOT Analysis)
Thoroughly analyze the entire data flow from database to UI:

1. **Map all data sources**:
   - Identify every Prisma query in the codebase
   - Document which files read from which tables
   - Flag any hardcoded values that should come from database

2. **Trace data transformations**:
   - Follow data from `centralized-queries.ts` through components
   - Verify commission rates (10/70/20) are defined ONCE
   - Verify tier thresholds flow from Creator table → components
   - Check for duplicate calculations or redundant state

3. **Fix SSOT violations**:
   - Constants defined in multiple places → centralize
   - Business logic duplicated across files → single source
   - Hardcoded values that should be configurable → move to database/config
   - Props drilling through multiple layers → consider context or direct queries

## Phase 3: Security Audit (OWASP + Whop-specific)

1. **Authentication & Authorization**:
   - Review `lib/whop/simple-auth.ts` for auth bypass vulnerabilities
   - Check all API routes for proper auth guards
   - Verify webhook signature validation in `app/api/webhooks/whop/route.ts`
   - Check for IDOR (Insecure Direct Object Reference) in dashboard routes

2. **Input Validation**:
   - Audit all user inputs (forms, URL params, query strings)
   - Check for SQL injection in any raw queries
   - Verify Zod schemas validate all expected inputs
   - Check for XSS vulnerabilities in rendered content

3. **Data Exposure**:
   - Ensure no secrets in client-side code
   - Check `.env.example` vs actual env vars needed
   - Verify no sensitive data in error messages
   - Audit API responses for data leakage

4. **Webhook Security**:
   - Verify WHOP_WEBHOOK_SECRET is validated
   - Check for replay attack prevention
   - Audit error handling in webhook processing

## Phase 4: Functionality Audit & Improvement

1. **Core Flow Verification**:
   Test and verify each critical flow works as intended:
   - [ ] Referral link generation works correctly
   - [ ] Attribution tracking captures clicks properly
   - [ ] Webhook processes payments and creates commissions
   - [ ] Dashboard stats update in real-time
   - [ ] Leaderboard rankings calculate correctly
   - [ ] Tier progression works based on referral count
   - [ ] Streak tracking increments/resets properly
   - [ ] Commission calculations are accurate (10/70/20)

2. **Error Handling Improvement**:
   - Ensure graceful degradation when APIs fail
   - Add proper loading states where missing
   - Handle edge cases (new member, no referrals, etc.)
   - Improve error messages for debugging

3. **Performance Optimization**:
   - Identify slow queries and optimize
   - Check for N+1 query problems
   - Verify proper use of caching
   - Ensure efficient re-renders in React components

4. **Flow Smoothness**:
   - Remove friction points in user journeys
   - Ensure data consistency across views
   - Fix any race conditions or timing issues
   - Improve state management where beneficial

## Phase 5: Code Clarity & Cleanup

1. **Dead code removal**:
   - Remove unused imports, functions, components
   - Delete commented-out code
   - Resolve or remove TODO comments

2. **Simplification**:
   - Refactor complex functions into smaller pieces
   - Remove redundant state management
   - Consolidate similar utilities
   - Reduce prop drilling where appropriate

3. **Documentation**:
   - Add comments for non-obvious logic
   - Name magic numbers as constants
   - Ensure function names describe their purpose

</audit_phases>

<constraints>
**DO NOT**:
- Change UI appearance or visual design
- Remove features that users rely on
- Break existing functionality
- Make changes without testing

**DO**:
- Improve how features work internally
- Fix bugs and edge cases
- Optimize performance
- Centralize data and logic
- Remove dead code
- Add error handling
- Make code more maintainable
</constraints>

<output>
Save comprehensive audit report to: `./reviews/001-prelaunch-audit-report.md`

Report structure:
```markdown
# Pre-Launch Comprehensive Audit Report
**Date**: [current date]
**Auditor**: Claude Code
**Scope**: SSOT + Security + Functionality + Code Quality

## Executive Summary
- Total issues found: X
- Issues fixed: X
- Critical: X | High: X | Medium: X | Low: X
- Remaining actions before launch: [list]

## Application Understanding
### File Map
[Every file and its purpose]

### Data Flow Diagram
[Visual representation of data flow]

### User Journeys
[Documented user flows]

## SSOT Findings & Fixes
### Violations Found and Fixed
| ID | Location | Issue | Severity | Status | Fix Applied |
|----|----------|-------|----------|--------|-------------|

### Remaining SSOT Issues
[Any issues that couldn't be fixed with justification]

## Security Findings & Fixes
### Authentication
### Input Validation
### Data Exposure
### Webhook Security

## Functionality Audit
### Core Flows Verified
- [x] Flow 1 - Status
- [x] Flow 2 - Status

### Improvements Made
| Feature | Before | After | Impact |
|---------|--------|-------|--------|

### Performance Optimizations
[List of optimizations applied]

## Code Quality Improvements
### Dead Code Removed
### Simplifications Made
### Documentation Added

## Testing Checklist
[Manual tests to verify changes]

## Files Modified
[Complete list with change summary]
```
</output>

<verification>
Before completing:
1. Every file in `app/`, `lib/`, and `components/` has been reviewed AND understood
2. All user flows tested mentally or via code analysis
3. All SSOT violations either fixed or documented why not
4. Security issues addressed
5. Functionality improvements applied where beneficial
6. Code compiles without errors: `npm run build`
7. No breaking changes to user-facing features
</verification>

<success_criteria>
- Complete understanding of entire application documented
- All data flows traceable from source to UI
- SSOT violations fixed (not just identified)
- Security vulnerabilities addressed
- Core functionality verified working
- Performance optimizations applied
- Dead code removed
- Code is cleaner and more maintainable than before
- Application works smoother than before the audit
</success_criteria>
