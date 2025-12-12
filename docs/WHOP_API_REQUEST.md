# Whop API Feature Request

## Overview

We're building a referral/affiliate wrapper platform for Whop communities. Our platform adds gamification, analytics, and tiered commission structures on top of Whop's existing affiliate system.

We need API access to programmatically manage affiliate rates to enable automated tier upgrades.

---

## Current Limitation

Currently, there's no documented API endpoint to:
1. Update a specific user's affiliate commission rate
2. Create custom affiliate configurations programmatically
3. Query which affiliate rate a specific user has

This means creators must manually update affiliate rates in the Whop dashboard when members reach higher tiers.

---

## What We Need

### 1. Per-User Affiliate Rate Management API

**Endpoint Needed:**
```
POST /affiliates/{user_id}/rate
{
  "commission_rate": 0.15,  // 15%
  "commission_type": "percentage",
  "applies_to": ["product_id_1", "product_id_2"]
}
```

**Use Case:**
- When a member reaches 50 paid referrals → automatically upgrade to 15%
- When a member reaches 100 paid referrals → automatically upgrade to 18%
- No manual creator intervention required

### 2. Referral Code Wrapper API

**Endpoint Needed:**
```
POST /affiliates/create-wrapped-link
{
  "user_id": "user_xxx",
  "product_id": "prod_xxx",
  "external_tracking_id": "our_referral_code",  // Our referral code
  "commission_rate": 0.10
}
```

**Use Case:**
- Generate Whop affiliate links that include our tracking parameter
- Allows us to track referrals in our system while Whop handles payments
- Attribution flows through both systems

### 3. Affiliate Configuration Query API

**Endpoint Needed:**
```
GET /affiliates/{user_id}/configuration
```

**Response:**
```json
{
  "user_id": "user_xxx",
  "current_rate": 0.10,
  "rate_type": "percentage",
  "total_referrals": 45,
  "total_earnings": 1234.56,
  "active_products": ["prod_xxx"]
}
```

**Use Case:**
- Sync affiliate status between our platform and Whop
- Verify rate changes were applied correctly
- Display accurate commission info to users

---

## Business Context

### Our Commission Structure

| Tier | Paid Referrals | Member Rate | Platform Rate | Creator Rate |
|------|----------------|-------------|---------------|--------------|
| Starter | 0-49 | 10% | 20% | 70% |
| Ambassador | 50+ | 15% | 15% | 70% |
| Elite | 100+ | 18% | 12% | 70% |

- Creator's 70% **never changes**
- Higher tiers come from platform reducing its share
- This incentivizes top performers and drives more referrals

### Why This Matters

1. **Automation**: Manual tier upgrades create friction and delays
2. **Scale**: As platforms grow, manual management becomes impossible
3. **User Experience**: Members expect instant reward for milestones
4. **Competitive Advantage**: Automated tiered commissions differentiate from other affiliate systems

---

## Technical Integration

We're already integrated with Whop via:
- Webhook events (payment.succeeded, membership.went_valid, etc.)
- Whop SDK for authentication
- Company/Product ID linking

Our ideal integration:
```
[Our Platform] → Detects tier upgrade eligibility
              → Calls Whop API to update affiliate rate
              → Whop handles all payments at new rate
              → Webhook confirms rate applied
```

---

## Current Workaround

Without API access, we:
1. Detect tier upgrade eligibility
2. Send notification to creator via dashboard
3. Creator manually updates rate in Whop dashboard
4. Creator marks upgrade as "complete" in our system

This works but creates:
- Delayed upgrades (days instead of seconds)
- Creator burden (manual work)
- Inconsistent member experience

---

## Contact Information

**App/Company Name:** Referral Flywheel
**Company ID:** [YOUR_COMPANY_ID]
**App ID:** [YOUR_APP_ID]
**Contact Email:** [YOUR_EMAIL]

---

## Questions for Whop

1. Is there an undocumented API for affiliate rate management?
2. Are there plans to add this functionality to the public API?
3. Is there a partnership program for platforms needing deeper integration?
4. Can we schedule a call to discuss our use case?

---

## Proposed Partnership Value

If Whop provides this API access, we can:
- Drive more affiliate-referred sales to Whop communities
- Provide case studies on gamification increasing referral rates
- Share analytics on optimal commission structures
- Potentially white-label our solution for Whop to offer to all creators

We believe automated tiered commissions could significantly increase Whop's GMV by incentivizing more active referral behavior.
