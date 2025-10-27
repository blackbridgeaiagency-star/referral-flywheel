# Bug Tracker

## 🐛 Active Bugs

*None currently!*

---

## ✅ Resolved Bugs

### BUG-001: Webhook Handler 500 Error - cookies() Not Available in API Routes (2025-10-23)
**Severity**: Critical
**Status**: ✅ Resolved

**Description**:
Webhook handler returns 500 error when processing payment events. The attribution checking logic fails because it tries to use `cookies()` from `next/headers` which is not available in API Route Handlers.

**Steps to Reproduce**:
1. Send test webhook from Whop (payment.succeeded event)
2. Webhook handler receives request
3. Calls `checkAttribution(request, data.user_id)` at line 61
4. `checkAttribution` tries to call `cookies()` from next/headers
5. Error thrown: "cookies() can only be called in Server Components or Server Actions"
6. Webhook returns 500 error

**Expected Behavior**:
- Webhook should successfully process payment
- Attribution should be checked via cookies or fingerprint
- Member should be created
- Commission should be recorded
- Response 200 returned

**Actual Behavior**:
- Webhook crashes with 500 error
- No member created
- No commission recorded
- Whop retries webhook multiple times

**Error Message**:
```
Error: cookies() can only be called in Server Components or Server Actions
    at checkAttribution (lib/utils/attribution.ts:14)
    at POST (app/api/webhooks/whop/route.ts:61)
```

**Root Cause**:
The `checkAttribution()` function uses `cookies()` from `next/headers` which only works in Server Components and Server Actions. API Route Handlers have a different cookie access pattern - they must read cookies from the `request.headers` object, not from `cookies()`.

**Affected Files**:
- `app/api/webhooks/whop/route.ts` (line 61)
- `lib/utils/attribution.ts` (line 14)

**Fix Implemented** (2025-10-23):
1. ✅ Refactored `lib/utils/attribution.ts`:
   - Removed `cookies()` from next/headers
   - Parse cookies manually from `request.headers.get('cookie')`
   - Added try/catch error handling
   - Made userId parameter optional
   - Added comprehensive logging

2. ✅ Updated `app/api/webhooks/whop/route.ts`:
   - Removed unused userId argument from checkAttribution call
   - Added data validation for required fields
   - Added safety checks for `final_amount` before division
   - Enhanced error logging

3. ✅ Enhanced error handling:
   - Validate webhook payload before processing
   - Return 400 Bad Request for malformed data
   - Graceful degradation for organic signups
   - Added warning logs for missing data

**Files Modified**:
- `lib/utils/attribution.ts` (+40 lines, better error handling)
- `app/api/webhooks/whop/route.ts` (+10 lines, data validation)

**Testing Notes**:
- Fix should be tested with real Whop webhooks
- Test scenarios: with cookie, without cookie, with fingerprint, missing data
- Verify organic signups still work (no attribution)

**Prevention**:
- ✅ Added comprehensive error handling
- ✅ Added data validation
- ✅ Documented API Route cookie access pattern
- Next: Add integration tests for webhook handler

---

## 📋 Template for New Bugs

### BUG-XXX: [Title] (YYYY-MM-DD)
**Severity**: [Critical | High | Medium | Low]
**Status**: [Open | In Progress | Resolved]

**Description**:
[What's broken?]

**Steps to Reproduce**:
1. Step 1
2. Step 2
3. Step 3

**Expected Behavior**:
[What should happen?]

**Actual Behavior**:
[What actually happens?]

**Error Message**:
```
[Paste error]
```

**Root Cause**:
[Why is this happening?]

**Fix**:
[How we fixed it]

**Prevention**:
[How to avoid in future]

---

## 🔍 Bug Severity Guide

**Critical**: App is broken, no workaround
- Database down
- Webhook returns 500
- Cannot create members
- Commission calculation wrong

**High**: Major feature broken, workaround exists
- Dashboard won't load
- Referral links don't track
- Leaderboard shows wrong data

**Medium**: Feature partially broken
- UI glitch
- Slow query
- Missing validation

**Low**: Minor issue, cosmetic
- Typo
- Color slightly off
- Console warning
