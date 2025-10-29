# Troubleshooting Guide
**Common Issues and Solutions**

---

## 🔧 Common Issues

### Issue: Referral Link Not Working

**Symptoms:**
- 404 error when clicking link
- Link redirects to wrong page
- "Invalid referral code" message

**Solutions:**
1. Verify link format: `domain.com/r/CODE`
2. Check if member exists in dashboard
3. Try in incognito mode (clear cookies)
4. Regenerate referral code in dashboard

---

### Issue: No Commission Showing

**Symptoms:**
- Referred someone but no earnings
- Dashboard shows 0 earnings
- Missing transactions

**Solutions:**
1. Wait 24-48 hours for payment to clear
2. Verify referred person completed payment
3. Check if they used your link (within 30 days)
4. Contact creator to verify member exists

**How Attribution Works:**
- 30-day cookie window
- Must complete payment within 30 days of click
- Commission appears after first payment clears

---

### Issue: Welcome Message Not Received

**Symptoms:**
- New member didn't get welcome DM
- Missing referral link
- No onboarding message

**Solutions:**
1. Check Whop DM inbox
2. Check email spam folder
3. Verify email settings in Whop
4. Manually share link via creator

**Note:** Welcome messages sent via Whop DM or email fallback

---

### Issue: Dashboard Not Loading

**Symptoms:**
- Blank screen
- Loading spinner forever
- Database error messages

**Solutions:**
1. Refresh page (Ctrl+R / Cmd+R)
2. Clear browser cache
3. Try different browser
4. Check internet connection
5. Wait 5 minutes (server might be restarting)

---

### Issue: Can't Access Creator Dashboard

**Symptoms:**
- 404 error
- Permission denied
- Wrong experience ID

**Solutions:**
1. Verify you're the community owner
2. Check URL format: `/seller-product/[experienceId]`
3. Try accessing via Whop Dashboard View integration
4. Clear cookies and re-authenticate

**Correct URLs:**
- Creator: `/seller-product/biz_xxx` or `/seller-product/prod_xxx`
- Member: `/customer/mem_xxx`

---

### Issue: Rewards Not Unlocking

**Symptoms:**
- Hit milestone but no reward
- Dashboard says "pending"
- Reward tier not showing

**Solutions:**
1. Verify you hit the exact referral count
2. Check if creator has "auto-approve" enabled
3. Wait 24 hours for processing
4. Contact creator to manually approve

**How Rewards Work:**
- Automatic if creator enabled auto-approve
- Manual approval otherwise
- Shown in dashboard under "Rewards Progress"

---

### Issue: Email/Notifications Not Working

**Symptoms:**
- No welcome emails
- Missing payment notifications
- No commission alerts

**Solutions:**
1. Check spam/junk folder
2. Add noreply@referralflywheel.app to contacts
3. Verify email in Whop settings
4. Check notification preferences

**Note:** Some emails may be delayed up to 15 minutes

---

### Issue: Build Errors (Developers)

**Symptoms:**
- `npm run build` fails
- TypeScript errors
- Missing dependencies

**Solutions:**
```bash
# Delete node_modules and reinstall
rm -rf node_modules
npm install

# Reset Next.js cache
rm -rf .next
npm run build

# Check environment variables
cat .env.local

# Verify database connection
npm run db:test
```

---

## 🔍 Debugging Steps

### For Members:
1. Check dashboard for accurate referral count
2. Verify link format is correct
3. Test link in incognito mode
4. Contact community creator for help

### For Creators:
1. Check webhook configuration in Whop
2. Verify environment variables are set
3. Test webhook with Whop dashboard
4. Check database connection
5. Review server logs for errors

---

## 📞 Getting Support

### Self-Service
1. Check this troubleshooting guide
2. Read relevant documentation
3. Test in incognito mode
4. Clear cache and cookies

### Contact Support
- **Email**: support@referralflywheel.app
- **Discord**: [Join our community](#)
- **GitHub Issues**: [Report bugs](#)

### What to Include:
- Detailed description of issue
- Steps to reproduce
- Screenshots/error messages
- Browser and OS version
- Experience ID (if applicable)

---

## 🐛 Known Issues

### Issue: Logo Not Loading
**Status**: Fixed in v1.1.0
**Workaround**: Logo now has SVG fallback

### Issue: Webhook Delays
**Status**: Investigating
**Impact**: Commissions may take 24-48 hours to appear
**Workaround**: Be patient, they will appear

### Issue: Mobile Layout on Small Screens
**Status**: In Progress
**Impact**: Some elements may overflow on phones < 375px
**Workaround**: Use landscape mode

---

## 🔐 Security Issues

### Issue: Suspicious Activity
**Report immediately** if you notice:
- Unauthorized access to dashboard
- Strange referrals you didn't make
- Unexpected commission changes
- Suspicious payment activity

**Contact**: security@referralflywheel.app

---

## ✅ Quick Checks

### Before Reporting an Issue:
- [ ] Tried in incognito mode
- [ ] Cleared browser cache
- [ ] Checked spam folder for emails
- [ ] Waited 24-48 hours for commissions
- [ ] Verified environment variables (developers)
- [ ] Checked internet connection
- [ ] Tried different browser
- [ ] Read relevant documentation

---

*Last Updated: 2025-10-29*
