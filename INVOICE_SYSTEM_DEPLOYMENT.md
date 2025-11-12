# Revenue Share Invoice System - Deployment Guide

## Overview

The invoice system automatically generates monthly invoices for creators based on their referred sales. It uses Stripe for payment processing and displays value metrics to show creators the ROI they're getting.

## Architecture

**Flow:**
1. Members refer new users → Tagged as "referred" in database
2. Referred members make purchases → Tracked as referred commissions
3. Monthly cron job runs → Generates invoices for all creators
4. Stripe sends invoices → Creators pay via Stripe
5. Webhooks update status → Dashboard shows invoice history

**Key Components:**
- **Value Calculator**: Calculates ROI and net benefit for creators
- **Invoice Generator**: Creates Stripe invoices with value-focused messaging
- **Dashboard UI**: Shows Partnership Impact Card and Invoice History
- **Email Notifications**: Value-focused emails (not aggressive)

## Deployment Steps

### 1. Database Migration

```bash
# Apply the schema changes
npx prisma db push

# Run backfill script to prepare existing data
npx tsx scripts/backfill-invoice-data.ts
```

This adds:
- `Invoice` model
- Invoice-related fields to `Creator` and `Commission` models

### 2. Stripe Setup

**2.1. Create Stripe Account**
- Go to https://stripe.com
- Create account or use existing

**2.2. Get API Keys**
```bash
# Test mode (for development)
STRIPE_SECRET_KEY=sk_test_...

# Live mode (for production)
STRIPE_SECRET_KEY=sk_live_...
```

**2.3. Configure Webhooks**
1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-domain.com/api/webhooks/stripe`
3. Select events:
   - `invoice.paid`
   - `invoice.payment_failed`
   - `invoice.payment_action_required`
4. Copy webhook signing secret: `whsec_...`

### 3. Environment Variables

Add to Vercel/production environment:

```bash
# Stripe
STRIPE_SECRET_KEY=sk_live_[YOUR_KEY]
STRIPE_WEBHOOK_SECRET=whsec_[YOUR_SECRET]

# Cron Security
CRON_SECRET=[RANDOM_32_CHAR_STRING]
```

**Generate CRON_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Vercel Cron Job

**4.1. Add to `vercel.json`:**
```json
{
  "crons": [{
    "path": "/api/cron/generate-invoices",
    "schedule": "0 9 1 * *"
  }]
}
```

**Schedule:** 9 AM UTC on the 1st of each month

**4.2. Test Cron Manually:**
```bash
curl -X POST https://your-domain.com/api/cron/generate-invoices \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### 5. Testing

**5.1. Test Value Metrics API:**
```bash
curl https://your-domain.com/api/creator/[CREATOR_ID]/value-metrics
```

Expected response:
```json
{
  "currentMonth": {
    "organicSalesCount": 10,
    "referredSalesCount": 5,
    "additionalRevenueGenerated": 350,
    "platformFeesOwed": 100,
    "netBenefit": 250,
    "roiOnPlatformFee": 3.5,
    "shouldInvoice": true
  },
  "lastMonth": { ... },
  "allTime": { ... }
}
```

**5.2. Test Invoice Generation (Development):**
```bash
# Manually trigger invoice generation
curl -X POST http://localhost:3000/api/cron/generate-invoices
```

**5.3. Test Stripe Webhook:**
```bash
# Use Stripe CLI
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger test event
stripe trigger invoice.paid
```

### 6. Dashboard Integration

The system automatically adds two new components to the creator dashboard:

**Partnership Impact Card** (top of dashboard):
- Shows extra revenue generated this month
- Displays ROI on platform fee
- Shows organic vs referred breakdown
- Preview of next invoice

**Invoice History** (below Top Performers):
- Table of past invoices
- Value metrics for each month
- Links to Stripe invoices
- Status badges (Paid, Sent, Overdue)

### 7. Monitoring

**7.1. Check Logs:**
```bash
# Vercel
vercel logs --follow

# Look for:
# - "🔄 Starting monthly invoice generation..."
# - "✅ Invoice created: inv_..."
# - "💰 Invoice paid: inv_..."
```

**7.2. Check Stripe Dashboard:**
- Invoices → See all generated invoices
- Customers → See creator Stripe customer records
- Webhooks → Monitor webhook delivery

**7.3. Check Database:**
```sql
-- Recent invoices
SELECT
  i.id,
  c.companyName,
  i.periodStart,
  i.totalAmount,
  i.status,
  i.salesCount
FROM Invoice i
JOIN Creator c ON i.creatorId = c.id
ORDER BY i.createdAt DESC
LIMIT 10;

-- Invoice summary by status
SELECT
  status,
  COUNT(*) as count,
  SUM(totalAmount) as total
FROM Invoice
GROUP BY status;
```

## Troubleshooting

### No Invoices Generated

**Check:**
1. Are there creators with `invoicingEnabled = true`?
2. Do creators have referred sales in the last month?
3. Is the platform fee >= $10 minimum?

**Debug:**
```bash
# Check for uninvoiced platform fees
SELECT
  c.companyName,
  COUNT(*) as sales,
  SUM(co.platformShare) as fees
FROM Commission co
JOIN Creator c ON co.creatorId = c.id
WHERE co.platformFeeInvoiced = false
  AND co.status = 'paid'
GROUP BY c.id;
```

### Stripe Webhook Failing

**Check:**
1. Webhook secret is correct in environment variables
2. Webhook endpoint is accessible (not behind auth)
3. Webhook events are configured correctly

**Debug:**
```bash
# Check Stripe Dashboard → Webhooks → [Your Endpoint] → Attempts
# Look for 4xx/5xx errors
```

### Email Not Sending

**Note:** Email templates are created but not integrated yet. To integrate:

```typescript
// In lib/invoice/generator.ts, after creating invoice:
import { invoiceCreatedEmail } from './email-templates';
import { sendEmail } from '../email/resend-client';

await sendEmail(invoiceCreatedEmail(creator, invoice));
```

## Revenue Projections

Based on the prompt's example:
- 100 communities × 50 members each = 5,000 total members
- Average 2 referrals per member = 10,000 referred members
- Average sale: $49.99/month
- Platform revenue: $49.99 × 10,000 × 20% = **$99,980/month**

## Key Metrics to Monitor

1. **Invoice Success Rate**: % of invoices paid on time
2. **Average ROI Multiple**: Avg creator ROI on platform fee
3. **Total Platform Revenue**: Sum of all paid invoices
4. **Creator Retention**: % of creators staying active

## Support

For issues or questions:
1. Check Vercel function logs
2. Check Stripe webhook delivery logs
3. Check database Invoice table
4. Email: support@yourcompany.com
