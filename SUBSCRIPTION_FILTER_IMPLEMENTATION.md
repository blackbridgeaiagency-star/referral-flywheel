# 🔒 SUBSCRIPTION-ONLY FILTER IMPLEMENTATION PLAN

## ✅ COMPLETED SO FAR:

1. ✅ **Schema Updated** - Added new fields to Commission model:
   - `productType`: "subscription" | "one_time" | "course"
   - `billingPeriod`: "monthly" | "annual" | "lifetime" | null
   - `monthlyValue`: Normalized monthly value for MRR

2. ✅ **Billing Utilities Created** (`lib/utils/billing.ts`):
   - `isSubscriptionPayment()` - Filter function
   - `normalizeBillingPeriod()` - Parse Whop's billing period
   - `calculateMonthlyValue()` - Handle annual/lifetime logic
   - `getBillingPeriodLabel()` - Human-readable labels

3. ✅ **Webhook Filter Added** - Subscription-only filter in webhook handler:
   - Skips non-subscription payments
   - Logs what's being skipped
   - Returns success but doesn't create commission

---

## 🚧 REMAINING TASKS:

###  **Task 1: Update processCommission() Function**

**File:** `app/api/webhooks/whop/route.ts:238-330`

**Add parameters:**
```typescript
async function processCommission({
  referrerCode,
  saleAmount,
  paymentId,
  membershipId,
  creatorId,
  attributionId,
  // ✅ ADD THESE:
  billingPeriod,      // From webhook data
  productType,        // From webhook data
}: {
  // ... existing params ...
  billingPeriod: string | null;
  productType: string;
}) {
```

**Update commission creation (line 267):**
```typescript
// Calculate monthly value
const monthlyValue = calculateMonthlyValue(saleAmount, billingPeriod);

await prisma.commission.create({
  data: {
    // ... existing fields ...
    paymentType: 'initial',

    // ✅ ADD THESE:
    productType,
    billingPeriod,
    monthlyValue,
  }
});
```

---

### **Task 2: Update handleRecurringPayment() Function**

**File:** `app/api/webhooks/whop/route.ts:343-427`

**Add parameters:**
```typescript
async function handleRecurringPayment(
  member: Member,
  data: any,
  // ✅ ADD THESE:
  billingPeriod: string | null,
  productType: string
) {
```

**Update commission creation (line 384):**
```typescript
const monthlyValue = calculateMonthlyValue(saleAmount, billingPeriod);

prisma.commission.create({
  data: {
    // ... existing fields ...
    paymentType: 'recurring',

    // ✅ ADD THESE:
    productType,
    billingPeriod,
    monthlyValue,
  }
})
```

---

### **Task 3: Pass Billing Data from Main Handler**

**File:** `app/api/webhooks/whop/route.ts:~ line 180-200`

**Update processCommission call:**
```typescript
await withRetry(async () => {
  await processCommission({
    referrerCode: attribution.referralCode,
    saleAmount: data.final_amount / 100,
    paymentId: data.id,
    membershipId: data.membership_id,
    creatorId: creator.id,
    attributionId: attribution.id,

    // ✅ ADD THESE:
    billingPeriod: billingPeriod,  // Already extracted above
    productType: data.plan_type || 'subscription',
  });
});
```

**Update handleRecurringPayment call:**
```typescript
await handleRecurringPayment(
  existingMember,
  data,
  // ✅ ADD THESE:
  billingPeriod,
  data.plan_type || 'subscription'
);
```

---

### **Task 4: Update MRR Calculations**

**Important:** Different billing periods need different MRR handling:

**Monthly ($49.99/month):**
- Total Revenue: +$49.99
- MRR: +$49.99

**Annual ($499/year):**
- Total Revenue: +$499 (one time)
- MRR: +$41.58/month ($499/12)

**Lifetime ($999):**
- Total Revenue: +$999 (one time)
- MRR: +$0 (no recurring component!)

**Implementation in `handleRecurringPayment`:**

```typescript
const monthlyValue = calculateMonthlyValue(saleAmount, billingPeriod);

// Update creator stats
prisma.creator.update({
  where: { id: member.creatorId },
  data: {
    totalRevenue: { increment: saleAmount },        // Always add full amount

    // For MRR: Only add if has monthly value (not lifetime)
    monthlyRevenue: monthlyValue
      ? { increment: monthlyValue }
      : undefined,  // Don't update if null (lifetime)
  }
})
```

---

### **Task 5: Run Database Migration**

```bash
npx prisma db push
```

This will add the new fields to the Commission table:
- productType
- billingPeriod
- monthlyValue

---

### **Task 6: Update Seed Script (Optional)**

**File:** `prisma/seed.ts`

Add billing fields to commission generation:

```typescript
await prisma.commission.create({
  data: {
    // ... existing fields ...

    // ✅ ADD THESE:
    productType: 'subscription',
    billingPeriod: 'monthly',  // or 'annual', 'lifetime'
    monthlyValue: saleAmount,  // For monthly; divide by 12 for annual
  }
});
```

---

## 📋 TESTING CHECKLIST:

After implementation, test these scenarios:

### **1. Monthly Subscription ($49.99/month)**
- ✅ Commission created with `billingPeriod: 'monthly'`
- ✅ `monthlyValue: 49.99`
- ✅ Total Revenue: +$49.99
- ✅ MRR: +$49.99

### **2. Annual Subscription ($499/year)**
- ✅ Commission created with `billingPeriod: 'annual'`
- ✅ `monthlyValue: 41.58` ($499/12)
- ✅ Total Revenue: +$499
- ✅ MRR: +$41.58 (NOT +$499!)

### **3. Lifetime Subscription ($999)**
- ✅ Commission created with `billingPeriod: 'lifetime'`
- ✅ `monthlyValue: null`
- ✅ Total Revenue: +$999
- ✅ MRR: +$0 (no recurring component!)

### **4. One-Time Product ($299)**
- ✅ Payment SKIPPED (not tracked)
- ✅ Log message: "⏭️  Skipping non-subscription payment"
- ✅ No commission created

### **5. Recurring Payment (Monthly)**
- ✅ Commission created with `paymentType: 'recurring'`
- ✅ Member earnings updated
- ✅ MRR updated correctly

---

## 🎯 EXPECTED BEHAVIOR:

### **Before Implementation:**
- Track ALL Whop payments (subscriptions + one-time)
- No distinction between billing periods
- Annual $499 adds $499 to MRR (WRONG!)
- One-time $299 course counted as revenue

### **After Implementation:**
- ✅ Only track subscription payments
- ✅ Skip one-time products/courses
- ✅ Annual $499 adds $41.58/month to MRR (CORRECT!)
- ✅ Lifetime $999 adds $0 to MRR, $999 to total (CORRECT!)
- ✅ One-time purchases ignored completely

---

## 🔄 MIGRATION STRATEGY:

**For Existing Data:**

Existing commissions will have default values:
- `productType`: defaults to "subscription"
- `billingPeriod`: defaults to null
- `monthlyValue`: defaults to null

**Options:**
1. **Leave as-is** - Old data treated as monthly subscriptions
2. **Backfill** - Run script to set `billingPeriod: 'monthly'` and `monthlyValue: saleAmount` for all existing records

**Recommended:** Option 2 (backfill) for consistency

```typescript
// scripts/backfill-billing-data.ts
await prisma.commission.updateMany({
  where: {
    billingPeriod: null,
    productType: 'subscription'
  },
  data: {
    billingPeriod: 'monthly',
    monthlyValue: prisma.raw('saleAmount')  // Set monthlyValue = saleAmount
  }
});
```

---

## 📊 DASHBOARD UPDATES (Future):

Consider adding these metrics:

**Revenue Breakdown Card:**
- Monthly Subscriptions: $X
- Annual Subscriptions: $Y (shown as $Y/12 per month)
- Lifetime Sales: $Z (one-time)

**MRR vs Total Revenue:**
- Total Revenue: $10,000 (includes annual + lifetime)
- True MRR: $500/month (normalized monthly value)

---

## ✅ SUMMARY:

**Changes Needed:**
1. Update `processCommission()` to accept billing params
2. Update `handleRecurringPayment()` to accept billing params
3. Pass billing data from main webhook handler
4. Update MRR calculations to use `monthlyValue`
5. Run `prisma db push` to migrate schema
6. Test all billing period scenarios

**Key Logic:**
- Monthly: `monthlyValue = saleAmount`
- Annual: `monthlyValue = saleAmount / 12`
- Lifetime: `monthlyValue = null` (no MRR impact)
- One-time: SKIP (not tracked at all)

**Result:**
- Accurate MRR tracking
- Subscription-only revenue
- Proper annual/lifetime handling
- Clean, filtered metrics
