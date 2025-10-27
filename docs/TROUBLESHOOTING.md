# Troubleshooting Guide

## Common Issues

### Referral Link Not Working

**Symptoms:**
- Link shows 404 error
- Link redirects to wrong page
- Attribution not being tracked

**Solutions:**

1. **Check link format**
   ```
   Correct: https://yourdomain.com/r/FIRSTNAME-ABC123
   Wrong: https://yourdomain.com/referral/...
   ```

2. **Verify member exists**
   ```sql
   -- Check in database
   SELECT * FROM Member WHERE referralCode = 'FIRSTNAME-ABC123';
   ```

3. **Check attribution tracking**
   - Open browser console (F12)
   - Visit referral link
   - Look for attribution errors
   - Check cookies are enabled

4. **Test in incognito mode**
   - Some browser extensions block tracking
   - Ad blockers can interfere

### Earnings Not Showing

**Symptoms:**
- Member made referral but earnings show $0
- Dashboard shows wrong numbers
- Commission not calculated

**Solutions:**

1. **Verify webhook received**
   ```bash
   # Check server logs
   grep "Webhook received" logs/*.log
   ```

2. **Check commission record**
   ```sql
   SELECT * FROM Commission
   WHERE memberId = 'member_id'
   ORDER BY createdAt DESC;
   ```

3. **Verify attribution**
   ```sql
   SELECT * FROM AttributionClick
   WHERE memberId = 'member_id'
   AND converted = true;
   ```

4. **Check calculation**
   - Sale amount should be in database
   - 10/70/20 split should be correct
   - Status should be 'paid'

### How to Contact Support

**Email Template:**
```
Subject: [Issue Type] - Brief Description

Environment: Production / Development
URL: https://...
Member ID: mem_...
Referral Code: FIRSTNAME-ABC123

Steps to reproduce:
1. ...
2. ...
3. ...

Expected behavior:
...

Actual behavior:
...

Screenshots/Logs:
[Attach if available]
```

### Dashboard Not Loading

**Symptoms:**
- Blank screen
- Infinite loading spinner
- 500 error

**Solutions:**

1. **Check browser console**
   - Open DevTools (F12)
   - Look for error messages
   - Check network tab for failed requests

2. **Clear cache**
   ```bash
   # Browser
   Ctrl+Shift+Delete → Clear cache

   # Server (if self-hosting)
   npm run build
   ```

3. **Verify database connection**
   ```bash
   # Test connection
   npx prisma db push --preview-feature
   ```

4. **Check environment variables**
   ```bash
   # Required variables
   DATABASE_URL=...
   WHOP_API_KEY=...
   NEXT_PUBLIC_APP_URL=...
   ```

### Webhook Not Processing

**Symptoms:**
- No commissions created
- Members not importing
- Referrals not tracking

**Solutions:**

1. **Verify webhook URL**
   ```
   Correct: https://yourdomain.com/api/webhooks/whop
   Must be: HTTPS (not HTTP)
   Must be: Publicly accessible
   ```

2. **Check webhook signature**
   ```typescript
   // Log signature validation
   console.log('Signature valid:', signature === expectedSignature);
   ```

3. **Test webhook locally**
   ```bash
   # Use ngrok
   ngrok http 3000

   # Update Whop webhook URL to ngrok URL
   https://abc123.ngrok.io/api/webhooks/whop
   ```

4. **Check webhook logs**
   - Go to Whop Dashboard
   - Navigate to Webhooks section
   - Review delivery logs
   - Check response codes

### Database Errors

**Symptoms:**
- "Connection pool timeout"
- "Prisma client not found"
- "Unique constraint failed"

**Solutions:**

1. **Connection pool timeout**
   ```env
   # Increase connection limit in DATABASE_URL
   DATABASE_URL="postgresql://...?connection_limit=20"
   ```

2. **Prisma client issues**
   ```bash
   # Regenerate client
   npx prisma generate

   # Reset if needed
   npx prisma migrate reset
   ```

3. **Unique constraint errors**
   - Usually means duplicate data
   - Check referral codes are unique
   - Verify email uniqueness

## Error Codes Reference

### API Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| `INVALID_CODE` | Referral code not found | Check code format, verify member exists |
| `UNAUTHORIZED` | Missing authentication | Provide API key or Whop session |
| `VALIDATION_ERROR` | Invalid input data | Check request parameters |
| `DATABASE_ERROR` | DB operation failed | Check connection, verify schema |
| `WEBHOOK_SIGNATURE_INVALID` | Webhook security fail | Verify webhook secret matches |

### HTTP Status Codes

- `200`: Success
- `400`: Bad request (check parameters)
- `401`: Unauthorized (check auth)
- `404`: Not found (check URL)
- `500`: Server error (check logs)

## Performance Issues

### Slow Dashboard Loading

**Solutions:**

1. **Enable caching**
   ```typescript
   // Add revalidation to API routes
   export const revalidate = 60; // Cache for 60 seconds
   ```

2. **Optimize database queries**
   ```sql
   -- Add indexes
   CREATE INDEX idx_member_creator ON Member(creatorId);
   CREATE INDEX idx_commission_member ON Commission(memberId);
   ```

3. **Reduce data fetching**
   - Use pagination
   - Limit leaderboard results
   - Cache frequently accessed data

### High Server Load

**Solutions:**

1. **Implement rate limiting**
   ```typescript
   // Add to API routes
   import rateLimit from 'express-rate-limit';
   ```

2. **Optimize webhook processing**
   - Process webhooks async
   - Use queue system (Bull, BullMQ)
   - Batch database operations

3. **Scale database**
   - Upgrade to larger instance
   - Add read replicas
   - Implement connection pooling

## Getting Help

### Before Contacting Support

- [ ] Check this troubleshooting guide
- [ ] Search existing GitHub issues
- [ ] Review documentation
- [ ] Test in development environment
- [ ] Gather error logs and screenshots

### Support Channels

1. **GitHub Issues**: Bug reports and feature requests
2. **Email**: support@referral-flywheel.com
3. **Discord**: [Community link]
4. **Documentation**: [Docs link]

### Emergency Contact

For critical production issues:
- Email: emergency@referral-flywheel.com
- Include: "URGENT" in subject line
- Response time: < 2 hours

## Useful Commands

```bash
# Check application status
npm run dev # Start development
npm run build # Build production
npm run start # Start production

# Database operations
npx prisma studio # Visual database editor
npx prisma db push # Apply schema changes
npx prisma migrate dev # Create migration

# Debugging
npm run test # Run tests
npm run lint # Check for errors
npm run type-check # TypeScript validation

# Logs
tail -f logs/app.log # Watch application logs
tail -f logs/webhook.log # Watch webhook logs
```
