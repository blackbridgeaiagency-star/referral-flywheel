# Whop Integration Manual Testing Guide

## Prerequisites

1. Access to Whop dashboard
2. Test product set up
3. WHOP_API_KEY configured in `.env.local`
4. Automated tests completed (`npx tsx scripts/test-whop-integration.ts`)

## Test 1: Attribution Flow (CRITICAL)

### Setup:
1. Go to your Whop product settings: `https://whop.com/dashboard/products`
2. Click on your product → "Affiliates" tab
3. Enable "Member Affiliate Program"
4. Set affiliate rate to **10%**
5. Save settings

### Test Steps:

**Phase 1: Initial Click with Attribution**
1. Create test Whop link: `https://whop.com/YOUR_SLUG?a=testuser`
2. Open link in **incognito window**
3. Browse the product page for 2-3 minutes
4. Add product to cart but DON'T purchase
5. CLOSE the browser completely

**Phase 2: Attribution Persistence Test**
6. Wait **1 hour** (simulates user delay)
7. Open **NEW incognito window**
8. Navigate to `https://whop.com/YOUR_SLUG` (**without** `?a=` parameter)
9. Complete a test purchase
10. Wait 5 minutes for webhook to process

**Phase 3: Verification**
11. Go to Whop Dashboard → Affiliates → View Sales
12. Check if "testuser" got credited for the sale
13. Check your app's webhook logs for `affiliate_code` field

### Expected Result:
✅ **"testuser" appears in affiliate sales** even though final purchase URL didn't have `?a=`
✅ **Webhook contains `affiliate_code: "testuser"`**

### If This Passes:
🎉 Whop's attribution persists! Hybrid model is viable.

### If This Fails:
❌ Whop's attribution doesn't persist → **Hybrid model won't work reliably**
- Stick with current manual model
- Members won't get automatically credited
- Too much attribution leakage

---

## Test 2: Webhook Affiliate Code

### Setup:
1. Ensure webhook endpoint is configured: `https://yourdomain.com/api/webhooks/whop`
2. Check webhook secret is set in Whop dashboard

### Test Steps:
1. Complete test purchase with `?a=testuser` (from Test 1)
2. Wait for webhook to arrive (usually < 1 minute)
3. Check database: `SELECT * FROM "WebhookEvent" WHERE "eventType" LIKE '%payment%' ORDER BY "createdAt" DESC LIMIT 1;`
4. Examine the `payload` JSON field

### Look For These Fields:
```json
{
  "data": {
    "affiliate_code": "testuser",
    // OR
    "affiliateCode": "testuser",
    // OR
    "affiliate": {
      "code": "testuser",
      "username": "testuser"
    }
  }
}
```

### Expected Result:
✅ Webhook contains affiliate attribution in one of these formats

### If This Fails:
❌ **Cannot attribute sales programmatically**
- Hybrid model impossible
- No way to know which member to credit

---

## Test 3: Username Availability & Format

### Setup:
Create 3 different test accounts on Whop:

**Account A: Complete Profile**
1. Sign up with full name
2. Set custom username: "johndoe"
3. Complete profile

**Account B: Minimal**
1. Sign up with email only
2. Skip username setup
3. Leave profile minimal

**Account C: Generated**
1. Sign up normally
2. Let Whop auto-generate username

### Test Steps:
1. Each account should trigger `membership.created` webhook
2. Check webhook payload for each:

```sql
SELECT "payload" FROM "WebhookEvent"
WHERE "eventType" LIKE '%membership%'
ORDER BY "createdAt" DESC
LIMIT 3;
```

3. Look at `data.user.username` field for each

### Expected Result:
✅ All 3 accounts have `user.username` field populated (may be auto-generated)

### If Username Missing:
Check these fallback options in webhook payload:
- `user.email.split('@')[0]` → Use email prefix
- `user.name.replace(/\s+/g, '').toLowerCase()` → Use name
- `user.id` → Use Whop user ID
- Auto-generate: `user_${user.id.slice(0, 8)}`

**Recommendation:**
- If **100% have username**: ✅ Use directly
- If **80%+ have username**: ⚠️ Use with fallback
- If **<80% have username**: ❌ Unreliable, don't use hybrid model

---

## Test 4: API Product Settings Access

### Test Steps:

**Via cURL:**
```bash
curl https://api.whop.com/api/v2/products/YOUR_PRODUCT_ID \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json"
```

**Via Node:**
```typescript
const response = await fetch(
  `https://api.whop.com/api/v2/products/YOUR_PRODUCT_ID`,
  {
    headers: {
      'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
      'Content-Type': 'application/json',
    }
  }
);
const product = await response.json();
console.log(product);
```

### Look For These Fields:
- `member_affiliate_status` or `affiliateStatus`
- `member_affiliate_percentage` or `affiliatePercentage`
- `member_affiliate_enabled` or `affiliatesEnabled`
- Any field with "affiliate" or "commission"

### Expected Result:
✅ Can read affiliate settings via API
```json
{
  "data": {
    "member_affiliate_status": "enabled",
    "member_affiliate_percentage": 10
  }
}
```

### If This Passes:
✅ Can auto-verify creator settings during onboarding

### If This Fails:
⚠️ Cannot auto-verify settings
- Fallback: Manual verification during onboarding
- Show screenshots/instructions to creators
- They verify settings themselves

---

## Decision Matrix

Use this to decide whether to build hybrid model:

| Test | Result | Impact | Action |
|------|--------|--------|--------|
| **Attribution Persistence** | ✅ Pass | CRITICAL | Proceed |
| **Attribution Persistence** | ❌ Fail | CRITICAL | **STOP - Don't build hybrid** |
| **Webhook affiliate_code** | ✅ Pass | CRITICAL | Proceed |
| **Webhook affiliate_code** | ❌ Fail | CRITICAL | **STOP - Can't attribute** |
| **Username Availability** | ✅ 100% | HIGH | Proceed confidently |
| **Username Availability** | ⚠️ 80-99% | HIGH | Proceed with fallback |
| **Username Availability** | ❌ <80% | HIGH | **STOP - Too unreliable** |
| **API Settings Access** | ✅ Pass | MEDIUM | Auto-verification possible |
| **API Settings Access** | ❌ Fail | MEDIUM | Manual verification only |

---

## Final Recommendation Flow

### ✅ All Critical Tests Pass:
1. **Build hybrid model** with confidence
2. Timeline: 1-2 weeks implementation
3. Risk: Low - validated assumptions

### ⚠️ Critical Pass, Non-Critical Warnings:
1. **Build with fallbacks** for edge cases
2. Example: If some users lack usernames, use email prefix
3. Timeline: 1-2 weeks + 2-3 days for fallbacks
4. Risk: Medium - handle edge cases

### ❌ Any Critical Test Fails:
1. **DO NOT build hybrid model**
2. **Ship current manual model TODAY**
3. Members see analytics/performance
4. Creators manually reward via export report
5. Add Whop integration as v2 after they improve API
6. Timeline: Ship now, validate later

---

## Sample Test Data

### Good Webhook (Has Affiliate Code):
```json
{
  "event": "payment.succeeded",
  "data": {
    "id": "pay_abc123",
    "amount": 4999,
    "final_amount": 4999,
    "user_id": "user_xyz",
    "company_id": "biz_abc",
    "membership_id": "mem_123",
    "affiliate_code": "johndoe",  ← THIS IS CRITICAL
    "created_at": 1234567890
  }
}
```

### Bad Webhook (Missing Affiliate Code):
```json
{
  "event": "payment.succeeded",
  "data": {
    "id": "pay_abc123",
    "amount": 4999,
    "user_id": "user_xyz",
    "company_id": "biz_abc",
    "membership_id": "mem_123",
    // ❌ No affiliate_code field
    "created_at": 1234567890
  }
}
```

---

## Troubleshooting

### Attribution Not Working?

**Check:**
1. Is member affiliate program enabled in Whop?
2. Is rate set to 10%?
3. Did you use correct username in `?a=` parameter?
4. Is username case-sensitive?
5. Does user have affiliate privileges?

**Debug:**
```sql
-- Check recent webhooks
SELECT "eventType", "payload", "createdAt"
FROM "WebhookEvent"
ORDER BY "createdAt" DESC
LIMIT 5;

-- Check if affiliate_code exists anywhere
SELECT "payload"::text
FROM "WebhookEvent"
WHERE "payload"::text LIKE '%affiliate%'
LIMIT 10;
```

### Username Conflicts?

If two users have same username, Whop handles conflicts by:
- Appending numbers: `johndoe` → `johndoe2`
- Or using unique ID
- Check webhook payload for actual value

---

## Next Steps After Testing

### If Tests Pass:
1. Review hybrid model implementation plan
2. Estimate 1-2 weeks for development
3. Create development branch
4. Build in phases (onboarding → redirect → dashboard)
5. Test with 1-2 beta creators before full launch

### If Tests Fail:
1. **Deploy current model immediately** (what we built today)
2. Document test failures
3. Contact Whop support for API clarification
4. Re-test monthly as Whop updates their API
5. Add hybrid model as v2 when Whop improves

---

## Questions for Whop Support (If Tests Fail)

If critical tests fail, email Whop support with:

> Subject: Affiliate API Documentation Clarification
>
> Hi Whop Team,
>
> I'm building a referral tracking app and need clarification on your Member Affiliate system:
>
> 1. Does the payment webhook include `affiliate_code` when a sale is attributed to a member affiliate?
> 2. What's the exact field name and data structure?
> 3. How long does attribution persist after a `?a=username` click?
> 4. Can we read product affiliate settings via API? Which endpoint?
> 5. Are usernames guaranteed to be unique and always populated?
>
> Documentation: [link to what you found]
>
> Thanks!

---

This manual testing guide complements the automated tests. Run both before making the decision to build the hybrid model.
