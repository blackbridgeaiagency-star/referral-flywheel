# Database Connection Monitoring Guide

## 📊 Real-Time Monitoring Dashboard

### Access the Dashboard
Navigate to: `https://your-app.vercel.app/monitor`

This dashboard shows:
- **Current connection usage** (with visual health indicators)
- **Connection distribution** by state and application
- **Long-running queries** that might be hogging connections
- **Cache hit ratio** for database efficiency
- **Real-time recommendations** based on usage patterns

### Understanding the Metrics

#### Connection States
- **active**: Currently executing a query
- **idle**: Connected but not doing anything
- **idle in transaction**: In a transaction but not executing
- **available**: Ready for new connections

#### Health Status
- 🟢 **Healthy** (< 60% usage): Normal operation
- 🟡 **Warning** (60-80% usage): Monitor closely
- 🔴 **Critical** (> 80% usage): Immediate action needed

## 🔍 API Endpoints for Monitoring

### 1. Detailed Connection Stats
```bash
GET /api/monitor/connections
```

Returns comprehensive connection data:
```json
{
  "health": {
    "status": "healthy|warning|critical",
    "recommendation": "..."
  },
  "connections": {
    "current": 8,
    "limit": 10,
    "available": 2,
    "usagePercentage": 80
  },
  "longRunningQueries": [...],
  "recommendations": [...]
}
```

### 2. Quick Health Check
```bash
GET /api/health
```

Simple health check for uptime monitoring:
```json
{
  "status": "healthy",
  "checks": {
    "database": { "healthy": true, "latency": 45 }
  }
}
```

### 3. Connection Test (Debug)
```bash
GET /api/debug/connection-test
```

Tests concurrent connection behavior and provides recommendations.

## 🚨 Setting Up Automated Alerts

### Option 1: Vercel Cron Jobs

Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/monitor-connections",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

This checks every 5 minutes for issues.

### Option 2: External Monitoring (Better Uptime, Pingdom)

1. Set up monitoring for: `https://your-app.vercel.app/api/health`
2. Alert if status code != 200
3. Check every 1-5 minutes

### Option 3: Discord/Slack Alerts

1. Add webhook URL to environment variables:
```env
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

2. The cron job will automatically send alerts when:
- Connection usage > 70% (warning)
- Connection usage > 90% (critical)
- Sudden connection spikes detected
- Multiple long-running queries found

## 📈 Monitoring in Production

### Quick Commands

#### Check current connections via CLI:
```bash
# See current usage
curl https://your-app.vercel.app/api/monitor/connections | jq '.connections'

# Check health
curl -I https://your-app.vercel.app/api/health

# Test connection pool
curl https://your-app.vercel.app/api/debug/connection-test | jq '.recommendations'
```

#### Monitor from Supabase Dashboard:

1. Go to SQL Editor in Supabase
2. Run these queries:

**Current connections:**
```sql
SELECT
  COUNT(*) as active_connections,
  COUNT(*) FILTER (WHERE state = 'active') as active_queries,
  COUNT(*) FILTER (WHERE state = 'idle') as idle,
  COUNT(*) FILTER (WHERE state = 'idle in transaction') as in_transaction
FROM pg_stat_activity
WHERE datname = current_database();
```

**Connection usage by time:**
```sql
SELECT
  date_trunc('minute', query_start) as minute,
  COUNT(DISTINCT pid) as unique_connections,
  COUNT(*) as total_queries
FROM pg_stat_activity
WHERE datname = current_database()
  AND query_start > now() - interval '1 hour'
GROUP BY minute
ORDER BY minute DESC;
```

**Find connection hogs:**
```sql
SELECT
  pid,
  usename,
  application_name,
  state,
  query,
  EXTRACT(EPOCH FROM (now() - query_start)) as duration_seconds
FROM pg_stat_activity
WHERE datname = current_database()
  AND state != 'idle'
  AND query_start < now() - interval '10 seconds'
ORDER BY duration_seconds DESC;
```

## 🎯 Connection Limit Recommendations

### Based on User Count

| Users | connection_limit | Notes |
|-------|-----------------|-------|
| 1-50 | 5-10 | Basic setup |
| 50-200 | 10-15 | Standard production |
| 200-500 | 20-30 | High traffic |
| 500-1000 | 30-50 | Very high traffic |
| 1000+ | 50+ | Consider upgrading plan |

### Calculating Your Needs

```
Required Connections = Peak Concurrent Users / 20

Why divide by 20?
- Each connection handles ~20 requests/second
- Most users generate 1-2 requests/second while active
- So 1 connection can serve ~10-20 users
```

### Example Scenarios

**E-commerce site (500 users browsing):**
- Peak concurrent: 100 users
- Required connections: 100 / 20 = 5
- Recommended: 10 (2x buffer)

**SaaS Dashboard (200 power users):**
- Peak concurrent: 50 users
- Heavy queries: multiply by 2
- Required connections: (50 × 2) / 20 = 5
- Recommended: 15 (3x buffer)

## 🛠️ Optimization Tips

### 1. Reduce Connection Usage

```typescript
// Bad: Multiple queries
const user = await prisma.user.findUnique({ where: { id } });
const posts = await prisma.post.findMany({ where: { userId: id } });
const comments = await prisma.comment.findMany({ where: { userId: id } });

// Good: Single query with includes
const userData = await prisma.user.findUnique({
  where: { id },
  include: {
    posts: true,
    comments: true
  }
});
```

### 2. Implement Caching

```typescript
// Cache frequently accessed data
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN
});

async function getCachedUser(id: string) {
  // Check cache first
  const cached = await redis.get(`user:${id}`);
  if (cached) return cached;

  // If not cached, fetch and cache
  const user = await prisma.user.findUnique({ where: { id } });
  await redis.set(`user:${id}`, user, { ex: 300 }); // Cache for 5 min
  return user;
}
```

### 3. Connection Pool Settings

Optimal DATABASE_URL for Vercel:
```
postgresql://[USER]:[PASS]@[HOST]:6543/[DB]?pgbouncer=true&connection_limit=20&pool_timeout=0&statement_timeout=30000
```

Parameters explained:
- `pgbouncer=true`: Use connection pooler
- `connection_limit=20`: Max connections
- `pool_timeout=0`: Don't timeout waiting for connection
- `statement_timeout=30000`: Kill queries over 30 seconds

## 🚀 Emergency Response Plan

### If you see 500 errors:

1. **Immediate: Increase connection limit**
   - Go to Vercel env variables
   - Update DATABASE_URL connection_limit to 2x current
   - Redeploy

2. **Check for issues:**
```bash
curl https://your-app.vercel.app/api/monitor/connections
```

3. **Kill long-running queries** (in Supabase SQL editor):
```sql
-- Find problematic queries
SELECT pid, query, state, query_start
FROM pg_stat_activity
WHERE state != 'idle'
  AND query_start < now() - interval '1 minute';

-- Kill specific query
SELECT pg_terminate_backend(PID_HERE);
```

4. **Emergency cache** (if repeated issues):
   - Implement Redis caching
   - Add CDN for static content
   - Consider read replicas

## 📞 Support Resources

- **Supabase Status**: https://status.supabase.com
- **Vercel Status**: https://vercel-status.com
- **PostgreSQL Docs**: https://www.postgresql.org/docs/current/monitoring-stats.html

## 🎯 Next Steps

1. Set up the monitoring dashboard
2. Configure automated alerts
3. Test with load testing:
```bash
# Simple load test (install autocannon first: npm i -g autocannon)
autocannon -c 50 -d 30 https://your-app.vercel.app/api/health
```

4. Monitor for a week and adjust connection_limit based on actual usage

Remember: It's better to have too many connections than too few. Unused connections have minimal overhead, but exhausted connections cause 500 errors!