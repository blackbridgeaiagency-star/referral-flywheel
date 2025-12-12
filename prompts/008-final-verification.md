<objective>
Perform final verification that all 37 audit issues have been fixed and the application is ready for launch.

This is the FINAL quality gate before public launch. Every issue from the audit report should be verified as fixed, and the application should build cleanly with no regressions.
</objective>

<context>
**Project**: Referral Flywheel - Viral growth engine for Whop communities
**Tech Stack**: Next.js 14.0.4, TypeScript, Prisma, PostgreSQL

Read `.claude/CLAUDE.md` for full project context.
Read `./reviews/001-prelaunch-audit-report.md` for the original audit findings.

**Prerequisite**: Prompts 003-007 must be completed first.
</context>

<verification_checklist>

## Security Verification (17 issues)

### CRITICAL Security (5) - MUST ALL BE FIXED

- [ ] **C1-SEC**: `simple-auth.ts` returns `false` by default, only `true` when verified
- [ ] **C2-SEC**: `/api/creator/onboarding` requires authorization check
- [ ] **C3-SEC**: `/api/creator/rewards` requires authorization check
- [ ] **C4-SEC**: `/api/member/update-code` requires authorization check
- [ ] **C5-SEC**: Debug endpoints deleted or protected

Verification:
```bash
# Check auth functions don't just return true
grep -A5 "canAccessCreatorDashboard" lib/whop/simple-auth.ts
grep -A5 "canAccessMemberDashboard" lib/whop/simple-auth.ts

# Check debug endpoints are gone
ls app/api/debug/ 2>/dev/null && echo "WARNING: Debug endpoints still exist!"
```

### HIGH Security (6) - ALL SHOULD BE FIXED

- [ ] **H1-SEC**: Admin routes protected with `isAdmin()` check
- [ ] **H2-SEC**: Webhook rejects when `WHOP_WEBHOOK_SECRET` not set
- [ ] **H3-SEC**: Webhook has replay attack prevention (idempotency check)
- [ ] **H4-SEC**: Rate limiting applied to sensitive endpoints
- [ ] **H5-SEC**: SQL injection prevented (Prisma parameterized queries)
- [ ] **H6-SEC**: Origin/CSRF validation on state-changing endpoints

Verification:
```bash
# Check admin routes have isAdmin()
grep -l "isAdmin" app/api/admin/*.ts

# Check webhook doesn't skip signature validation
grep -A10 "WHOP_WEBHOOK_SECRET" app/api/webhooks/whop/route.ts
```

### MEDIUM Security (4) - ALL SHOULD BE FIXED

- [ ] **M1-SEC**: Error handlers don't expose stack traces in production
- [ ] **M2-SEC**: Content-Type validation on JSON endpoints
- [ ] **M3-SEC**: Input length limits enforced
- [ ] **M4-SEC**: Temporary member emails not predictable

## SSOT Verification (8 issues)

- [ ] **SSOT-001**: Tier systems clearly differentiated (Commission Level vs Reward Tier)
- [ ] **SSOT-002**: Commission thresholds configurable via Creator model fields
- [ ] **SSOT-003**: `formatCurrency` exists in ONE place only
- [ ] **SSOT-004**: Query implementations consolidated to centralized-queries.ts
- [ ] **SSOT-005**: `totalReferred` calculated from Commission records, not cached
- [ ] **SSOT-006**: Commission rates defined in constants file
- [ ] **SSOT-007**: Attribution window defined in ONE constant
- [ ] **SSOT-008**: Tier names consistent within each system

Verification:
```bash
# Check formatCurrency has single source
grep -r "formatCurrency" --include="*.ts" -l | sort -u

# Check commission rates are in constants
grep -r "0.10\|0.70\|0.20" --include="*.ts" | grep -v constants
```

## Code Quality Verification (12 issues)

- [ ] **C1-CODE**: No hardcoded tokens in client-side code
- [ ] **H1-CODE**: `any` type usage significantly reduced
- [ ] **H2-CODE**: `console.log` replaced with logger
- [ ] **H3-CODE**: Duplicate functions consolidated
- [ ] **H4-CODE**: TODO comments resolved or removed
- [ ] **Medium**: Empty catch blocks fixed
- [ ] **Medium**: Magic numbers replaced with constants
- [ ] **Medium**: Long functions decomposed where practical
- [ ] **Medium**: Error handling patterns consistent
- [ ] **Medium**: async/await used consistently
- [ ] **Dead code**: Unused imports removed
- [ ] **Dead code**: Deprecated files removed

Verification:
```bash
# Count any types (should be reduced)
grep -r ": any" --include="*.ts" --include="*.tsx" | wc -l

# Count console.log (should be minimal)
grep -r "console.log" --include="*.ts" --include="*.tsx" | wc -l

# Check for TODOs
grep -r "TODO" --include="*.ts" --include="*.tsx"
```

## Functionality Verification (5 issues)

- [ ] **F1**: Member auto-creation uses Whop context, not defaultCreator
- [ ] **F2**: WhopUsername setup is required/blocking
- [ ] **F3**: Tier display clearly differentiated (addressed in SSOT)
- [ ] **F4**: Attribution window consistently enforced
- [ ] **F5**: Streak reset uses UTC dates

</verification_checklist>

<build_verification>

## 1. TypeScript Compilation
```bash
npx tsc --noEmit
```
Expected: No errors

## 2. Next.js Build
```bash
npm run build
```
Expected: Successful build with no errors

## 3. Lint Check
```bash
npm run lint
```
Expected: No errors (warnings acceptable)

## 4. Database Schema
```bash
npx prisma generate
npx prisma validate
```
Expected: Schema is valid

</build_verification>

<manual_test_scenarios>

## Authentication Tests
1. Access `/customer/random-id` without being that member → Should show error/redirect
2. Access `/seller-product/random-id` without being that creator → Should show error/redirect
3. Call `/api/admin/stats` without admin role → Should return 403

## Core Flow Tests
1. Generate referral link → Link should include referral code
2. Click referral link → Should redirect to Whop with ?a= parameter
3. Dashboard loads → Should show correct stats for logged-in user

## Error Handling Tests
1. Send invalid JSON to POST endpoint → Should return 400 with safe message
2. Send very large payload → Should return 400
3. Cause server error → Should not expose stack trace

</manual_test_scenarios>

<final_report_update>

After all verifications pass, update the audit report:

1. Open `./reviews/001-prelaunch-audit-report.md`

2. Update Executive Summary:
```markdown
| Category | Issues Found | Fixed | Critical | High | Medium | Low |
|----------|--------------|-------|----------|------|--------|-----|
| Security | 17 | 17 | 5 | 6 | 4 | 2 |
| SSOT Violations | 8 | 8 | 2 | 3 | 3 | 0 |
| Code Quality | 12 | 12 | 1 | 4 | 5 | 2 |
| **TOTAL** | **37** | **37** | **8** | **13** | **12** | **4** |
```

3. Update "Remaining Actions Before Launch":
```markdown
### Remaining Actions Before Launch
- [x] Fix all 5 CRITICAL security vulnerabilities
- [x] Implement proper Whop-based authentication
- [x] Remove or protect debug endpoints
- [x] Consolidate tier systems into single source of truth
- [x] Remove hardcoded secrets from client code
- [x] Run `npm run build` to verify no breaking changes
```

4. Change all issue statuses from OPEN to FIXED

5. Add completion note:
```markdown
---

## Audit Completion

**Completed**: [current date]
**All 37 issues**: FIXED

The application has passed the pre-launch audit and is ready for production deployment.
```

</final_report_update>

<success_criteria>
- All 37 issues verified as fixed
- `npm run build` passes with no errors
- `npm run lint` passes with no errors
- TypeScript compilation passes with no errors
- Audit report updated with all issues marked FIXED
- Application is ready for launch
</success_criteria>

<output>
Create a final status summary at `./reviews/LAUNCH_READY.md`:

```markdown
# Launch Readiness Confirmation

**Date**: [current date]
**Verified by**: Claude Code

## Audit Status
- Total issues identified: 37
- Total issues fixed: 37
- Critical issues remaining: 0
- High issues remaining: 0

## Build Status
- TypeScript: ✅ Passes
- Next.js Build: ✅ Passes
- Lint: ✅ Passes
- Database Schema: ✅ Valid

## Security Status
- Authentication: ✅ Implemented
- Authorization: ✅ All endpoints protected
- Debug endpoints: ✅ Removed
- Webhook security: ✅ Signature + replay prevention

## Recommendation
**READY FOR LAUNCH** ✅

All critical issues have been resolved. The application meets security and quality standards for production deployment.

## Post-Launch Monitoring
- Monitor webhook processing for errors
- Watch for unauthorized access attempts (403 logs)
- Track rate limit hits
- Monitor error rates
```
</output>
