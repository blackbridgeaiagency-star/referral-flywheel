# Referral Flywheel - App URLs
*Last Updated: 2025-10-23*

## Development URLs (localhost:3000)

### Member Dashboard (Customer View)
**URL:** http://localhost:3000/customer/mem_BA9kqIsPzRTk4B

**Details:**
- Member: user
- User ID: test_1761177871726
- Membership ID: mem_BA9kqIsPzRTk4B
- Referral Code: USER-LHCYHC

---

### Creator Dashboard (Seller View)
**URL:** http://localhost:3000/seller-product/prod_shEZkHDJ8cj3p

**Details:**
- Community: Community
- Company ID: biz_gyYVNC7uvaKxNP
- Product ID: prod_shEZkHDJ8cj3p
- Members: 1
- Commissions: 0

---

### Referral Link (Public)
**URL:** http://localhost:3000/r/USER-LHCYHC

**Details:**
- Referral Code: USER-LHCYHC
- Owner: user
- This is the public link that members share to refer others

---

### Discover Page (Public)
**URL:** http://localhost:3000/discover

**Details:**
- Public page showing all active communities
- No authentication required

---

## URL Patterns

### Member Dashboard
```
http://localhost:3000/customer/[membershipId]
```
- Parameter: `membershipId` (e.g., mem_BA9kqIsPzRTk4B)
- Lookup: `Member.membershipId` field in database

### Creator Dashboard
```
http://localhost:3000/seller-product/[productId]
```
- Parameter: `productId` (e.g., prod_shEZkHDJ8cj3p)
- Lookup: `Creator.productId` field in database

### Referral Redirect
```
http://localhost:3000/r/[referralCode]
```
- Parameter: `referralCode` (e.g., USER-LHCYHC)
- Format: FIRSTNAME-ABC123
- Lookup: `Member.referralCode` field in database

---

## Quick Database Query

To regenerate these URLs at any time, run:
```bash
node check-data.js
```

This will output all current URLs with actual IDs from the database.

---

## Production URLs

Once deployed to Vercel, replace `http://localhost:3000` with your production domain:

```
https://your-domain.vercel.app/customer/mem_BA9kqIsPzRTk4B
https://your-domain.vercel.app/seller-product/prod_shEZkHDJ8cj3p
https://your-domain.vercel.app/r/USER-LHCYHC
https://your-domain.vercel.app/discover
```
