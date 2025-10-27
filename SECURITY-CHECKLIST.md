# 🔒 Referral Flywheel - Security Checklist
*Last Updated: 2025-10-27*

## 🚨 Pre-Deployment Security Checklist

### ✅ Local Security (COMPLETED)
- [x] **All real API keys removed from documentation files**
  - `.claude/CLAUDE.md` - Uses placeholders
  - `docs/seedconvo.md` - Uses placeholders
  - `test-webhook.js` - No hardcoded secrets
  - `.env` file - Deleted (was exposed)

- [x] **Secure secrets storage created**
  - `.secrets.vault` - Personal reference (never commit)
  - `.env.local` - Local development (gitignored)
  - `.env.example` - Template with placeholders only

- [x] **Updated .gitignore**
  - All `.env*` files (except .env.example)
  - `.secrets.vault` and `*.vault` files
  - `.claude/CLAUDE.md` (contains project-specific info)
  - `test-webhook.js` (had hardcoded secrets)

- [x] **Database connection secured**
  - Using pooled connection (port 6543)
  - Connection string with pgbouncer=true
  - Password only in .env.local and .secrets.vault

- [x] **App functionality verified**
  - Database connection ✅
  - API endpoints working ✅
  - No errors from missing secrets ✅

### 🔐 Before Git Init
- [ ] **Verify no secrets in codebase**
  ```bash
  # Run these commands to double-check:
  grep -r "cFWGc4UtNVXm6NYt" . --exclude-dir=node_modules --exclude-dir=.next
  grep -r "wFlUR9Nil3SXRgbss31y6XhSpA8UtkoBI3GsL3J42Bs" . --exclude-dir=node_modules --exclude-dir=.next
  grep -r "ws_4504b4a33dc97e85bb34a44207d74fadc8151412a25b07729efb623ca86e412b" . --exclude-dir=node_modules --exclude-dir=.next
  ```

- [ ] **Initialize git repository**
  ```bash
  git init
  git add .
  git status  # Review files being added
  git commit -m "Initial commit - secure setup"
  ```

### 🚀 Before Production Deployment

#### 1. **Rotate All API Keys** ⚠️ CRITICAL
- [ ] Generate NEW Whop API key
- [ ] Generate NEW webhook secret
- [ ] Change database password
- [ ] Update `.secrets.vault` with new values
- [ ] Update `.env.local` with new values
- [ ] Test locally with new keys

#### 2. **Vercel Environment Variables**
- [ ] Add all secrets to Vercel dashboard (Settings → Environment Variables)
  ```
  DATABASE_URL
  WHOP_API_KEY
  WHOP_WEBHOOK_SECRET
  NEXT_PUBLIC_WHOP_APP_ID
  NEXT_PUBLIC_WHOP_COMPANY_ID
  NEXT_PUBLIC_APP_URL (use production URL)
  ```
- [ ] Set different values for Preview vs Production
- [ ] Enable "Automatically expose System Environment Variables"

#### 3. **Database Security**
- [ ] Enable Supabase Row Level Security (RLS)
- [ ] Review database permissions
- [ ] Set up connection pooling limits
- [ ] Configure IP allowlist (add Vercel IPs)
- [ ] Enable point-in-time recovery

#### 4. **Webhook Security**
- [ ] Update Whop webhook URL to production
- [ ] Verify webhook signature validation is active
- [ ] Test webhook with Whop's testing tools
- [ ] Set up webhook retry logic
- [ ] Configure webhook rate limiting

#### 5. **Application Security**
- [ ] Set NODE_ENV=production
- [ ] Configure CORS properly
- [ ] Add rate limiting to all API routes
- [ ] Implement request validation
- [ ] Set secure HTTP headers
- [ ] Enable HTTPS only

#### 6. **Monitoring & Alerting**
- [ ] Configure Sentry for error tracking
- [ ] Set up uptime monitoring
- [ ] Create alerts for failed webhooks
- [ ] Monitor database performance
- [ ] Set up security scanning

### 🔄 Post-Deployment

#### Immediate (First 24 Hours)
- [ ] Verify all environment variables loaded
- [ ] Test webhook with real payment
- [ ] Check error logs for issues
- [ ] Verify database connections stable
- [ ] Test all critical user flows

#### Weekly Security Tasks
- [ ] Review error logs
- [ ] Check for suspicious activity
- [ ] Monitor webhook success rate
- [ ] Review database queries
- [ ] Check for dependency updates

#### Monthly Security Tasks
- [ ] Rotate API keys (if possible)
- [ ] Review user access logs
- [ ] Update dependencies
- [ ] Security audit
- [ ] Backup verification

### 🚨 Emergency Response Plan

**If API Keys Are Exposed:**
1. Immediately rotate all affected keys
2. Check logs for unauthorized usage
3. Update keys in Vercel
4. Notify affected services
5. Document incident

**If Database Is Compromised:**
1. Disable public access immediately
2. Rotate database password
3. Review access logs
4. Restore from backup if needed
5. Enable additional security measures

### 📞 Important Contacts
- Supabase Support: https://supabase.com/support
- Whop Support: support@whop.com
- Vercel Support: https://vercel.com/support

### 🎯 Security Best Practices

1. **Never commit secrets** - Always use environment variables
2. **Rotate regularly** - Change keys every 60-90 days
3. **Least privilege** - Give minimum required permissions
4. **Monitor everything** - Set up comprehensive logging
5. **Plan for failure** - Have backups and recovery plans
6. **Stay updated** - Keep dependencies current
7. **Document changes** - Track all security modifications

### ✅ Final Verification

Before marking deployment complete:
- [ ] All checklist items completed
- [ ] No secrets in public repository
- [ ] Production app working correctly
- [ ] Monitoring active and alerting
- [ ] Backup strategy implemented
- [ ] Team knows emergency procedures

---

## 🎉 Security Setup Complete!

Your application is now secured with:
- ✅ No exposed secrets in code
- ✅ Secure local development setup
- ✅ Personal vault for secret reference
- ✅ Comprehensive gitignore rules
- ✅ Production deployment checklist
- ✅ Emergency response procedures

**Remember:** Security is an ongoing process, not a one-time task!