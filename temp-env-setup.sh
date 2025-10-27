#!/bin/bash
# Script to set up Vercel environment variables

echo "Setting up environment variables..."

# Add DATABASE_URL
echo -n "postgresql://postgres:cFWGc4UtNVXm6NYt@db.eerhpmjherotaqklpqnc.supabase.co:6543/postgres?pgbouncer=true" | npx vercel env add DATABASE_URL production --force

# Add WHOP_API_KEY
echo -n "wFlUR9Nil3SXRgbss31y6XhSpA8UtkoBI3GsL3J42Bs" | npx vercel env add WHOP_API_KEY production --force

# Add WHOP_WEBHOOK_SECRET
echo -n "ws_4504b4a33dc97e85bb34a44207d74fadc8151412a25b07729efb623ca86e412b" | npx vercel env add WHOP_WEBHOOK_SECRET production --force

# Add NEXT_PUBLIC_WHOP_APP_ID
echo -n "app_xa1a8NaAKUVPuO" | npx vercel env add NEXT_PUBLIC_WHOP_APP_ID production --force

# Add NEXT_PUBLIC_WHOP_COMPANY_ID
echo -n "biz_kkGoY7OvzWXRdK" | npx vercel env add NEXT_PUBLIC_WHOP_COMPANY_ID production --force

# Add NEXT_PUBLIC_APP_URL (will be updated after deployment)
echo -n "https://referral-flywheel.vercel.app" | npx vercel env add NEXT_PUBLIC_APP_URL production --force

# Add CRON_SECRET
echo -n "23815ff20528b2a0d287654eb0ff1a88334bff6bf8d7507574ad6e6a7b1df683" | npx vercel env add CRON_SECRET production --force

# Add IP_HASH_SALT (generate a new one for production)
echo -n "9a8b7c6d5e4f3g2h1i0j" | npx vercel env add IP_HASH_SALT production --force

echo "Environment variables setup complete!"