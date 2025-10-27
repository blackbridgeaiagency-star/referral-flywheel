# API Documentation

## Overview

Referral Flywheel provides several API endpoints for custom integrations and data retrieval.

## Base URL
```
Production: https://your-domain.com/api
Development: http://localhost:3000/api
```

## Authentication

Most endpoints require authentication via Whop session or API key.

```http
Authorization: Bearer YOUR_API_KEY
```

## Endpoints

### GET /api/leaderboard

Retrieve leaderboard data for a community or globally.

**Query Parameters:**
- `type` (required): `referrals` or `earnings`
- `scope` (required): `community` or `global`
- `creatorId` (optional): Filter by creator
- `memberId` (optional): Highlight specific member
- `limit` (optional): Number of results (default: 10, max: 100)

**Response:**
```json
{
  "ok": true,
  "leaderboard": [
    {
      "id": "member_id",
      "username": "John",
      "referralCode": "JOHN-ABC123",
      "totalReferred": 25,
      "lifetimeEarnings": 249.75,
      "rank": 1
    }
  ],
  "userRank": 5,
  "totalMembers": 100
}
```

### GET /api/earnings/history

Get earnings history for a member.

**Query Parameters:**
- `memberId` (required): Member ID
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string

**Response:**
```json
{
  "ok": true,
  "earnings": [
    {
      "date": "2024-01-15",
      "amount": 49.99,
      "referredMember": "member_id"
    }
  ],
  "total": 499.90
}
```

### GET /api/discover/communities

Get list of active communities with referral programs.

**Response:**
```json
{
  "ok": true,
  "communities": [
    {
      "id": "creator_id",
      "name": "TechWhop",
      "productId": "prod_123",
      "memberCount": 100,
      "totalReferrals": 250,
      "avgEarnings": 124.50
    }
  ]
}
```

### POST /api/setup/complete

Complete creator setup wizard.

**Body:**
```json
{
  "productId": "prod_123",
  "welcomeMessage": "Welcome to our community!",
  "tier1Count": 5,
  "tier1Reward": "Discord role",
  "tier2Count": 10,
  "tier2Reward": "$50 bonus",
  "tier3Count": 25,
  "tier3Reward": "$150 + coaching",
  "tier4Count": 100,
  "tier4Reward": "$500 + VIP"
}
```

**Response:**
```json
{
  "success": true,
  "creator": {
    "id": "creator_id",
    "productId": "prod_123",
    "companyName": "Community Name"
  }
}
```

## Webhooks

### POST /api/webhooks/whop

Receives Whop payment webhooks.

**Headers:**
```
whop-signature: webhook_signature
```

**Payload:**
```json
{
  "action": "app_payment.succeeded",
  "data": {
    "id": "payment_id",
    "user_id": "user_123",
    "membership_id": "mem_123",
    "company_id": "comp_123",
    "product_id": "prod_123",
    "final_amount": 4999,
    "email": "user@example.com"
  }
}
```

**Signature Validation:**
```typescript
const expectedSignature = crypto
  .createHmac('sha256', process.env.WHOP_WEBHOOK_SECRET)
  .update(rawBody)
  .digest('hex');
```

### POST /api/webhooks/whop/install

Handles app installation.

**Payload:**
```json
{
  "action": "app.installed",
  "data": {
    "company_id": "comp_123",
    "company_name": "Community Name",
    "product_id": "prod_123"
  }
}
```

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": "Additional details (dev only)",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Error Codes:**
- `BAD_REQUEST`: Invalid request parameters
- `UNAUTHORIZED`: Missing or invalid authentication
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Input validation failed
- `INTERNAL_ERROR`: Server error
- `DATABASE_ERROR`: Database operation failed

## Rate Limits

- **Public endpoints**: 100 requests/minute
- **Authenticated endpoints**: 1000 requests/minute
- **Webhooks**: No limit (from Whop IPs only)

## Best Practices

1. **Cache responses**: Leaderboard data can be cached for 1-5 minutes
2. **Handle errors gracefully**: Always check for error responses
3. **Use pagination**: Don't request more data than needed
4. **Webhook security**: Always validate signatures
5. **Retry logic**: Implement exponential backoff for failures

## Testing

### Development Environment
```bash
# Start dev server
npm run dev

# Test webhook locally with ngrok
ngrok http 3000
```

### Test Webhook Payloads
See `__tests__/fixtures/webhooks/` for example payloads.

## Support

- Technical issues: developers@referral-flywheel.com
- API questions: [GitHub Discussions]
- Report bugs: [GitHub Issues]
