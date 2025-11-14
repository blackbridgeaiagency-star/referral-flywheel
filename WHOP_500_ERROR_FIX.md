# Fix "Something Went Wrong" Error in Whop

## 🔴 **The Problem**

When you download your app in Whop and try to access it, you see:

```
Something Went Wrong
We encountered an unexpected error. Don't worry, your data is safe.
```

**Root Cause:** Environment variables (especially `DATABASE_URL`) are missing in Vercel, so the app can't connect to the database.

---

## ✅ **The Solution (5 Minutes)**

### **Step 1: Get Your Vercel Production URL**

1. Go to https://vercel.com/blackbridges-projects/referral-flywheel
2. Click **"Deployments"** tab
3. Find your **Production** deployment (has a crown icon)
4. Copy the URL (e.g., `https://referral-flywheel.vercel.app`)

---

### **Step 2: Add Environment Variables to Vercel**

Go to: https://vercel.com/blackbridges-projects/referral-flywheel/settings/environment-variables

**Add these ONE BY ONE:**

#### **1. Database Connection (CRITICAL)**
```
Name: DATABASE_URL
Value: postgresql://postgres:f2ztx6UyPIqO94fO@db.eerhpmjherotaqklpqnc.supabase.co:6543/postgres?pgbouncer=true&connection_limit=1
Environment: Production ✓ Preview ✓ Development ✓
```

#### **2. Whop API Key**
```
Name: WHOP_API_KEY
Value: fm64WiJRXFbXJxjM1QQRtnPW54vVwj7yBrVidd-bwYk
Environment: Production ✓ Preview ✓ Development ✓
```

#### **3. Whop Webhook Secret**
```
Name: WHOP_WEBHOOK_SECRET
Value: ws_432f83a76289c20c3de730d2648831d6f83893a8bb59748ef0924fe8436cecc2
Environment: Production ✓ Preview ✓ Development ✓
```

#### **4. Whop App ID**
```
Name: NEXT_PUBLIC_WHOP_APP_ID
Value: app_xa1a8NaAKUVPuO
Environment: Production ✓ Preview ✓ Development ✓
```

#### **5. Whop Company ID**
```
Name: NEXT_PUBLIC_WHOP_COMPANY_ID
Value: biz_kkGoY7OvzWXRdK
Environment: Production ✓ Preview ✓ Development ✓
```

#### **6. Whop Agent User ID**
```
Name: NEXT_PUBLIC_WHOP_AGENT_USER_ID
Value: user_QzqUqxWUTwyHz
Environment: Production ✓ Preview ✓ Development ✓
```

#### **7. Production URL (IMPORTANT!)**
```
Name: NEXT_PUBLIC_APP_URL
Value: https://referral-flywheel.vercel.app (⚠️ REPLACE with YOUR actual Vercel URL from Step 1!)
Environment: Production ✓
```

---

### **Step 3: Generate Security Keys**

Run this in your terminal (Windows):
```bash
node scripts/generate-env-keys.bat
```

Or manually generate:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Run this **4 times** to get 4 different keys.

Then add to Vercel:

#### **8. Admin API Key**
```
Name: ADMIN_API_KEY
Value: [paste first generated key]
Environment: Production ✓ Preview ✓ Development ✓
```

#### **9. Cron Secret**
```
Name: CRON_SECRET
Value: [paste second generated key]
Environment: Production ✓ Preview ✓ Development ✓
```

#### **10. Export API Key**
```
Name: EXPORT_API_KEY
Value: [paste third generated key]
Environment: Production ✓ Preview ✓ Development ✓
```

#### **11. Session Secret**
```
Name: SESSION_SECRET
Value: [paste fourth generated key]
Environment: Production ✓ Preview ✓ Development ✓
```

---

### **Step 4: Redeploy**

**Option A: Via Vercel Dashboard**
1. Go to **Deployments** tab
2. Find the latest deployment
3. Click three dots (•••) → **"Redeploy"**
4. Wait 2-3 minutes

**Option B: Push empty commit**
```bash
git commit --allow-empty -m "Add environment variables"
git push
```

---

### **Step 5: Update Whop Configuration**

After your app is deployed:

1. Go to **Whop Developer Dashboard**: https://whop.com/dashboard/developer
2. Find your app: **Referral Flywheel**
3. Click **"Settings"** or **"Configuration"**
4. Update these URLs:

```
App URL: https://referral-flywheel.vercel.app
Webhook URL: https://referral-flywheel.vercel.app/api/webhooks/whop
Install Webhook URL: https://referral-flywheel.vercel.app/api/webhooks/whop/install
```

⚠️ **Replace with YOUR actual Vercel URL!**

5. Click **"Save"**

---

## 🧪 **Test It Works**

### **Test 1: Health Check**
Open in browser:
```
https://referral-flywheel.vercel.app/api/health
```

**Expected:** `{"status":"ok","timestamp":"..."}`

### **Test 2: Database Connection**
Open in browser:
```
https://referral-flywheel.vercel.app/api/debug/db-test
```

**Expected:** Success message with database connection info

### **Test 3: Download App in Whop**

1. Go to Whop Dashboard
2. Click your app in the sidebar
3. You should see the dashboard (NOT "Something Went Wrong")

---

## 🚨 **Still Getting Error?**

### **Check Vercel Logs**

1. Go to Vercel → Deployments → Latest
2. Click **"Runtime Logs"** tab
3. Look for errors like:
   - `Environment variable not found: DATABASE_URL`
   - `PrismaClientInitializationError`
   - `Connection refused`

### **Common Issues:**

#### **Error: "Environment variable not found: DATABASE_URL"**
**Fix:** You didn't add DATABASE_URL to Vercel, or didn't redeploy after adding it.

#### **Error: "PrismaClientInitializationError"**
**Fix:** DATABASE_URL is invalid. Check:
- Port is **6543** (not 5432)
- Has `?pgbouncer=true&connection_limit=1`
- No typos in password

#### **Still seeing "Something Went Wrong"**
**Fix:**
1. Clear Vercel cache: Go to Settings → Clear Cache
2. Redeploy
3. Hard refresh browser (Ctrl+Shift+R)

#### **Whop shows blank page**
**Fix:** Update NEXT_PUBLIC_APP_URL to your actual Vercel URL (not localhost!)

---

## ✅ **Checklist**

Before testing in Whop:

- [ ] DATABASE_URL added to Vercel (with port 6543)
- [ ] All 6 WHOP_* variables added to Vercel
- [ ] NEXT_PUBLIC_APP_URL set to production URL (NOT localhost)
- [ ] All 4 security keys generated and added
- [ ] Clicked "Redeploy" in Vercel
- [ ] Waited for deployment to complete (2-3 min)
- [ ] Updated Whop webhook URLs
- [ ] Tested /api/health endpoint
- [ ] Tested /api/debug/db-test endpoint

---

## 🎯 **Expected Result**

After completing all steps:

✅ App loads in Whop without errors
✅ Member dashboard shows referral code
✅ Creator dashboard shows stats
✅ Leaderboards work
✅ No "Something Went Wrong" message

---

## 📞 **Need More Help?**

If you've followed all steps and still see errors:

1. Check Vercel Runtime Logs
2. Look for specific error messages
3. Check Supabase is online: https://supabase.com/dashboard
4. Verify Whop API keys are active

---

**Generated:** 2025-11-12
**App:** Referral Flywheel
**Issue:** "Something Went Wrong" error when accessing via Whop
