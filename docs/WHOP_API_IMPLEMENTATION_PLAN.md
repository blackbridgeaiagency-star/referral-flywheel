# Whop API Implementation Plan
## Maximizing API Capabilities for Referral Flywheel

**Created:** December 10, 2025
**Status:** PLAN ONLY - Do not implement until approved

---

## Executive Summary

Our research revealed that **we're underutilizing Whop's existing APIs**. Before requesting new features, we should implement what's already available:

| Category | Available | We're Using | Gap |
|----------|-----------|-------------|-----|
| Push Notifications | Yes | No | **Implement** |
| Direct Messaging | Yes (GraphQL) | Failing (wrong endpoint) | **Fix** |
| Checkout Sessions | Yes | No | **Implement** |
| Promo Codes | Yes | No | Consider |
| Forum/Chat Posts | Yes | No | Consider |
| Transfers/Payouts | Yes | No | Consider |
| Affiliate Rate Mgmt | **No** | N/A | **Request from Whop** |

---

## Phase 1: Implement Available APIs (No Whop Request Needed)

### 1.1 Fix Direct Messaging (Priority: HIGH)

**Current Problem:**
Our `lib/whop/api-client.ts` tries REST endpoints that don't work:
- `POST /chat/messages` - Fails
- `POST /support_chat/messages` - Fails

**Solution:** Use GraphQL API instead

**Implementation:**
```typescript
// lib/whop/graphql-messaging.ts

const WHOP_GRAPHQL_URL = 'https://api.whop.com/public-graphql';

export async function sendDirectMessage(
  userId: string,
  message: string,
  companyId: string
): Promise<{ success: boolean; error?: string }> {
  const mutation = `
    mutation sendMessage($input: SendMessageInput!) {
      sendMessage(input: $input)
    }
  `;

  const response = await fetch(WHOP_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
      'x-on-behalf-of': process.env.WHOP_AGENT_USER_ID, // Agent user sending
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: mutation,
      variables: {
        input: {
          feedId: userId, // The user's DM feed
          feedType: 'dms_feed',
          message: message
        }
      }
    })
  });

  const result = await response.json();
  return { success: !result.errors };
}
```

**Files to Modify:**
- Create: `lib/whop/graphql-messaging.ts`
- Update: `lib/whop/messaging.ts` to use new GraphQL function
- Update: `app/api/webhooks/whop/route.ts` to send welcome DMs

**Use Cases:**
- Welcome message on first join
- Congratulations on first referral
- Tier upgrade notifications
- Milestone celebrations (10, 50, 100 referrals)

---

### 1.2 Implement Push Notifications (Priority: HIGH)

**API Available:** `POST /notifications`

**Implementation:**
```typescript
// lib/whop/notifications.ts

export async function sendPushNotification({
  companyId,
  title,
  content,
  userIds,
  deepLink
}: {
  companyId: string;
  title: string;
  content: string;
  userIds?: string[];
  deepLink?: string;
}): Promise<{ success: boolean }> {
  const response = await fetch('https://api.whop.com/api/v2/notifications', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      company_id: companyId,
      title,
      content,
      user_ids: userIds,
      rest_path: deepLink
    })
  });

  return { success: response.ok };
}
```

**Files to Create:**
- `lib/whop/notifications.ts`

**Trigger Points:**
- `membership.went_valid` → "Welcome! You're now earning 10% on referrals"
- `payment.succeeded` (with affiliate) → "You just earned $X from a referral!"
- Tier upgrade → "Congratulations! You're now an Ambassador (15%)"

---

### 1.3 Implement Checkout Session API (Priority: MEDIUM)

**API Available:** `POST /checkout-sessions`

**Why This Matters:**
Instead of just redirecting to `?a=whopUsername`, we can create proper checkout sessions with:
- Pre-filled affiliate codes
- Custom metadata for tracking
- Specific redirect URLs

**Implementation:**
```typescript
// lib/whop/checkout.ts

export async function createAffiliateCheckoutSession({
  planId,
  affiliateCode,
  metadata,
  redirectUrl
}: {
  planId: string;
  affiliateCode: string;
  metadata?: Record<string, string>;
  redirectUrl?: string;
}): Promise<{ checkoutUrl: string }> {
  const response = await fetch('https://api.whop.com/api/v2/checkout-sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      plan_id: planId,
      affiliate_code: affiliateCode,
      metadata: {
        ...metadata,
        source: 'referral_flywheel',
        referral_code: affiliateCode
      },
      redirect_url: redirectUrl
    })
  });

  const data = await response.json();
  return { checkoutUrl: data.checkout_url };
}
```

**Enhancement to `/r/[code]` route:**
Instead of simple redirect, create a proper checkout session for better tracking.

---

### 1.4 Implement Extend Membership (Priority: MEDIUM)

**API Available:** Extend membership endpoint

**Use Case:** Reward top referrers with free days
- First referral bonus: +7 days free
- Tier upgrades: +30 days free
- Monthly top 3: +60 days free

**Implementation:** Research exact endpoint and implement

---

## Phase 2: Request Missing APIs from Whop

After implementing Phase 1, we have credibility to request:

### 2.1 Per-User Affiliate Rate Management (CRITICAL)

**What We Need:**
```
POST /affiliates/{user_id}/rate
{
  "commission_rate": 0.15,
  "product_ids": ["prod_xxx"]
}

GET /affiliates/{user_id}
→ { "commission_rate": 0.10, "total_referrals": 45 }
```

**Why Critical:** Cannot automate tier upgrades without this

---

### 2.2 Affiliate Listing Endpoint (HIGH)

**What We Need:**
```
GET /company/{id}/affiliates
→ [
    { "user_id": "xxx", "username": "john", "rate": 0.10, "referrals": 23 },
    ...
  ]
```

**Why Needed:** Sync our data with Whop's affiliate records

---

### 2.3 Commission Data in Webhooks (HIGH)

**What We Need:**
Add to `payment.succeeded` webhook:
```json
{
  "affiliate_commission_amount": 499,
  "affiliate_user_id": "user_xxx"
}
```

**Why Needed:** Accurate earnings tracking without calculating ourselves

---

## Phase 3: Future Enhancements (Nice to Have)

### 3.1 WebSocket Integration
- Connect to `wss://ws-prod.whop.com/ws/developer`
- Real-time updates without polling
- Instant DM notifications

### 3.2 Promo Code Integration
- Create promo codes for top referrers
- Special discounts as rewards

### 3.3 Transfer/Payout Integration
- Automated payout system
- Direct commission payments to members

---

## Implementation Priority Matrix

| Priority | Task | Effort | Impact | Dependencies |
|----------|------|--------|--------|--------------|
| P0 | Fix DM messaging (GraphQL) | 2 hours | High | None |
| P0 | Implement push notifications | 2 hours | High | None |
| P1 | Checkout session API | 3 hours | Medium | None |
| P1 | Send email to Whop | 1 hour | Critical | P0 complete |
| P2 | Extend membership rewards | 3 hours | Medium | None |
| P3 | WebSocket integration | 8 hours | Low | None |

---

## Files to Create/Modify

### New Files:
- `lib/whop/graphql-messaging.ts` - GraphQL DM implementation
- `lib/whop/notifications.ts` - Push notification service
- `lib/whop/checkout.ts` - Checkout session creation

### Files to Modify:
- `lib/whop/messaging.ts` - Switch to GraphQL
- `app/api/webhooks/whop/route.ts` - Add notification triggers
- `app/r/[code]/route.ts` - Consider checkout session instead of redirect

---

## Environment Variables Needed

```env
# Already have:
WHOP_API_KEY=xxx
WHOP_WEBHOOK_SECRET=xxx

# Need to add/verify:
WHOP_AGENT_USER_ID=user_xxx  # For x-on-behalf-of header in DMs
```

---

## Testing Checklist

Before deploying Phase 1:
- [ ] Test GraphQL DM to a test user
- [ ] Test push notification to a test user
- [ ] Verify webhook still processes correctly
- [ ] Test checkout session creation
- [ ] Monitor for rate limits

---

## Success Metrics

After Phase 1:
- [ ] DMs successfully delivered (not just logged)
- [ ] Push notifications visible to users
- [ ] Attribution still working through checkout sessions

After Phase 2 (if Whop approves):
- [ ] Automatic tier upgrades working
- [ ] Commission data matches Whop dashboard
- [ ] Affiliate list stays in sync

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| GraphQL DM fails | Medium | Medium | Keep logging fallback |
| Rate limits hit | Low | High | Implement queuing |
| Whop rejects API request | Medium | High | Focus on Phase 1 value first |
| Wrong agent user ID | Medium | Medium | Test in dev first |

---

**Next Step:** Get approval, then implement Phase 1 before sending email to Whop.
