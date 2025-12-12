<objective>
Conduct a comprehensive review of all Whop integration points in the Referral Flywheel application.

This audit ensures the app correctly handles Whop webhooks, API calls, and attribution tracking. Any bugs here could result in lost commissions, incorrect attribution, or failed member creation - directly impacting user trust and revenue.
</objective>

<context>
Referral Flywheel uses "Strategy B" - Whop-native attribution:
1. Members share referral links like /r/CODE which redirect to Whop with ?a=whopUsername
2. Whop tracks the affiliate natively
3. Our webhook reads affiliate_username from membership/payment events
4. Commissions are calculated and attributed to the referrer

Key integration points:
- Webhook handler processes 10+ event types
- Whop API fetches membership details
- Authentication relies on Whop iframe context

First, read the project context:
@.claude/CLAUDE.md
</context>

<integration_audit>
Thoroughly analyze these Whop integration aspects:

1. **Webhook Handler Completeness**
   - Are ALL relevant Whop event types handled?
   - Is idempotency properly implemented (duplicate webhook protection)?
   - Is signature validation robust?
   - Are edge cases handled (missing data, partial data)?

2. **Attribution Accuracy (CRITICAL)**
   - Does affiliate_username correctly map to member's referralCode?
   - Is whopUsername properly captured and stored?
   - What happens if a referred member's referrer doesn't exist?
   - Are organic vs referred members correctly distinguished?

3. **Commission Calculation Integrity**
   - Is the 10/70/20 split correctly applied?
   - Are tiered commissions (10%/15%/18%) working correctly?
   - Is initial vs recurring payment detection accurate?
   - Are refunds properly reversing commissions?

4. **API Error Handling**
   - What happens when Whop API is down/slow?
   - Are API rate limits handled?
   - Is there retry logic for failed API calls?

5. **Member Lifecycle Tracking**
   - Are membership.went_valid, payment.succeeded handled correctly?
   - Is cancellation/deletion properly tracked?
   - Is trial handling implemented?
</integration_audit>

<files_to_examine>
Read and deeply analyze:

Core webhook handler:
@app/api/webhooks/whop/route.ts

Referral redirect route:
@app/r/[code]/route.ts

Authentication/context:
@lib/whop/simple-auth.ts
@lib/whop/messaging.ts (if exists)

App entry point:
@app/page.tsx

Member creation flow:
@app/customer/[experienceId]/page.tsx

Creator onboarding:
@app/seller-product/[companyId]/onboarding/page.tsx

Commission logic:
@lib/utils/commission.ts
@lib/utils/tiered-commission.ts
@lib/data/centralized-queries.ts

Database schema:
@prisma/schema.prisma
</files_to_examine>

<test_scenarios>
Verify these critical user flows are correctly handled:

1. **New Organic Member**: No referrer, should have memberOrigin="organic"
2. **New Referred Member**: Has ?a= parameter, should link to referrer
3. **First Payment**: Creates commission with paymentType="initial"
4. **Recurring Payment**: Creates commission with paymentType="recurring"
5. **Member Cancellation**: Lifecycle updated, no earnings reversal (lifetime earnings stay)
6. **Full Refund**: Commission status changed, earnings reversed
7. **Partial Refund**: Proportional commission reversal
8. **Referrer Not Found**: Graceful handling when affiliate_username has no match
</test_scenarios>

<output_format>
Create findings report at:
`./reviews/002-whop-integration-findings.md`

Structure:

# Whop Integration Review - Pre-Launch Audit

## Attribution Flow Analysis
[Trace the complete journey from referral click to commission creation]

## CRITICAL Issues
[Issues that would cause lost revenue or broken attribution]

## HIGH Priority Issues
[Issues that could confuse users or create data inconsistencies]

## MEDIUM Priority Issues
[Edge cases, improvements]

## Integration Completeness Checklist
- [ ] All webhook events handled
- [ ] Idempotency implemented
- [ ] Signature validation working
- [ ] Attribution chain complete
- [ ] Commission calculation accurate
- [ ] Refund handling correct
- [ ] API error resilience

## Recommendations
[Specific improvements to become "best affiliate tracking app"]
</output_format>

<verification>
1. Trace complete referral flow from click → commission
2. Verify all webhook event types have handlers
3. Confirm idempotency check exists (whopPaymentId unique check)
4. Test commission math: $49.99 sale → $5.00 member / $35.00 creator / $10.00 platform
5. Verify tiered rates: 50+ refs = 15%, 100+ refs = 18%
</verification>

<success_criteria>
- Complete attribution flow documented
- All webhook handlers verified
- Commission calculations validated
- Edge cases identified and documented
- Report saved to ./reviews/002-whop-integration-findings.md
</success_criteria>
