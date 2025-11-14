# Fix DATABASE_URL Issue - URGENT

## 🔴 **Problem Found**

Your Vercel deployment is using the **WRONG DATABASE_URL**!

**Current (WRONG):**
```
Host: aws-1-us-east-1.pooler.supabase.com
```

**Should Be (CORRECT):**
```
Host: db.eerhpmjherotaqklpqnc.supabase.co
```

This is why you're getting 500 errors - it's trying to connect to a different database!

---

## ✅ **FIX IT NOW (2 Minutes)**

### **Step 1: Go to Vercel Environment Variables**

Click this link:
👉 https://vercel.com/blackbridges-projects/referral-flywheel/settings/environment-variables

### **Step 2: Find DATABASE_URL**

Scroll to find the `DATABASE_URL` variable.

### **Step 3: Click "Edit" (pencil icon)**

### **Step 4: Replace with This EXACT Value:**

```
postgresql://postgres:f2ztx6UyPIqO94fO@db.eerhpmjherotaqklpqnc.supabase.co:6543/postgres?pgbouncer=true&connection_limit=1
```

**⚠️ IMPORTANT:** Copy this EXACTLY - no extra spaces or line breaks!

### **Step 5: Make Sure It's Set for All Environments**

Check these boxes:
- ✓ Production
- ✓ Preview
- ✓ Development

### **Step 6: Click "Save"**

---

## **Also Fix: NEXT_PUBLIC_APP_URL**

While you're there, also fix the APP_URL (it has an extra newline):

**Find:** `NEXT_PUBLIC_APP_URL`

**Click Edit**

**Replace with:**
```
https://referral-flywheel.vercel.app
```

(No newline at the end!)

**Save**

---

## **Step 7: Redeploy**

After saving both variables:

1. Go to: https://vercel.com/blackbridges-projects/referral-flywheel/deployments
2. Click the latest deployment
3. Click three dots (•••) → **"Redeploy"**
4. Wait 2-3 minutes

---

## **Step 8: Test**

After redeployment:

```
https://referral-flywheel.vercel.app/api/health
```

**Should show:** `"database": {"healthy": true}`

Then test your dashboard:
```
https://referral-flywheel.vercel.app/seller-product/biz_kkGoY7OvzWXRdK
```

**Should load without errors!**

---

## **Why This Happened**

You likely copied the DATABASE_URL from an old deployment or different Supabase project. The correct one is in your local `.env.local` file.

---

## **Quick Summary**

1. Go to Vercel → Settings → Environment Variables
2. Edit `DATABASE_URL` → Paste the correct connection string above
3. Edit `NEXT_PUBLIC_APP_URL` → Remove newline
4. Save
5. Redeploy
6. Test `/api/health` endpoint

---

**This will fix the 500 errors immediately!**
