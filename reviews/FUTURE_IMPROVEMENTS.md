# Future Security & Scalability Improvements

**Created:** 2025-12-12
**Status:** Tracked for future implementation
**Source:** Production Readiness Audit (002-production-readiness-audit.md)

---

## Priority 0 - Implement Before Scaling

### 1. Redis-Based Rate Limiting
**Current Issue:** In-memory rate limiting won't work across serverless instances
**Impact:** DoS vulnerability, API abuse at scale
**Effort:** 4-8 hours
**Solution:** Implement Upstash Redis for distributed rate limiting
**Files to modify:**
- `lib/security/rate-limit-utils.ts`

### 2. Auth on Stats Endpoints
**Current Issue:** `/api/referrals/stats` and `/api/member/stats` expose data to anyone with valid IDs
**Impact:** Privacy violation, data scraping risk
**Effort:** 1-2 hours
**Solution:** Add `canAccessMemberById()` checks
**Files to modify:**
- `app/api/referrals/stats/route.ts`
- `app/api/member/stats/route.ts`

---

## Priority 1 - Implement Within First Month

### 3. CSRF Protection Consistency
**Current Issue:** `checkOrigin()` not applied to all POST/PUT/DELETE routes
**Impact:** Cross-site request forgery attacks possible
**Effort:** 2-4 hours
**Solution:** Add `checkOrigin(request)` to all state-changing endpoints
**Files to modify:**
- `app/api/share/track/route.ts`
- Audit all POST routes for coverage

### 4. Install Endpoint Verification
**Current Issue:** `/api/install` creates Creator records without verifying request source
**Impact:** Data pollution, potential abuse
**Effort:** 1-2 hours
**Solution:** Add Whop verification or strict rate limiting
**Files to modify:**
- `app/api/install/route.ts`

---

## Priority 2 - Code Quality

### 5. Configure ESLint
**Effort:** 2-4 hours
**Files:** Create `.eslintrc.json`

### 6. Replace `any` Types
**Current:** 130+ `any` types in codebase
**Effort:** 4-8 hours (prioritize webhook handler first)
**Files:** Start with `app/api/webhooks/whop/route.ts`

### 7. Configure Jest & Run Unit Tests
**Effort:** 2-4 hours
**Files:** Create `jest.config.js`, verify existing tests run

### 8. Split Webhook Handler
**Current:** 1,240 lines in single file
**Effort:** 4-8 hours
**Files:** `app/api/webhooks/whop/route.ts` → `lib/webhooks/handlers/`

---

## When to Implement

| Trigger | Items to Implement |
|---------|-------------------|
| Before marketing push | #1 Rate Limiting, #2 Stats Auth |
| First 1000 users | #3 CSRF, #4 Install Verification |
| Before hiring developers | #5-8 Code Quality |

---

## Notes

- Current system is **functional and secure for low-moderate traffic**
- The 37 critical/high security issues from the 2025-12-11 audit are FIXED
- These items are **improvements for scale**, not blockers for launch
- Revisit this document monthly or before major traffic events

---

*Tracked by Claude Code - 2025-12-12*
