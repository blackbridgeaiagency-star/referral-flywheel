# Deployment Debugging Guide - Referral Flywheel

## Quick Start: Fix Your Database Connection Issue

Based on your error message, your app is deployed but cannot connect to Supabase. Here's how to fix it:

### 1. Check Supabase Project Status (MOST COMMON ISSUE)
1. Go to https://supabase.com/dashboard
2. Check if your project shows "Paused" status
3. If paused, click "Restore" to reactivate it
4. **Note**: Free tier projects pause after 1 week of inactivity

### 2. Verify DATABASE_URL in Vercel
1. Go to your Vercel project settings
2. Navigate to Environment Variables
3. Check that DATABASE_URL follows this exact format:
   ```
   postgresql://postgres:[YOUR_PASSWORD]@db.eerhpmjherotaqklpqnc.supabase.co:6543/postgres?pgbouncer=true&connection_limit=1
   ```
4. **Critical**: Make sure you're using port `6543` (not 5432) for pooled connections
5. **Important**: If your password contains special characters (@, #, %, etc.), they must be URL-encoded

### 3. Redeploy on Vercel
After fixing environment variables:
1. Go to your Vercel project
2. Navigate to Deployments
3. Click "Redeploy" on the latest deployment
4. Select "Use existing Build Cache" for faster deployment

## New Debugging Tools Available

I've added several tools to help diagnose and fix issues:

### 1. Database Connection Test
**URL**: https://referral-flywheel.vercel.app/api/debug/db-test

This endpoint provides detailed information about:
- Database connection status
- Environment variable configuration
- Specific error messages with troubleshooting steps
- Connection details (host, port, pooling settings)

### 2. Health Check Endpoint
**URL**: https://referral-flywheel.vercel.app/api/health

Monitor overall system health:
- Database connectivity
- Environment variable status
- Memory usage
- Response times

### 3. Environment Variable Validator
Run locally to validate your setup:
```bash
npm run validate:env
```

This script will:
- Check all required environment variables
- Validate DATABASE_URL format
- Test database connection
- Provide specific fix recommendations

## Enhanced Error Handling

### Dashboard Error Pages
Both creator and member dashboards now show:
- Specific error types (connection, authentication, schema)
- Detailed troubleshooting steps
- Quick links to debug tools
- Clear error codes for tracking

### Database Retry Logic
The Prisma client now:
- Automatically retries failed connections (3 attempts)
- Uses exponential backoff (1s, 2s, 5s delays)
- Logs retry attempts for debugging
- Handles connection pooling properly

### Error Boundary Components
Added React error boundaries that:
- Catch rendering errors gracefully
- Provide database-specific error messages
- Offer quick fix suggestions
- Include debug tool links

## Testing Your Fix

After making changes, test in this order:

1. **Test Database Connection**:
   ```
   https://referral-flywheel.vercel.app/api/debug/db-test
   ```
   Should return `"success": true`

2. **Check System Health**:
   ```
   https://referral-flywheel.vercel.app/api/health
   ```
   Should return `"status": "healthy"`

3. **Access Creator Dashboard**:
   ```
   https://referral-flywheel.vercel.app/seller-product/prod_ImvAT3IIRbPBT
   ```
   Should load without errors

4. **Test Through Whop**:
   Access your app through the Whop dashboard iframe

## Common Issues and Solutions

### Issue: "Can't reach database server"
**Solution**: Supabase project is paused. Reactivate it in Supabase dashboard.

### Issue: "authentication failed"
**Solution**: Password is incorrect or not properly encoded. Update DATABASE_URL.

### Issue: "relation does not exist"
**Solution**: Database tables missing. Run migrations:
```bash
npx prisma db push
```

### Issue: Works locally but not on Vercel
**Solution**: Environment variables not set in Vercel or using wrong port.

## Whop Integration Checklist

Verify these settings in Whop Developer Dashboard:

- Base URL: `https://referral-flywheel.vercel.app`
- App path: `/customer/[experienceId]`
- Dashboard path: `/seller-product/[experienceId]`
- Discover path: `/discover`
- Webhook URL: `https://referral-flywheel.vercel.app/api/webhooks/whop`

## Need More Help?

1. Check Vercel function logs for detailed error messages
2. Run the validation script locally: `npm run validate:env`
3. Test each endpoint individually using the debug tools
4. Check Supabase logs for connection attempts

## Summary of Changes Made

1. **Added Debugging Endpoints**:
   - `/api/debug/db-test` - Comprehensive database testing
   - `/api/health` - System health monitoring

2. **Improved Error Handling**:
   - Enhanced error messages in dashboard pages
   - Added specific troubleshooting guidance
   - Created error boundary components

3. **Database Resilience**:
   - Added automatic retry logic
   - Implemented connection pooling
   - Added graceful disconnection

4. **Validation Tools**:
   - Created environment variable validator
   - Added connection testing utilities

These improvements will help you quickly identify and resolve deployment issues, ensuring your Referral Flywheel app runs smoothly in production.