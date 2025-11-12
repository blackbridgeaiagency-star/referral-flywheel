# 🔐 SECURE KEYS TEMPLATE
**⚠️ IMPORTANT: DO NOT COMMIT THIS FILE TO GIT**

## ✅ ALL EXPOSED SECRETS HAVE BEEN REMOVED FROM YOUR CODE

### What I Fixed:
1. ✅ Removed hardcoded database passwords from 3 script files
2. ✅ Removed all secrets from PRODUCTION_DEPLOYMENT_CHECKLIST.md
3. ✅ Scripts now use environment variables instead of hardcoded values
4. ⚠️ Your `.env.local` still has the old secrets (not in git, but needs updating)

---

## 🚨 ACTION REQUIRED: Regenerate All Keys NOW

### 1. DATABASE PASSWORD (Supabase)
**Old Password (COMPROMISED):** `cFWGc4UtNVXm6NYt`

**Steps to Regenerate:**
1. Go to: https://supabase.com/dashboard/project/eerhpmjherotaqklpqnc
2. Navigate to: Settings → Database
3. Click: "Reset Database Password"
4. Copy new password here: `_______________________`

**New DATABASE_URL:**
```
postgresql://postgres:[NEW_PASSWORD]@db.eerhpmjherotaqklpqnc.supabase.co:6543/postgres?pgbouncer=true
```

---

### 2. WHOP API CREDENTIALS
**Old API Key (COMPROMISED):** `wFlUR9Nil3SXRgbss31y6XhSpA8UtkoBI3GsL3J42Bs`
**Old Webhook Secret (COMPROMISED):** `ws_4504b4a33dc97e85bb34a44207d74fadc8151412a25b07729efb623ca86e412b`

**Steps to Regenerate:**
1. Go to: https://whop.com/dashboard/developer
2. Find your app
3. Click "Regenerate API Key"
4. Click "Regenerate Webhook Secret"
5. Copy new values:
   - New API Key: `_______________________`
   - New Webhook Secret: `_______________________`

---

### 3. ADMIN KEYS
**Old Keys (COMPROMISED):**
- ADMIN_API_KEY: `5923970a4846cae58a963a0c33716ae27b319bdb0b7a7e15386dc134c2800d88`
- CRON_SECRET: `23815ff20528b2a0d287654eb0ff1a88334bff6bf8d7507574ad6e6a7b1df683`
- EXPORT_API_KEY: `612265de53a6b2d6d03136b96cdc9cbb010770ce56d358732f53ce9d08bd5f76`
- SESSION_SECRET: `OWLw9xQu740kN3GRJbYmXJb7XYm47l0Qyf5Zp9T4l8o=`

**Generate New Keys (Run these commands):**
```bash
echo "ADMIN_API_KEY=$(openssl rand -hex 32)"
echo "CRON_SECRET=$(openssl rand -hex 32)"
echo "EXPORT_API_KEY=$(openssl rand -hex 32)"
echo "SESSION_SECRET=$(openssl rand -base64 32)"
```

**New Values:**
- ADMIN_API_KEY: `_______________________`
- CRON_SECRET: `_______________________`
- EXPORT_API_KEY: `_______________________`
- SESSION_SECRET: `_______________________`

---

## 4. UPDATE YOUR .env.local FILE

Replace the entire contents of `.env.local` with:

```env
# Database (with NEW password)
DATABASE_URL=postgresql://postgres:[NEW_PASSWORD]@db.eerhpmjherotaqklpqnc.supabase.co:6543/postgres?pgbouncer=true

# Whop Integration (with NEW keys)
WHOP_API_KEY=[NEW_WHOP_API_KEY]
WHOP_WEBHOOK_SECRET=[NEW_WHOP_WEBHOOK_SECRET]

# Public IDs (these are safe - keep as is)
NEXT_PUBLIC_WHOP_APP_ID=app_xa1a8NaAKUVPuO
NEXT_PUBLIC_WHOP_COMPANY_ID=biz_kkGoY7OvzWXRdK
NEXT_PUBLIC_WHOP_AGENT_USER_ID=user_QzqUqxWUTwyHz

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Security Tokens (with NEW generated values)
ADMIN_API_KEY=[NEW_ADMIN_KEY]
CRON_SECRET=[NEW_CRON_SECRET]
EXPORT_API_KEY=[NEW_EXPORT_KEY]
SESSION_SECRET=[NEW_SESSION_SECRET]

# Features
ENABLE_API_VERIFICATION=true
ENABLE_SESSION_CACHE=true
SESSION_MAX_AGE=86400
```

---

## 5. VERCEL DEPLOYMENT VARIABLES

When deploying to Vercel, add these environment variables:

1. Go to: https://vercel.com/[your-account]/[your-project]/settings/environment-variables
2. Add each variable with the NEW values
3. Make sure to set `NEXT_PUBLIC_APP_URL` to your Vercel URL

---

## ⚠️ SECURITY CHECKLIST

- [ ] Changed Supabase database password
- [ ] Regenerated Whop API key
- [ ] Regenerated Whop webhook secret
- [ ] Generated new admin keys
- [ ] Updated .env.local with new values
- [ ] Deleted this file after copying values
- [ ] Never commit this file to git

---

## 📝 NOTES

- The public IDs (NEXT_PUBLIC_WHOP_APP_ID, etc.) are safe to keep as they're meant to be public
- Always use environment variables, never hardcode secrets
- Rotate keys regularly (every 90 days recommended)
- Use a password manager to store these securely

---

**REMINDER: Delete this file after you've saved your new keys securely!**