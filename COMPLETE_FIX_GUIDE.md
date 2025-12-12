# COMPLETE FIX GUIDE - Referral Flywheel

## ISSUE 1: Database Connection (Causes "Something Went Wrong")

### IMMEDIATE ACTION:

#### Step 1: Check Supabase Status
Go to: https://supabase.com/dashboard/project/eerhpmjherotaqklpqnc

**CHECK:** Is your database showing "PAUSED"?
- If YES → Click "Restore" or "Resume" → Wait 2 minutes
- If NO → Continue to Step 2

#### Step 2: Get CORRECT Connection String
1. Go to: https://supabase.com/dashboard/project/eerhpmjherotaqklpqnc/settings/database
2. Click "Connection String" tab
3. **IMPORTANT**: Select "Connection Pooling" (NOT "Direct Connection")
4. Copy the ENTIRE connection string
5. It should look like:
   ```
   postgresql://postgres.[ID]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```

#### Step 3: Update Vercel Environment
1. Go to: https://vercel.com/blackbridges-projects/referral-flywheel/settings/environment-variables
2. Find DATABASE_URL
3. Click the three dots (⋮) → Edit
4. **REPLACE ENTIRE VALUE** with the pooler connection string from Step 2
5. Add to the END: `?pgbouncer=true&connection_limit=20&pool_timeout=0`
6. Full example:
   ```
   postgresql://postgres.[ID]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=20&pool_timeout=0
   ```
7. Click "Save"

#### Step 4: Deploy to Vercel
Run this command:
```bash
vercel --prod --yes --force
```

#### Step 5: Verify Database Works
```bash
curl https://referral-flywheel.vercel.app/api/health
```
Should return: `"status": "healthy"`

---

## ISSUE 2: 404 Error (Customer View Not Working)

### The Problem:
- Customer URL: `https://whop.com/joined/blackbridgeagency/exp_0Zqx0UPJigG6FR/app/` → 404
- Seller URL: `https://whop.com/dashboard/biz_kkGoY7OvzWXRdK/apps/app_xa1a8NaAKUVPuO/` → Works (after DB fix)

### The Fix: Update Whop App Configuration

#### Step 1: Go to Whop Developer Dashboard
https://whop.com/dashboard/developer/app_xa1a8NaAKUVPuO

#### Step 2: Update View URLs
Find the "Views" or "URLs" section and set:

**Customer View URL:**
```
https://referral-flywheel.vercel.app/customer/$experienceId
```

**Seller View URL:**
```
https://referral-flywheel.vercel.app/seller-product/$companyId
```

**Seller Onboarding URL:**
```
https://referral-flywheel.vercel.app/seller-product/$companyId/onboarding
```

#### Step 3: Update Webhook URLs
In the same dashboard, find "Webhooks" and set:

**Webhook URL:**
```
https://referral-flywheel.vercel.app/api/webhooks/whop
```

**Install Webhook URL:**
```
https://referral-flywheel.vercel.app/api/webhooks/whop/install
```

#### Step 4: Save Changes
Click "Save" or "Update" in the Whop dashboard

---

## VERIFICATION CHECKLIST

After completing BOTH fixes above:

### ✅ Test 1: Database Health
```bash
curl https://referral-flywheel.vercel.app/api/health
```
✅ Should return: `"status": "healthy"`

### ✅ Test 2: Seller Dashboard
1. Go to: https://whop.com/dashboard/biz_kkGoY7OvzWXRdK/apps/app_xa1a8NaAKUVPuO/
2. ✅ Should load without "Something Went Wrong"

### ✅ Test 3: Customer Dashboard
1. Go to: https://whop.com/joined/blackbridgeagency/exp_0Zqx0UPJigG6FR/app/
2. ✅ Should load member dashboard (not 404)

### ✅ Test 4: Direct URLs
```bash
# Test seller view directly
curl https://referral-flywheel.vercel.app/seller-product/biz_kkGoY7OvzWXRdK

# Test customer view directly
curl https://referral-flywheel.vercel.app/customer/exp_0Zqx0UPJigG6FR
```

---

## COMMON ISSUES & SOLUTIONS

### "Can't reach database server"
- **Cause**: Wrong connection string or database paused
- **Fix**: Follow Database Fix steps above

### "404 Not Found" on customer view
- **Cause**: Whop app not configured with correct URLs
- **Fix**: Update Whop app configuration (Issue 2 above)

### "Something Went Wrong" in Whop
- **Cause**: Database connection failed
- **Fix**: Database Fix steps above

### Changes not taking effect
- **Always run**: `vercel --prod --yes --force`
- **Not**: git push (this doesn't deploy to production)

---

## PERMANENT SOLUTION SUMMARY

1. **Database URL must be**:
   - From Supabase "Connection Pooling" section
   - Include `?pgbouncer=true&connection_limit=20&pool_timeout=0`
   - Use port 6543 (not 5432)

2. **Whop App Configuration must have**:
   - Customer View: `https://referral-flywheel.vercel.app/customer/$experienceId`
   - Seller View: `https://referral-flywheel.vercel.app/seller-product/$companyId`

3. **Deploy with**: `vercel --prod --yes` (NOT git push)

4. **Monitor database**: Check Supabase weekly (free tier pauses after 7 days)

---

## EMERGENCY CONTACTS

- **Supabase Dashboard**: https://supabase.com/dashboard/project/eerhpmjherotaqklpqnc
- **Vercel Dashboard**: https://vercel.com/blackbridges-projects/referral-flywheel
- **Whop Developer**: https://whop.com/dashboard/developer/app_xa1a8NaAKUVPuO

---

**Last Updated**: November 14, 2024
**Status**: Both issues identified, fixes documented