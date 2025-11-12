# Enhanced Whop Authentication Setup Guide

## Overview

This guide explains how to configure the enhanced authentication system with JWT signature verification, real-time API verification, and session caching.

## Environment Variables

Add these to your `.env.local` or Vercel environment variables:

```env
# JWT Verification
WHOP_PUBLIC_KEY=          # RSA public key from Whop (PEM format)
WHOP_JWKS_URI=            # Optional: JWKS endpoint for dynamic key fetching

# Session Management
SESSION_SECRET=           # Strong random string for session encryption (min 32 chars)

# Whop API
WHOP_API_KEY=            # Your Whop API key (already configured)

# Optional: Control behavior
ENABLE_API_VERIFICATION=true    # Enable real-time API checks
ENABLE_SESSION_CACHE=true       # Enable session caching
SESSION_MAX_AGE=86400           # Session duration in seconds (24 hours)
```

## Getting Whop's Public Key

### Option 1: Static Public Key

1. Contact Whop support to get their JWT signing public key
2. It should be in PEM format:
```
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
-----END PUBLIC KEY-----
```
3. Add it to `WHOP_PUBLIC_KEY` environment variable

### Option 2: JWKS Endpoint (Recommended)

1. Check if Whop provides a JWKS endpoint (usually at `/.well-known/jwks.json`)
2. Set `WHOP_JWKS_URI=https://api.whop.com/.well-known/jwks.json`
3. The system will automatically fetch and cache public keys

## Session Configuration

### Generate Session Secret

```bash
# Generate a secure random secret
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Session Storage

Sessions are stored as encrypted JWTs in HTTP-only cookies:
- Cookie name: `whop-session`
- Max age: 24 hours (configurable)
- Auto-refresh when < 1 hour remaining

## API Verification Setup

### Enable Real-time Verification

The system automatically uses real-time API verification when available:

1. **Authorization Check**: Verifies if user is company owner/admin
2. **Membership Check**: Verifies active membership status
3. **Fallback**: Uses database if API is unavailable

### Cache Configuration

API responses are cached to reduce calls:
- Membership status: 5 minutes
- Authorization status: 15 minutes
- Company info: 30 minutes

## Testing the Setup

### 1. Verify JWT Signature

```typescript
// Test script: scripts/test-jwt-verification.ts
import { verifyWhopJWT } from '@/lib/whop/jwt-verification';

const testToken = 'your-test-jwt-here';
const result = await verifyWhopJWT(testToken);

if (result) {
  console.log('✅ JWT verified:', result);
} else {
  console.log('❌ JWT verification failed');
}
```

### 2. Test API Verification

```typescript
// Test script: scripts/test-api-verification.ts
import { verifyAuthorizedUser, verifyActiveMembership } from '@/lib/whop/api-verification';

const userId = 'user_xxx';
const companyId = 'biz_xxx';

const isAuthorized = await verifyAuthorizedUser(userId, companyId);
console.log('Is authorized:', isAuthorized);

const hasMembership = await verifyActiveMembership(userId, companyId);
console.log('Has membership:', hasMembership);
```

### 3. Check Session Caching

```typescript
// In your page component
import { getServerAuthContext } from '@/lib/whop/auth-server';

export default async function TestPage() {
  // First call creates session
  const context1 = await getServerAuthContext();
  console.log('First call:', context1);

  // Second call uses cached session
  const context2 = await getServerAuthContext();
  console.log('Second call (cached):', context2);
}
```

## Development vs Production

### Development Mode

- JWT signature verification is optional
- Falls back to decoding without validation
- Shows warning messages in console
- Session cookies are not secure (HTTP)

### Production Mode

- JWT signature verification is required
- No fallback to insecure decoding
- Session cookies are secure (HTTPS only)
- Real-time API verification enabled

## Monitoring & Debugging

### Enable Debug Logging

```env
# Add to .env.local
DEBUG=whop:*           # Enable all Whop auth debug logs
DEBUG=whop:jwt         # JWT verification only
DEBUG=whop:api         # API verification only
DEBUG=whop:session     # Session management only
```

### Check Authentication Status

Visit these endpoints to debug:

- `/api/auth/status` - Current authentication status
- `/api/auth/session` - Session details
- `/api/auth/permissions` - User permissions

### Common Issues

#### "JWT verification failed"
- Check `WHOP_PUBLIC_KEY` is correctly set
- Verify token hasn't expired
- Ensure token is from Whop

#### "API verification timeout"
- Check `WHOP_API_KEY` is valid
- Verify network connectivity
- API might be rate-limited

#### "Session not persisting"
- Check `SESSION_SECRET` is set
- Verify cookies are enabled
- Check same-site cookie settings

## Security Best Practices

### 1. Environment Variables

```bash
# Never commit secrets
echo "SESSION_SECRET" >> .gitignore
echo "WHOP_PUBLIC_KEY" >> .gitignore
```

### 2. Key Rotation

Rotate session secret periodically:
1. Add new secret as `SESSION_SECRET_NEW`
2. Update code to try both secrets
3. After all sessions expire, remove old secret

### 3. Rate Limiting

Implement rate limiting for API calls:

```typescript
// In api-verification.ts
const rateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100 // 100 requests per minute
});
```

### 4. Monitoring

Set up alerts for:
- Failed JWT verifications
- API verification failures
- Session creation spikes
- Unusual permission patterns

## Performance Optimization

### 1. Preload Sessions

```typescript
// In layout.tsx
import { getServerAuthContext } from '@/lib/whop/auth-server';

export default async function RootLayout({ children }) {
  // Preload auth context
  const authContext = await getServerAuthContext();

  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
```

### 2. Parallel Verification

```typescript
// Verify multiple permissions in parallel
const [isCreator, isMember] = await Promise.all([
  isAuthorizedUser(userId, companyId),
  hasActiveMembership(userId, companyId)
]);
```

### 3. Cache Warming

```typescript
// Warm cache on app start
import { syncUserData } from '@/lib/whop/api-verification';

export async function warmCache(userId: string, companyId: string) {
  await syncUserData(userId, companyId);
}
```

## Migration from Basic Auth

### Before (URL parameters)

```typescript
const isOwner = searchParams.get('is_owner') === 'true';
```

### After (Secure JWT)

```typescript
const context = await getServerAuthContext();
const isOwner = await isAuthorizedUser(
  context.claims.user_id,
  companyId
);
```

## Troubleshooting Checklist

- [ ] Environment variables set correctly
- [ ] JWT public key in correct format
- [ ] Session secret is strong (32+ chars)
- [ ] Whop API key is valid
- [ ] Cookies enabled in browser
- [ ] HTTPS in production
- [ ] No CORS issues
- [ ] Rate limits not exceeded

## Support

For issues with:
- **JWT Verification**: Check Whop's documentation
- **API Access**: Contact Whop support
- **Session Management**: Check Next.js cookie docs
- **Implementation**: Open an issue on GitHub