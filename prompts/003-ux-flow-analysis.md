<objective>
Analyze the complete user experience flows in Referral Flywheel to identify gaps, confusing patterns, dead ends, or missing features before app store launch.

You are reviewing this as both a UX expert AND the target user (Whop community members who want to earn affiliate commissions). Find anything that would frustrate users or prevent them from successfully using the app.
</objective>

<context>
Referral Flywheel has two user types:
1. **Members** - Community members who get referral links and earn 10% commissions
2. **Creators** - Community owners who manage the referral program

The app runs inside Whop's iframe. Users don't sign up separately - they access via their Whop membership.

Read project context:
@.claude/CLAUDE.md
</context>

<user_journeys_to_analyze>
Walk through each journey step-by-step, identifying friction points:

## Member Journey

1. **First Access**
   - Member opens app from Whop community
   - What do they see first?
   - Is it immediately clear what this app does?
   - Is there an onboarding flow?

2. **Getting Their Referral Link**
   - How do they find their unique link?
   - Is it prominently displayed?
   - Can they easily copy it?
   - What share options exist?

3. **Understanding Earnings**
   - Is the 10% commission clear?
   - Do they understand tiered commissions (15%/18%)?
   - Can they see projected earnings?
   - Is the calculator intuitive?

4. **Tracking Progress**
   - Can they see their referrals?
   - Is earnings history visible?
   - Are leaderboard rankings motivating?
   - Do they understand their tier progress?

5. **Whop Username Setup (CRITICAL)**
   - Is it clear they need to set this up?
   - What happens if they skip it?
   - Can they fix it later?

## Creator Journey

1. **First Installation**
   - Is onboarding complete and clear?
   - Are the pricing terms (10/70/20) explained well?
   - Can they customize rewards?

2. **Managing Community**
   - Can they see top performers?
   - Can they export data?
   - Are analytics useful?

3. **Monitoring Revenue**
   - Is the revenue dashboard clear?
   - Do they understand referral vs organic?

## Referral Journey

1. **Click Referral Link**
   - What happens when someone clicks /r/CODE?
   - Is the redirect seamless?
   - What if the referrer has no whopUsername set?
</user_journeys_to_analyze>

<files_to_examine>
Member dashboard and components:
@app/customer/[experienceId]/page.tsx
@components/dashboard/CompactReferralLinkCard.tsx (if exists)
@components/dashboard/EarningsCalculator.tsx
@components/dashboard/StatsGrid.tsx (if exists)
@components/dashboard/MemberOnboardingModal.tsx (if exists)
@components/dashboard/WhopUsernameSetup.tsx

Creator dashboard:
@app/seller-product/[companyId]/page.tsx (if exists)
@app/seller-product/[companyId]/onboarding/page.tsx

Entry point:
@app/page.tsx

Discover/landing:
@app/discover/page.tsx

Error pages:
@app/not-found.tsx
</files_to_examine>

<ux_checklist>
Verify each item:

**Clarity**
- [ ] Value proposition immediately clear
- [ ] Commission rates prominently displayed
- [ ] Referral link easy to find and copy
- [ ] Progress toward next tier visible

**Completeness**
- [ ] All promised features exist
- [ ] No dead-end states
- [ ] Error messages are helpful
- [ ] Empty states have guidance

**Consistency**
- [ ] Design language consistent throughout
- [ ] Similar actions work the same way
- [ ] Navigation is predictable

**Motivation**
- [ ] Gamification elements encourage action
- [ ] Leaderboard is engaging
- [ ] Earnings projections are exciting
- [ ] Tier upgrades feel rewarding

**Mobile**
- [ ] Responsive on all screen sizes
- [ ] Touch targets appropriately sized
- [ ] Text readable without zooming
</ux_checklist>

<output_format>
Create findings report at:
`./reviews/003-ux-flow-findings.md`

Structure:

# UX Flow Analysis - Pre-Launch Review

## Member Experience Score: X/10
[Summary of member journey quality]

## Creator Experience Score: X/10
[Summary of creator journey quality]

## CRITICAL UX Issues
[Blocking issues - users can't complete core tasks]

## HIGH Priority Issues
[Confusing flows, missing expected features]

## MEDIUM Priority Issues
[Polish, improvements, nice-to-haves]

## Feature Gaps
[Features that would make this the "best affiliate tracking app"]

## User Flow Diagrams
[Text-based diagrams of critical paths]

## Recommendations by Priority
1. [Must fix before launch]
2. [Should fix soon after]
3. [Nice to have]
</output_format>

<verification>
1. Actually walk through member flow as a new user
2. Walk through creator onboarding completely
3. Test what happens with various edge cases (no referrals, no earnings)
4. Check mobile responsiveness
5. Verify all links and buttons work
</verification>

<success_criteria>
- All user journeys documented
- UX issues categorized by severity
- Specific improvement recommendations
- Feature gaps for "best affiliate app" identified
- Report saved to ./reviews/003-ux-flow-findings.md
</success_criteria>
