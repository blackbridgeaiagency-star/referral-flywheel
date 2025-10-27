# Testing Guide

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

## End-to-End Referral Flow Test

Follow these steps to manually test the complete referral flow:

### 1. Creator Setup

- [ ] Install app → setup wizard appears
- [ ] Complete all 3 setup steps
- [ ] Verify redirect to creator dashboard
- [ ] Check that members are imported

### 2. Member Dashboard

- [ ] Access member dashboard: `/customer/{membershipId}`
- [ ] Verify referral link is displayed
- [ ] Click "Copy Link" button
- [ ] Verify toast notification appears
- [ ] Check referral code format: `FIRSTNAME-ABC123`

### 3. Referral Link Click

- [ ] Open referral link in incognito: `/r/FIRSTNAME-ABC123`
- [ ] Verify redirect to Whop product page
- [ ] Check attribution click created in database
- [ ] Verify 30-day expiration set

### 4. Referred Purchase

- [ ] Simulate payment webhook (use test data)
- [ ] Verify new member created
- [ ] Check commission record created
- [ ] Verify 10/70/20 split calculated correctly
- [ ] Confirm attribution marked as converted

### 5. Earnings Display

- [ ] Check referrer's dashboard shows updated earnings
- [ ] Verify leaderboard ranking updated
- [ ] Check earnings chart displays data
- [ ] Confirm milestone progress updated

### 6. Milestone Rewards

- [ ] Member reaches 5 referrals
- [ ] Verify reward unlock notification
- [ ] Check "Claim Reward" button appears
- [ ] Test reward claim flow

### 7. Email Notifications

- [ ] First referral → success email sent
- [ ] Milestone reached → milestone email sent
- [ ] Monthly digest → earnings summary sent
- [ ] Creator digest → weekly performance email

## Database Seeding

```bash
# Seed database with test data
npm run db:seed

# Reset and reseed
npm run db:seed:clean
```

This creates:
- 3 test communities
- 180 test members (100 + 50 + 30)
- 977 attribution clicks
- 8,768 commission records

## Test URLs

### Member Dashboards
- http://localhost:3000/customer/mem_techwhop_1
- http://localhost:3000/customer/mem_techwhop_2
- http://localhost:3000/customer/mem_techwhop_3

### Creator Dashboards
- http://localhost:3000/seller-product/prod_techwhop_test
- http://localhost:3000/seller-product/prod_fitnesshub_test
- http://localhost:3000/seller-product/prod_gamezone_test

### Referral Links
- http://localhost:3000/r/JESSICA-NSZP83
- http://localhost:3000/r/DIANE-7VDEG3
- http://localhost:3000/r/MICHELLE-HCDV73

## Common Issues

### Issue: "Attribution not tracking"
**Solution:** Check that cookies are enabled and fingerprint is generated correctly.

### Issue: "Commission not calculated"
**Solution:** Verify webhook payload has `final_amount` field and attribution exists.

### Issue: "Earnings not showing"
**Solution:** Check that commission status is 'paid' and member relationship is correct.

### Issue: "Tests failing"
**Solution:** Ensure database is running and `.env.test` is configured correctly.

## Performance Testing

Monitor these metrics:
- Webhook processing time: < 500ms
- Dashboard load time: < 2s
- Attribution tracking: < 100ms
- Database query time: < 50ms

## Security Testing

- [ ] Webhook signature validation works
- [ ] SQL injection protection (Prisma handles this)
- [ ] XSS prevention in user inputs
- [ ] Rate limiting on API routes
- [ ] CORS configuration correct
