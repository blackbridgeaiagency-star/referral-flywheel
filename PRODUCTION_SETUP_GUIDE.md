# Production Setup Guide - Fix 500 Error

**Issue:** Your app is getting a 500 error because environment variables aren't configured in Vercel.

---

## 🔴 **Why You're Getting 500 Error**

Your local environment has these critical variables, but Vercel production doesn't:

1. ❌ `DATABASE_URL` - Missing (app can't connect to database)
2. ❌ `WHOP_API_KEY` - Missing (can't authenticate with Whop)
3. ❌ `WHOP_WEBHOOK_SECRET` - Missing (can't verify webhooks)
4. ❌ `NEXT_PUBLIC_APP_URL` - Set to localhost (needs production URL)
5. ❌ Security keys - Missing (ADMIN_API_KEY, CRON_SECRET, etc.)

**Result:** App crashes on startup → 500 Internal Server Error

---

## ✅ **Fix: Add Environment Variables to Vercel**

### **Step 1: Go to Vercel Dashboard**

1. Visit https://vercel.com/dashboard
2. Select your project: `referral-flywheel`
3. Go to **Settings** → **Environment Variables**

---

### **Step 2: Add Required Variables**

Copy these from your local `.env.local` and add to Vercel:

#### **🔹 Database (REQUIRED)**
```
DATABASE_URL
postgresql://postgres:f2ztx6UyPIqO94fO@db.eerhpmjherotaqklpqnc.supabase.co:6543/postgres?pgbouncer=true&connection_limit=1
```
**Environment:** Production, Preview, Development

---

#### **🔹 Whop Integration (REQUIRED)**
```
WHOP_API_KEY
fm64WiJRXFbXJxjM1QQRtnPW54vVwj7yBrVidd-bwYk

WHOP_WEBHOOK_SECRET
ws_432f83a76289c20c3de730d2648831d6f83893a8bb59748ef0924fe8436cecc2

NEXT_PUBLIC_WHOP_APP_ID
app_xa1a8NaAKUVPuO

NEXT_PUBLIC_WHOP_COMPANY_ID
biz_kkGoY7OvzWXRdK

NEXT_PUBLIC_WHOP_AGENT_USER_ID
user_QzqUqxWUTwyHz
```
**Environment:** Production, Preview, Development

---

#### **🔹 Application URL (REQUIRED)**
```
NEXT_PUBLIC_APP_URL
https://your-production-domain.vercel.app
```
**⚠️ IMPORTANT:** Replace with your actual Vercel deployment URL!

To find your URL:
- Go to Vercel Dashboard → Project → Deployments
- Copy the production URL (e.g., `https://referral-flywheel.vercel.app`)
- **NO trailing slash**

**Environment:** Production only

---

#### **🔹 Security Keys (REQUIRED for Production)**

Generate these using your terminal:

```bash
# Generate ADMIN_API_KEY
openssl rand -hex 32

# Generate CRON_SECRET
openssl rand -hex 32

# Generate EXPORT_API_KEY
openssl rand -hex 32

# Generate SESSION_SECRET
openssl rand -base64 32
```

Add to Vercel:
```
ADMIN_API_KEY
[paste generated value from command above]

CRON_SECRET
[paste generated value]

EXPORT_API_KEY
[paste generated value]

SESSION_SECRET
[paste generated value]
```
**Environment:** Production, Preview, Development

---

#### **🔹 Optional: Email (Resend)**
```
RESEND_API_KEY
re_YOUR_KEY_HERE
```
**Environment:** Production (if you want email notifications)

---

#### **🔹 Optional: Stripe (Revenue Share)**
```
STRIPE_SECRET_KEY
sk_live_YOUR_KEY_HERE

STRIPE_WEBHOOK_SECRET
whsec_YOUR_SECRET_HERE
```
**Environment:** Production (if you want automated invoicing)

---

### **Step 3: Redeploy**

After adding environment variables:

1. Go to **Deployments** tab
2. Click on the latest deployment
3. Click **"Redeploy"** button (three dots menu)
4. Wait 2-3 minutes for build to complete

**OR** push a new commit:
```bash
git commit --allow-empty -m "Trigger redeploy with env vars"
git push
```

---

## 🔍 **Verify Environment Variables Are Set**

After redeploying, check your deployment logs:

1. Go to Vercel → Deployments → Latest deployment
2. Click **"Build Logs"**
3. Look for errors like:
   - ❌ `Environment variable not found: DATABASE_URL`
   - ❌ `PrismaClientInitializationError`
   - ❌ `Missing required environment variable`

If you see these, the variables aren't set correctly.

---

## 🧪 **Test the Deployment**

Once redeployed with environment variables:

### **1. Health Check**
```bash
curl https://your-domain.vercel.app/api/health
```
**Expected:** `{"status": "ok", "timestamp": "..."}`

### **2. Database Connection**
```bash
curl https://your-domain.vercel.app/api/debug/db-test
```
**Expected:** Success message with database stats

### **3. Leaderboard API**
```bash
curl https://your-domain.vercel.app/api/leaderboard?type=earnings&scope=global&limit=5
```
**Expected:** JSON response with leaderboard data

---

## 🚨 **Common Issues**

### **Issue 1: Still Getting 500 Error After Adding Env Vars**
**Solution:** Make sure you clicked "Redeploy" or pushed a new commit. Environment variables only apply to NEW deployments.

### **Issue 2: DATABASE_URL Connection Refused**
**Solution:**
- Check Supabase is online: https://supabase.com/dashboard
- Verify connection string uses port **6543** (pooled connection)
- Test connection locally first

### **Issue 3: Whop API 401 Unauthorized**
**Solution:**
- Verify `WHOP_API_KEY` is correct in Whop Dashboard → Settings → API Keys
- Make sure it's a **server-side API key** (not public key)

### **Issue 4: NEXT_PUBLIC_APP_URL Still Shows Localhost**
**Solution:**
- Update to production URL in Vercel environment variables
- Redeploy
- This variable MUST match your actual deployment URL

---

## ✅ **Checklist: Is Everything Set?**

Before testing, verify:

- [ ] `DATABASE_URL` added to Vercel (Production + Preview)
- [ ] `WHOP_API_KEY` added to Vercel
- [ ] `WHOP_WEBHOOK_SECRET` added to Vercel
- [ ] `NEXT_PUBLIC_WHOP_APP_ID` added to Vercel
- [ ] `NEXT_PUBLIC_WHOP_COMPANY_ID` added to Vercel
- [ ] `NEXT_PUBLIC_APP_URL` set to production URL (NOT localhost)
- [ ] Security keys generated and added
- [ ] Redeployed after adding variables
- [ ] Health check returns 200 OK

---

## 🎯 **Expected Outcome**

After following these steps:

✅ App loads without 500 error
✅ API endpoints respond correctly
✅ Database queries work
✅ Whop integration functional
✅ Members can use referral codes

---

## 🔗 **Quick Links**

- **Vercel Dashboard:** https://vercel.com/dashboard
- **Supabase Dashboard:** https://supabase.com/dashboard/project/eerhpmjherotaqklpqnc
- **Whop Developer Dashboard:** https://whop.com/dashboard/developer
- **Your App (Local):** http://localhost:3000
- **Your App (Production):** [Your Vercel URL]

---

## 📝 **Need Help?**

If you're still getting errors after following this guide:

1. Check Vercel deployment logs (Build Logs tab)
2. Look for specific error messages
3. Share the error message for more specific help

---

**Generated:** 2025-11-12
**Status:** Ready to deploy to production
