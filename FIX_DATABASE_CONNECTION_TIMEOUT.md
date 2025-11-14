# Fix Database Connection Timeout Issues (500 Errors After Time)

## Problem
Your app works initially but shows 500 errors after some time. This is caused by **connection pool exhaustion**.

### Root Cause
Your DATABASE_URL has `connection_limit=1` which means only 1 connection can be active at a time. When multiple users access your app, they fight for that single connection, causing timeouts.

## Immediate Fix

### Step 1: Update DATABASE_URL in Vercel

Go to: https://vercel.com/blackbridges-projects/referral-flywheel/settings/environment-variables

Change your DATABASE_URL from:
```
postgresql://postgres:f2ztx6UyPIqO94fO@db.eerhpmjherotaqklpqnc.supabase.co:6543/postgres?pgbouncer=true&connection_limit=1
```

To:
```
postgresql://postgres:f2ztx6UyPIqO94fO@db.eerhpmjherotaqklpqnc.supabase.co:6543/postgres?pgbouncer=true&connection_limit=10&pool_timeout=0
```

**What changed:**
- `connection_limit=10` (was 1) - Allows 10 concurrent connections
- `pool_timeout=0` - Prevents timeout errors

### Step 2: Add DIRECT_URL (if not already added)

Add this as a new environment variable:
```
Name: DIRECT_URL
Value: postgresql://postgres:f2ztx6UyPIqO94fO@db.eerhpmjherotaqklpqnc.supabase.co:5432/postgres
Environment: Production ✓ Preview ✓ Development ✓
```

### Step 3: Redeploy

After updating the environment variables:
1. Go to Deployments tab
2. Click "Redeploy" on the latest deployment
3. Wait 2-3 minutes

## Alternative Fix (If Above Doesn't Work)

If you still get timeouts, use this more aggressive connection string:

```
postgresql://postgres:f2ztx6UyPIqO94fO@db.eerhpmjherotaqklpqnc.supabase.co:6543/postgres?pgbouncer=true&connection_limit=20&pool_timeout=0&connect_timeout=10&statement_timeout=10000&idle_in_transaction_session_timeout=10000
```

This adds:
- `connection_limit=20` - Even more connections
- `connect_timeout=10` - 10 second connection timeout
- `statement_timeout=10000` - 10 second query timeout
- `idle_in_transaction_session_timeout=10000` - Auto-close idle connections

## Why This Happens

Vercel runs your app in **serverless functions** which:
1. Start fresh for each request
2. Can run multiple instances simultaneously
3. Don't share database connections between instances

With `connection_limit=1`, when 2+ users access your app simultaneously:
- User 1 gets the connection ✓
- User 2 waits... and times out ✗
- Result: 500 error

## Prevention

For production Vercel apps with Supabase:
- **Minimum** connection_limit: 10
- **Recommended** connection_limit: 20-30
- **Always** use pgbouncer (port 6543)
- **Never** use connection_limit=1 in production

## Test After Fix

After redeploying, test with:
```bash
# Simulate multiple concurrent users
for i in {1..10}; do
  curl https://your-app.vercel.app/api/health &
done
```

All requests should succeed without timeouts.

## Still Having Issues?

Check Supabase dashboard:
1. Go to https://supabase.com/dashboard/project/eerhpmjherotaqklpqnc/settings/database
2. Check "Connection Pooling" section
3. Ensure pool mode is "Transaction"
4. Check current connections vs limit

Maximum connections for your Supabase plan might be limited. Free tier usually allows 60 connections total.