# 🔍 WHOP PAYMENT TYPES & REVENUE FILTERING

## 🎯 YOUR QUESTION:

> "Does Whop separate revenue by transaction type? Should we only count subscription/membership revenue and exclude one-time purchases?"

---

## ✅ CURRENT IMPLEMENTATION:

**We listen to:** `app_payment.succeeded` webhook event

**This webhook fires for:**
- ✅ Initial subscription payments (first month)
- ✅ Recurring subscription payments (renewals)
- ✅ One-time product purchases
- ✅ Course purchases
- ✅ Digital product sales
- ✅ Any payment through Whop

**We currently track ALL payments with no filtering!**

---

## 📊 WHAT WHOP PROVIDES IN WEBHOOKS:

Based on Whop's documentation, the `app_payment.succeeded` payload includes:

```json
{
  "action": "app_payment.succeeded",
  "data": {
    "id": "pay_xyz123",                    // Payment ID
    "membership_id": "mem_abc456",         // Membership ID (if applicable)
    "company_id": "biz_creator123",        // Creator's company
    "product_id": "prod_xyz",              // Product ID
    "final_amount": 4999,                  // Amount in cents ($49.99)
    "user_id": "user_123",                 // User who paid
    "email": "user@example.com",
    "username": "john_doe",

    // KEY FIELD FOR FILTERING:
    "plan_type": "subscription",           // ← subscription | one_time | course

    // Additional fields:
    "billing_period": "monthly",           // monthly | annual | lifetime
    "is_trial": false,
    "is_renewal": true,                    // true = recurring, false = initial
  }
}
```

**Key Fields for Filtering:**
1. **`plan_type`** - Distinguishes subscription vs one-time purchases
2. **`membership_id`** - Only present for subscription/membership products
3. **`billing_period`** - Only present for subscriptions
4. **`is_renewal`** - We already track this as `paymentType`

---

## 🤔 SHOULD WE FILTER BY PRODUCT TYPE?

### **YES, YOU SHOULD!** Here's why:

### **The Problem:**
If a creator sells:
- Monthly membership: $49.99/month (recurring)
- One-time course: $299 (one-time)
- Digital product: $19.99 (one-time)

**Without filtering:**
- Someone refers a friend who buys the $299 course
- Dashboard shows: "+$299 revenue!"
- But... no recurring value, one-time payment only
- Referrer gets their 10% ($29.90) once, that's it

**This inflates the "Total Revenue" metric!**

### **With Subscription-Only Filtering:**
- Only count payments where `plan_type === 'subscription'`
- OR where `membership_id` exists
- Shows true recurring revenue value
- More accurate representation of the referral program's impact

---

## 💡 RECOMMENDED APPROACH:

### **Option 1: Subscription-Only (RECOMMENDED)**

**Track ONLY recurring subscription revenue:**

```typescript
// In webhook handler
if (payload.action === 'app_payment.succeeded') {
  const { data } = payload;

  // ✅ FILTER: Only process if it's a subscription payment
  if (data.plan_type === 'subscription' || data.membership_id) {
    // Process commission...
  } else {
    console.log('⏭️  Skipping non-subscription payment:', data.plan_type);
    return NextResponse.json({ ok: true, skipped: true });
  }
}
```

**Benefits:**
- ✅ Focuses on recurring revenue (the real value)
- ✅ Dashboard shows sustainable, compound growth
- ✅ Aligns with "referral flywheel" concept
- ✅ More accurate MRR calculations

**Drawbacks:**
- ❌ Doesn't reward referrers for course/product sales
- ❌ Misses some legitimate revenue opportunities

---

### **Option 2: Track Everything, Display Separately**

**Track ALL payments, but show separate metrics:**

```typescript
// Commission model already has these fields:
{
  saleAmount: 49.99,
  paymentType: 'recurring',      // We track this
  productType: 'subscription',   // ADD THIS FIELD
}
```

**Dashboard would show:**
- **Subscription Revenue:** $128,307.16 (recurring)
- **One-Time Revenue:** $45,299.00 (courses/products)
- **Total Revenue:** $173,606.16

**Benefits:**
- ✅ Complete picture of all revenue
- ✅ Rewards referrers for all sales types
- ✅ Flexibility to show different metrics

**Drawbacks:**
- ❌ More complex tracking
- ❌ Could confuse the "recurring revenue" message

---

### **Option 3: Current Implementation (NO FILTER)**

**What you have now:**
- Tracks everything
- No distinction between subscription/one-time
- Simple, but potentially misleading

**Benefits:**
- ✅ Simple implementation
- ✅ Rewards all referrals equally

**Drawbacks:**
- ❌ Inflated revenue numbers
- ❌ One-time sales look like recurring value
- ❌ Not accurate for "recurring revenue" messaging

---

## 🎯 MY RECOMMENDATION:

### **Go with Option 1: Subscription-Only**

**Why:**
1. **Your app is called "Referral Flywheel"** - flywheels imply recurring, compound growth
2. **The 10% lifetime commission** only makes sense for recurring payments
3. **"Total Revenue since downloading" implies ongoing revenue**, not one-time spikes
4. **MRR (Monthly Recurring Revenue) is the key metric** for SaaS/subscription businesses
5. **Clearer value proposition:** "Our app generated $X in recurring revenue"

**Implementation:**
```typescript
// In app/api/webhooks/whop/route.ts

if (payload.action === 'app_payment.succeeded') {
  const { data } = payload;

  // ✅ ONLY process subscription/membership payments
  const isSubscription =
    data.plan_type === 'subscription' ||
    data.membership_id ||
    data.billing_period;  // monthly, annual, etc.

  if (!isSubscription) {
    console.log('⏭️  Skipping non-subscription payment');
    return NextResponse.json({
      ok: true,
      message: 'Non-subscription payment (not tracked)'
    });
  }

  // Continue with commission processing...
}
```

---

## 📋 CURRENT STATE:

### **What We Track Now:**
- ✅ `paymentType`: 'initial' | 'recurring'
- ✅ `saleAmount`: Full payment amount
- ✅ `membershipId`: Whop membership ID

### **What We DON'T Track:**
- ❌ `productType`: subscription vs one-time
- ❌ `billingPeriod`: monthly vs annual
- ❌ No filtering by payment type

### **The Issue:**
If someone buys a $500 one-time course via a referral:
- Commission created: $500 saleAmount
- "Total Revenue" increases by $500
- But it's NOT recurring revenue!
- Dashboard shows inflated numbers

---

## ✅ ACTION ITEMS:

If you want subscription-only tracking:

1. **Update Commission Schema** (optional, for clarity):
```prisma
model Commission {
  // ... existing fields ...
  productType String @default("subscription") // subscription | one_time | course
  billingPeriod String? // monthly | annual | lifetime
}
```

2. **Update Webhook Handler:**
   - Add filter for subscription payments only
   - Skip non-subscription payments
   - Log what's being skipped for debugging

3. **Update Dashboard Labels:**
   - "Recurring Revenue" instead of "Total Revenue"
   - "MRR from Referrals" for monthly card
   - Make it clear it's subscription-only

---

## 🎓 SUMMARY:

**Current Behavior:**
- Tracks ALL Whop payments (subscriptions, courses, products)
- No filtering or distinction
- Revenue numbers may be inflated by one-time sales

**Recommended Change:**
- Filter to ONLY track subscription/membership payments
- Skip one-time purchases, courses, digital products
- Focus on recurring revenue (the real value)
- Update labels to reflect "recurring revenue"

**Why This Matters:**
- More accurate representation of referral program value
- Aligns with "flywheel" concept (compound growth)
- Better MRR tracking
- Clearer ROI for creators

**Bottom Line:**
YES, you should filter! Whop provides `plan_type` and `membership_id` fields to distinguish subscription payments from one-time purchases. Use them!
