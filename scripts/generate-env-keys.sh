#!/bin/bash
# scripts/generate-env-keys.sh
# Generate security keys for production environment variables

echo "🔐 Generating Security Keys for Vercel Environment Variables"
echo "============================================================"
echo ""

echo "📋 Copy these values to Vercel Dashboard → Settings → Environment Variables"
echo ""

echo "ADMIN_API_KEY:"
openssl rand -hex 32
echo ""

echo "CRON_SECRET:"
openssl rand -hex 32
echo ""

echo "EXPORT_API_KEY:"
openssl rand -hex 32
echo ""

echo "SESSION_SECRET:"
openssl rand -base64 32
echo ""

echo "============================================================"
echo "✅ Keys generated successfully!"
echo ""
echo "Next steps:"
echo "1. Copy each value above"
echo "2. Go to: https://vercel.com/dashboard"
echo "3. Select your project → Settings → Environment Variables"
echo "4. Add each key with its generated value"
echo "5. Set environment to: Production, Preview, Development"
echo "6. Redeploy your app"
