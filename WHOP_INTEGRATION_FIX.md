# Whop Integration 404 Fix

## Problem
App works when accessed directly via URL but shows 404 when accessed through Whop dashboard.

## Root Cause
Whop is not correctly redirecting to your Vercel app, or the experienceId is not being passed correctly.

## Solution Checklist

### 1. Verify Whop App Settings
Go to: https://whop.com/dashboard/biz_kkGoY7OvzWXRdK/apps/app_xa1a8NaAKUVPuO/settings

**Required Settings**:
```
Base URL: https://referral-flywheel.vercel.app

Customer App Path: /customer/[experienceId]
Dashboard Path: /seller-product/[experienceId]
Discover Path: /discover

Webhook URL: https://referral-flywheel.vercel.app/api/webhooks/whop
```

**CRITICAL**: Ensure these are EXACT matches. No trailing slashes, correct brackets.

### 2. Check What experienceId Whop is Using

When you click the app from Whop, what does Whop actually send?

**For Members**: Whop should load:
```
https://referral-flywheel.vercel.app/customer/[PRODUCT_ID]
```

**For Sellers**: Whop should load:
```
https://referral-flywheel.vercel.app/seller-product/[PRODUCT_ID]
```

**Your Product ID**: `prod_ImvAT3IIRbPBT`

So the correct URLs should be:
- Member: `https://referral-flywheel.vercel.app/customer/prod_ImvAT3IIRbPBT`
- Seller: `https://referral-flywheel.vercel.app/seller-product/prod_ImvAT3IIRbPBT`

### 3. Test Direct URLs First

Before testing through Whop, verify these work directly:

1. **Seller Dashboard**:
   ```
   https://referral-flywheel.vercel.app/seller-product/prod_ImvAT3IIRbPBT
   ```
   ✅ You confirmed this works

2. **Member Dashboard** (use YOUR member experienceId):
   ```
   https://referral-flywheel.vercel.app/customer/[YOUR_EXPERIENCE_ID]
   ```

### 4. Check Whop App Installation

1. Go to your Whop business dashboard
2. Navigate to "Apps" or "Installed Apps"
3. Find "Referral Flywheel"
4. Click to open/configure
5. Verify it's properly installed and enabled

### 5. Debug What URL Whop is Loading

When you get the 404 in Whop:
1. Open browser Developer Tools (F12)
2. Go to the Network tab
3. Click the app in Whop
4. Look for the iframe request
5. Check what URL is being loaded

**To check**:
- Right-click in the Whop app area
- Select "Inspect" or "Inspect Element"
- Look for an `<iframe>` tag
- Check its `src` attribute - what URL does it show?

### 6. Common Issues & Fixes

#### Issue: Whop loading wrong URL
**Fix**: Update Base URL in Whop settings, remove and re-add the app

#### Issue: experienceId not being passed
**Fix**: Check Whop settings use `[experienceId]` (not `{experienceId}` or other format)

#### Issue: CORS or iframe blocking
**Fix**: Already handled in your next.config.js with:
```javascript
"frame-ancestors https://whop.com https://*.whop.com"
```

#### Issue: App not installed in product
**Fix**:
1. Go to product settings in Whop
2. Add/enable the Referral Flywheel app
3. Ensure it's set as "Active"

### 7. Verify App is Enabled for Product

For product `prod_ImvAT3IIRbPBT`:
1. Go to Whop Dashboard → Products
2. Find "BlackBridge Agency" product
3. Go to product settings
4. Check "Apps" section
5. Verify "Referral Flywheel" is enabled

## Testing Steps

1. **Test as Creator**:
   - Log into Whop as the product owner
   - Go to your business dashboard
   - Click on "Referral Flywheel" app
   - Should load: `/seller-product/prod_ImvAT3IIRbPBT`

2. **Test as Member**:
   - Log into Whop as a member (customer)
   - Go to your membership dashboard
   - Click on "Referral Flywheel" app
   - Should load: `/customer/[your_member_experience_id]`

## Expected Behavior

When working correctly:
1. Click app in Whop
2. Whop loads iframe with URL: `https://referral-flywheel.vercel.app/[seller-product or customer]/[experienceId]`
3. Your app detects it's in iframe
4. Dashboard loads with data

## If Still Not Working

1. **Check Whop Console**:
   - Go to Whop Developer Console
   - Look for any errors or warnings

2. **Check Vercel Function Logs**:
   ```bash
   npx vercel logs referral-flywheel --follow
   ```

3. **Add Logging**:
   We can add middleware to log all incoming requests to debug what Whop is sending

4. **Contact Whop Support**:
   If Whop is not constructing the correct URLs, this may be a Whop platform issue

## Quick Fix to Try Now

1. Go to Whop Developer Dashboard
2. Remove the app from your business
3. Re-add/install the app
4. Verify all settings are correct
5. Try accessing again

This forces Whop to refresh its configuration.
