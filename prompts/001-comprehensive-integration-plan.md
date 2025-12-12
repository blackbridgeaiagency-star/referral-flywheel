<objective>
Create a comprehensive, detailed integration plan for incorporating all Priority 1, 2, and 3 implementations into the Referral Flywheel app. This plan will be used with Claude's Plan Mode and then executed via Strong Orchestration.

The goal is to fully integrate:
- Whop Transfers API (auto-pay commissions)
- Referral URL Generator component
- Real-time Leaderboard with polling
- Milestone Progress tracking
- Enhanced Creator Analytics
- Custom Commission Rates per affiliate

This plan must be production-ready, with full notification specifications, database migrations, and E2E testing.
</objective>

<context>
## Project State
- Framework: Next.js 14.0.4 (App Router)
- Database: PostgreSQL (Supabase) with Prisma 5.22.0
- Styling: Tailwind CSS + shadcn/ui (dark purple/indigo theme)
- Auth: Whop SDK integration

## Existing Implementations (Built but not integrated)
The following files exist and are complete but need to be wired into the app:

### Priority 1 - Critical
- `lib/whop/transfers.ts` - Whop Transfers API for automated payouts
- `app/api/webhooks/whop/route.ts` - Enhanced with auto-pay logic

### Priority 2 - Growth
- `app/api/referral/generate-url/route.ts` - URL generation API
- `components/dashboard/ReferralUrlGenerator.tsx` - Sharing UI component
- `app/api/leaderboard/poll/route.ts` - Real-time polling endpoint
- `components/dashboard/RealtimeLeaderboard.tsx` - Live leaderboard component
- `components/dashboard/MilestoneProgress.tsx` - Progress visualization

### Priority 3 - Creator Value
- `app/api/creator/analytics/route.ts` - Enhanced analytics API
- `lib/utils/custom-commission.ts` - Custom rate management

### Notification System (Built)
- `lib/whop/graphql-messaging.ts` - GraphQL DMs (primary channel)
- `lib/whop/notifications.ts` - Push notifications (secondary)
- `lib/whop/messaging.ts` - Router with fallback logic

### Schema Changes Pending
Member model needs these fields (in schema but not migrated):
- customCommissionRate Float?
- customRateSetBy String?
- customRateSetAt DateTime?
- customRateReason String?

## Target Pages for Integration
1. Member Dashboard: `app/customer/[experienceId]/page.tsx`
   - Add: ReferralUrlGenerator, RealtimeLeaderboard, MilestoneProgress

2. Creator Dashboard: `app/seller-product/[companyId]/page.tsx`
   - Add: Enhanced Analytics, Custom Rate Management UI

## Business Rules (NEVER MODIFY)
- Member commission: 10% base (tier system: 10%/15%/18%)
- Creator commission: 70%
- Platform commission: 20%
- Attribution window: 30 days
- Custom rates: 10-25% range (creator-set overrides)
</context>

<requirements>
## Phase Structure
Organize into 4 sequential phases with clear dependencies:

### Phase 1: Foundation (Must complete first)
1. Database migration for custom commission fields
2. Verify all Whop API credentials
3. Environment variable validation

### Phase 2: UI Integration (Depends on Phase 1)
1. Member Dashboard integration
2. Creator Dashboard integration
3. Mobile responsiveness verification

### Phase 3: Notification System (Depends on Phase 2)
1. Wire all notification triggers
2. Test each notification channel
3. Fallback logic verification

### Phase 4: Testing & Verification (Depends on Phase 3)
1. E2E tests with Playwright
2. Manual flow verification
3. Production readiness checklist
</requirements>

<notification_specification>
## Full Notification Mapping

Each notification must specify:
- Trigger Event: What action causes this notification
- Recipient: Who receives it (member, creator, or both)
- Primary Channel: GraphQL DM or Push
- Fallback Channel: What to use if primary fails
- Message Template: Exact content with variables
- Timing: Immediate, delayed, or batched

### 1. Welcome Notification
- Trigger: New member joins via referral link
- Recipient: New member
- Primary: GraphQL DM
- Fallback: Push notification
- Template: "Welcome to {communityName}! You joined through {referrerName}'s link. Start sharing your own link to earn {commissionRate}% on every referral: {referralUrl}"
- Timing: Immediate (within webhook processing)
- Wired in: `app/api/webhooks/whop/route.ts` → `notifyWelcome()`

### 2. Commission Earned Notification
- Trigger: Referred member makes a purchase
- Recipient: Referring member
- Primary: GraphQL DM
- Fallback: Push notification
- Template: "You just earned ${amount} from {referredMemberName}'s purchase! Your total earnings: ${totalEarnings}. Keep sharing: {referralUrl}"
- Timing: Immediate (within webhook processing)
- Wired in: `app/api/webhooks/whop/route.ts` → `notifyCommissionEarned()`

### 3. Commission Paid Notification
- Trigger: Auto-pay transfer completes successfully
- Recipient: Member who received payout
- Primary: GraphQL DM
- Fallback: Push notification
- Template: "Your commission of ${amount} has been paid out via Whop Balance! Transaction ID: {transferId}"
- Timing: Immediate (after transfer success)
- Wired in: `lib/whop/transfers.ts` → after `createTransfer()` success

### 4. Rank Change Notification
- Trigger: Member moves up or down in leaderboard
- Recipient: Member whose rank changed
- Primary: Push notification (less intrusive)
- Fallback: None (optional notification)
- Template (up): "You moved up to #{newRank} on the leaderboard! Keep it up!"
- Template (down): "You dropped to #{newRank}. Share your link to climb back up: {referralUrl}"
- Timing: Batched (after leaderboard recalculation)
- Wired in: `lib/utils/rank-updater.ts` → `notifyRankChange()`

### 5. Milestone Notification
- Trigger: Member reaches referral milestone (10, 25, 50, 100, 250, 500, 1000)
- Recipient: Member who hit milestone
- Primary: GraphQL DM (celebratory, personal)
- Fallback: Push notification
- Template: "MILESTONE REACHED! You've referred {count} members! You're now a {tierName} earning {commissionRate}% per referral!"
- Timing: Immediate (during rank update)
- Wired in: `lib/utils/rank-updater.ts` → `notifyMilestone()`

### 6. Tier Upgrade Notification
- Trigger: Member upgrades to higher commission tier
- Recipient: Member who upgraded
- Primary: GraphQL DM
- Fallback: Push notification
- Template: "TIER UPGRADE! You're now {tierName}! Your commission rate increased from {oldRate}% to {newRate}%. Next tier at {nextTierThreshold} referrals."
- Timing: Immediate (during tier calculation)
- Wired in: Needs to be added to `app/api/webhooks/whop/route.ts`

### 7. Custom Rate Set Notification
- Trigger: Creator sets custom commission rate for member
- Recipient: Member receiving custom rate
- Primary: GraphQL DM
- Fallback: Push notification
- Template: "{creatorName} has set a special commission rate for you: {customRate}%! This is above the standard {tierRate}% rate. Reason: {reason}"
- Timing: Immediate (after rate update)
- Wired in: Needs to be added to `lib/utils/custom-commission.ts` → `setCustomCommissionRate()`

### 8. Referral Click Notification (Optional)
- Trigger: Someone clicks member's referral link
- Recipient: Link owner
- Primary: Push notification only (high frequency, low priority)
- Fallback: None
- Template: "Someone just clicked your referral link! Potential conversion incoming..."
- Timing: Debounced (max 1 per 5 minutes)
- Wired in: `app/r/[code]/route.ts` (optional, may skip)

### 9. Creator Daily Digest
- Trigger: Daily cron job (8am creator timezone)
- Recipient: Creator
- Primary: Email (via separate system)
- Fallback: GraphQL DM summary
- Template: "Daily Referral Report for {communityName}: {newMembers} new members, ${revenue} revenue, Top performer: {topMember}"
- Timing: Scheduled (cron)
- Wired in: Needs new cron endpoint

### 10. Payout Failed Notification
- Trigger: Auto-pay transfer fails
- Recipient: Platform admin + affected member
- Primary: GraphQL DM to member, Email to admin
- Fallback: Push to member
- Template (member): "Your commission payout of ${amount} is pending manual review. We'll process it within 24 hours."
- Template (admin): "PAYOUT FAILED: Member {memberId}, Amount: ${amount}, Error: {errorMessage}"
- Timing: Immediate
- Wired in: `lib/whop/transfers.ts` → after `createTransfer()` failure
</notification_specification>

<ui_integration_spec>
## Member Dashboard Integration (`app/customer/[experienceId]/page.tsx`)

### Components to Add:
1. **ReferralUrlGenerator** - Top of page, prominent placement
   - Import from `components/dashboard/ReferralUrlGenerator.tsx`
   - Pass: memberId, referralCode, whopUsername
   - Handle: onUsernameNeeded callback for setup flow

2. **RealtimeLeaderboard** - Below stats section
   - Import from `components/dashboard/RealtimeLeaderboard.tsx`
   - Pass: memberId, experienceId
   - Style: Match existing card styling

3. **MilestoneProgress** - Near earnings section
   - Import from `components/dashboard/MilestoneProgress.tsx`
   - Pass: totalReferred, currentTier
   - Show: Next milestone and tier upgrade info

### Layout Changes:
- Ensure responsive grid (1 col mobile, 2 col tablet, 3 col desktop)
- Leaderboard should not dominate on mobile (collapsible)
- URL generator always visible and prominent

## Creator Dashboard Integration (`app/seller-product/[companyId]/page.tsx`)

### Components to Add:
1. **Enhanced Analytics Section**
   - Fetch from `/api/creator/analytics`
   - Display: Revenue trends, conversion rates, top performers
   - Add: Date range selector, export button

2. **Custom Rate Management UI** (NEW COMPONENT NEEDED)
   - Create: `components/dashboard/CustomRateManager.tsx`
   - Features:
     - List members with custom rates
     - Set/remove custom rates
     - Rate comparison preview
   - API: Use `lib/utils/custom-commission.ts` functions

### Layout Changes:
- Add tabs: Overview | Analytics | Rate Management
- Mobile: Stack vertically, tabs become accordion
</ui_integration_spec>

<api_wiring_spec>
## Webhook Integration (`app/api/webhooks/whop/route.ts`)

### Current State:
- Handles: membership.went_valid, payment.succeeded
- Calls: notifyWelcome, notifyCommissionEarned
- Has: Auto-pay logic (needs testing)

### Changes Needed:
1. Add tier upgrade detection and notification
2. Ensure auto-pay is enabled by default
3. Add payout failure handling with notification
4. Improve error logging

## Referral Redirect (`app/r/[code]/route.ts`)

### Current State:
- Tracks clicks via AttributionClick
- Redirects to Whop product page

### Changes Needed:
1. (Optional) Add click notification trigger
2. Ensure fingerprint tracking works correctly
3. Add rate limiting for spam protection

## Leaderboard Polling (`app/api/leaderboard/poll/route.ts`)

### Current State:
- Returns leaderboard with rank changes
- Dynamic poll interval

### Changes Needed:
1. Verify pagination works for large communities
2. Add caching layer for high-traffic scenarios
3. Ensure rank change detection triggers notifications
</api_wiring_spec>

<database_migration_spec>
## Migration Steps

### Step 1: Verify Current Schema
```bash
npx prisma db pull
```
Check if customCommissionRate fields exist in production.

### Step 2: Push Schema Changes
```bash
npx prisma db push
```
This adds:
- customCommissionRate (Float, nullable)
- customRateSetBy (String, nullable)
- customRateSetAt (DateTime, nullable)
- customRateReason (String, nullable)

### Step 3: Generate Client
```bash
npx prisma generate
```

### Step 4: Verify Migration
```bash
npx prisma studio
```
Check Member table has new fields.

### Rollback Plan
If issues occur:
```sql
ALTER TABLE "Member" DROP COLUMN IF EXISTS "customCommissionRate";
ALTER TABLE "Member" DROP COLUMN IF EXISTS "customRateSetBy";
ALTER TABLE "Member" DROP COLUMN IF EXISTS "customRateSetAt";
ALTER TABLE "Member" DROP COLUMN IF EXISTS "customRateReason";
```
</database_migration_spec>

<environment_verification>
## Required Environment Variables

### Whop API (MUST VERIFY)
```bash
WHOP_API_KEY=         # REST API v2 key
WHOP_AGENT_USER_ID=   # For GraphQL DMs (user ID that sends messages)
WHOP_WEBHOOK_SECRET=  # Webhook signature verification
```

### App Configuration
```bash
NEXT_PUBLIC_APP_URL=  # Base URL for referral links
DATABASE_URL=         # PostgreSQL connection string
```

### Verification Script
Create a verification endpoint or script that:
1. Tests WHOP_API_KEY by fetching company info
2. Tests WHOP_AGENT_USER_ID by sending test DM
3. Verifies DATABASE_URL connection
4. Returns status for each credential
</environment_verification>

<testing_spec>
## E2E Test Coverage (Playwright)

### Test File: `tests/e2e/integration-flow.spec.ts`

### Test Cases:

1. **Referral URL Generation Flow**
   - Navigate to member dashboard
   - Verify URL generator component loads
   - Copy URL and verify format
   - Test share buttons (mock share API)
   - Verify stats display (clicks, conversions)

2. **Leaderboard Display Flow**
   - Navigate to member dashboard
   - Verify leaderboard loads
   - Check current user highlighting
   - Verify rank display format
   - Test refresh functionality

3. **Milestone Progress Flow**
   - Create member with specific referral count
   - Verify progress bar shows correct percentage
   - Verify milestone markers are accurate
   - Test tier display

4. **Creator Analytics Flow**
   - Navigate to creator dashboard
   - Verify analytics data loads
   - Test date range filtering
   - Verify chart rendering
   - Test export functionality

5. **Custom Rate Management Flow**
   - Navigate to creator dashboard
   - Open rate management section
   - Set custom rate for a member
   - Verify rate appears in list
   - Remove custom rate
   - Verify reverts to tier-based

6. **Notification Delivery Flow** (Manual verification)
   - Trigger each notification type
   - Verify DM delivery in Whop
   - Verify push notification (if enabled)
   - Check fallback behavior

### Test Data Setup
```typescript
// tests/fixtures/integration-data.ts
export const testMember = {
  id: 'test-member-1',
  referralCode: 'TESTUSER-ABC123',
  totalReferred: 15, // Ambassador tier
  whopUsername: 'testuser',
};

export const testCreator = {
  id: 'test-creator-1',
  companyId: 'test-company-1',
  companyName: 'Test Community',
};
```
</testing_spec>

<implementation_phases>
## Phase 1: Foundation (Sequential - Must Complete First)

### Task 1.1: Database Migration
- Run `npx prisma db push`
- Verify with `npx prisma studio`
- Document any issues

### Task 1.2: Environment Verification
- Create `/api/health/credentials` endpoint
- Test all Whop API credentials
- Document missing credentials

### Task 1.3: Fix Missing Credentials
- If WHOP_AGENT_USER_ID missing: Guide user to obtain
- Update .env.local with verified values
- Retest credentials

**Phase 1 Deliverable**: All credentials verified, schema migrated

---

## Phase 2: UI Integration (Can parallelize some tasks)

### Task 2.1: Member Dashboard (Parallel with 2.2)
- Add ReferralUrlGenerator component
- Add RealtimeLeaderboard component
- Add MilestoneProgress component
- Verify mobile responsiveness
- Match existing dark theme styling

### Task 2.2: Creator Dashboard (Parallel with 2.1)
- Create CustomRateManager component
- Add enhanced analytics section
- Add tab navigation
- Verify mobile responsiveness

### Task 2.3: Component Testing
- Verify all components render
- Test interactions (copy, share, set rate)
- Fix any styling issues

**Phase 2 Deliverable**: Both dashboards fully integrated with all components

---

## Phase 3: Notification Wiring (Sequential)

### Task 3.1: Webhook Notifications
- Verify notifyWelcome is called
- Verify notifyCommissionEarned is called
- Add notifyTierUpgrade call
- Add notifyPayoutFailed call

### Task 3.2: Rank/Milestone Notifications
- Verify notifyRankChange is called in rank-updater
- Verify notifyMilestone is called
- Test with real leaderboard update

### Task 3.3: Custom Rate Notification
- Add notification to setCustomCommissionRate
- Test DM delivery

### Task 3.4: Fallback Testing
- Disable GraphQL DM (mock failure)
- Verify push notification fallback works
- Re-enable GraphQL DM

**Phase 3 Deliverable**: All 10 notification types wired and tested

---

## Phase 4: Testing & Verification (Sequential)

### Task 4.1: E2E Test Creation
- Create test file with all test cases
- Add test fixtures
- Run initial test suite

### Task 4.2: Fix Failing Tests
- Debug any failures
- Update tests or code as needed
- Achieve passing suite

### Task 4.3: Manual Verification
- Walk through each user flow
- Verify notifications in Whop
- Check mobile experience

### Task 4.4: Production Readiness
- Review error handling
- Check logging
- Update documentation
- Create deployment checklist

**Phase 4 Deliverable**: Full test coverage, production-ready code
</implementation_phases>

<output>
## Deliverables

1. **Integration Plan Document** - This prompt serves as the plan
2. **New Files to Create**:
   - `components/dashboard/CustomRateManager.tsx`
   - `app/api/health/credentials/route.ts`
   - `tests/e2e/integration-flow.spec.ts`
   - `tests/fixtures/integration-data.ts`

3. **Files to Modify**:
   - `app/customer/[experienceId]/page.tsx` - Add member dashboard components
   - `app/seller-product/[companyId]/page.tsx` - Add creator dashboard components
   - `app/api/webhooks/whop/route.ts` - Add tier upgrade notification
   - `lib/utils/custom-commission.ts` - Add notification trigger
   - `lib/utils/rank-updater.ts` - Verify notification triggers

4. **Verification Outputs**:
   - All E2E tests passing
   - All notifications verified in Whop
   - Mobile responsiveness confirmed
   - Production readiness checklist completed
</output>

<verification>
Before declaring Phase complete, verify:

### Phase 1 Verification:
- [ ] `npx prisma studio` shows customCommissionRate fields in Member table
- [ ] `/api/health/credentials` returns all green status
- [ ] No TypeScript errors in `lib/utils/custom-commission.ts`

### Phase 2 Verification:
- [ ] Member dashboard shows URL generator, leaderboard, milestones
- [ ] Creator dashboard shows analytics, custom rate manager
- [ ] All components render on mobile (Chrome DevTools)
- [ ] No console errors

### Phase 3 Verification:
- [ ] Send test notification via each channel
- [ ] Check Whop for DM delivery
- [ ] Verify fallback works when primary fails

### Phase 4 Verification:
- [ ] `npm run test` - All E2E tests pass
- [ ] Manual walkthrough completes without errors
- [ ] Documentation updated
</verification>

<success_criteria>
1. All 4 phases completed with verification checks passed
2. Both dashboards fully integrated with new components
3. All 10 notification types wired with proper templates
4. E2E test coverage for critical flows
5. Mobile-responsive design maintained
6. No TypeScript errors
7. Production deployment checklist completed
</success_criteria>
