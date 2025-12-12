# Database Connection Issue - Vercel Cannot Reach Supabase

## Current Status
- ✅ Deployment successful via `vercel --prod`
- ✅ Build completes without errors
- ❌ Database unreachable from Vercel production
- ✅ Database works from local environment

## Problem
```
Can't reach database server at db.eerhpmjherotaqklpqnc.supabase.co:6543
```

## Possible Causes & Solutions

### 1. Check Supabase Database Status
Go to: https://supabase.com/dashboard/project/eerhpmjherotaqklpqnc

Check if:
- Database is ACTIVE (not paused)
- Database hasn't been paused due to inactivity (free tier pauses after 7 days)

**If Paused:** Click "Restore" or "Resume" button

### 2. Verify Database Password
Your password `f2ztx6UyPIqO94fO` has no special characters, so it should be fine.

### 3. Check Supabase Connection Pooling Settings
1. Go to: https://supabase.com/dashboard/project/eerhpmjherotaqklpqnc/settings/database
2. Find "Connection Pooling" section
3. Ensure:
   - Pool Mode: Transaction
   - Pooler is ENABLED

### 4. Get the Correct Pooler Connection String
1. Go to: https://supabase.com/dashboard/project/eerhpmjherotaqklpqnc/settings/database
2. Click on "Connection String" tab
3. Select "Connection Pooling" mode
4. Copy the connection string
5. Add these parameters to the end:
   ```
   ?pgbouncer=true&connection_limit=20&pool_timeout=0
   ```

### 5. Update Vercel Environment Variables
1. Go to: https://vercel.com/blackbridges-projects/referral-flywheel/settings/environment-variables
2. Update DATABASE_URL with the pooler connection string from step 4
3. Make sure it includes:
   - Port 6543 (pooler port)
   - `?pgbouncer=true&connection_limit=20&pool_timeout=0`

### 6. Deploy Again
```bash
vercel --prod --yes
```

## Alternative Connection Strings to Try

### Option 1: Direct Connection (NOT recommended for production)
```
postgresql://postgres:f2ztx6UyPIqO94fO@db.eerhpmjherotaqklpqnc.supabase.co:5432/postgres
```

### Option 2: Pooler with IPv4 (if IPv6 issues)
Sometimes Vercel has issues with IPv6. Try forcing IPv4 by using the IP address directly.

### Option 3: Transaction Pooler URL
Get this from Supabase dashboard under "Connection Pooling" section.

## Testing After Fix

1. Deploy:
```bash
vercel --prod --yes
```

2. Test health:
```bash
curl https://referral-flywheel.vercel.app/api/health
```

3. Check in Whop:
Open your app in Whop Dashboard

## If Still Not Working

### Check Vercel Logs
```bash
vercel logs referral-flywheel.vercel.app
```

### Contact Support
1. **Supabase Support**: Check if there are any issues with your project
2. **Vercel Support**: Ask if there are any known issues connecting to Supabase

### Temporary Workaround
If urgent, you can:
1. Use a different database provider (e.g., Neon, PlanetScale)
2. Use Supabase's REST API instead of direct database connection

## Most Likely Issue
Based on the symptoms:
- **Database is paused** (free tier auto-pauses after 7 days of inactivity)
- **Wrong connection string** in Vercel (not using the pooler URL)

## Action Items
1. ✅ Check Supabase dashboard - is database ACTIVE?
2. ✅ Get correct pooler connection string
3. ✅ Update Vercel environment variables
4. ✅ Deploy with `vercel --prod --yes`