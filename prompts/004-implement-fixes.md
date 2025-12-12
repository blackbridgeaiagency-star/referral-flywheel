<objective>
Implement all fixes identified in the previous three review phases. This is the action phase - take the findings and make the codebase production-ready for Whop App Store launch.

You have access to the review reports and should fix issues in priority order: CRITICAL → HIGH → MEDIUM. Skip LOW priority for now.
</objective>

<context>
This prompt runs AFTER the three review prompts have completed. Read their outputs:

@./reviews/001-security-code-quality-findings.md
@./reviews/002-whop-integration-findings.md
@./reviews/003-ux-flow-findings.md

Also read project conventions:
@.claude/CLAUDE.md
</context>

<implementation_rules>
1. **Fix in Priority Order**: CRITICAL issues first, then HIGH, then MEDIUM
2. **Test After Each Fix**: Run `npx tsc --noEmit` after code changes
3. **Document Changes**: Keep track of what you changed
4. **Don't Over-Engineer**: Make minimal changes to fix issues
5. **Preserve Business Logic**: Never change the 10/70/20 split or tier thresholds
</implementation_rules>

<fix_categories>

## Security Fixes
- Add missing input validation
- Fix any XSS vulnerabilities
- Ensure webhook signature validation is bulletproof
- Remove sensitive data from logs/responses
- Add missing rate limiting

## Integration Fixes
- Fix any attribution bugs
- Correct commission calculation errors
- Handle edge cases in webhook processing
- Add missing error handling for Whop API calls

## UX Fixes
- Fix broken or confusing flows
- Add missing empty states
- Improve error messages
- Fix mobile responsiveness issues
- Make referral link more prominent

## Code Quality Fixes
- Replace `any` types with proper types
- Remove console.log statements (use logger instead)
- Fix TypeScript errors
- Remove dead/unused code
</fix_categories>

<files_likely_to_modify>
Based on typical issues, you may need to modify:

@app/api/webhooks/whop/route.ts
@app/api/leaderboard/route.ts
@app/r/[code]/route.ts
@app/customer/[experienceId]/page.tsx
@app/page.tsx
@lib/utils/commission.ts
@lib/data/centralized-queries.ts
@components/dashboard/EarningsCalculator.tsx
@components/dashboard/WhopUsernameSetup.tsx
</files_likely_to_modify>

<output_format>
After implementing fixes, create a summary at:
`./reviews/004-fixes-implemented.md`

Structure:

# Fixes Implemented - Pre-Launch

## Summary
- Total issues fixed: X
- CRITICAL fixed: X/X
- HIGH fixed: X/X
- MEDIUM fixed: X/X

## Changes Made

### Security Fixes
| File | Change | Issue Resolved |
|------|--------|----------------|
| ... | ... | ... |

### Integration Fixes
| File | Change | Issue Resolved |
|------|--------|----------------|
| ... | ... | ... |

### UX Fixes
| File | Change | Issue Resolved |
|------|--------|----------------|
| ... | ... | ... |

### Code Quality Fixes
| File | Change | Issue Resolved |
|------|--------|----------------|
| ... | ... | ... |

## Deferred Issues (LOW priority)
[List issues not fixed in this pass]

## Verification
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` succeeds
- [ ] Dev server runs without errors
- [ ] Key user flows still work

## Ready for Launch?
[YES/NO with explanation]
</output_format>

<verification>
After all fixes:

1. Run TypeScript check:
   `npx tsc --noEmit`

2. Run build:
   `npm run build`

3. Check dev server:
   `npm run dev`

4. Test critical flows manually:
   - Access member dashboard
   - Access creator dashboard
   - Verify referral link redirect works
</verification>

<success_criteria>
- ALL CRITICAL issues fixed
- ALL HIGH issues fixed (or documented why not)
- Most MEDIUM issues fixed
- TypeScript passes with no errors
- Build succeeds
- Dev server runs
- Summary report saved to ./reviews/004-fixes-implemented.md
- App is production-ready for Whop App Store
</success_criteria>
