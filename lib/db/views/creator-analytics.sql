-- Materialized view for creator analytics
-- Refreshed every 5 minutes via cron job
-- Optimizes creator dashboard loads and analytics queries

CREATE MATERIALIZED VIEW IF NOT EXISTS creator_analytics_mv AS
SELECT
  c.id,
  c.companyId,
  c.companyName,
  c.productId,
  c.createdAt,

  -- Member counts
  COALESCE(member_counts.total, 0) as totalMembers,
  COALESCE(member_counts.active_30d, 0) as activeMembers30d,
  COALESCE(member_counts.active_7d, 0) as activeMembers7d,
  COALESCE(member_counts.new_30d, 0) as newMembers30d,

  -- Revenue metrics (creator's 70% share)
  COALESCE(revenue_all_time.amount, 0) as lifetimeRevenue,
  COALESCE(revenue_30d.amount, 0) as revenue30d,
  COALESCE(revenue_7d.amount, 0) as revenue7d,
  COALESCE(revenue_today.amount, 0) as revenueToday,

  -- Monthly Recurring Revenue (MRR) - recurring payments only
  COALESCE(mrr.amount, 0) as monthlyRecurringRevenue,

  -- Referral metrics
  COALESCE(referral_counts.total, 0) as totalReferrals,
  COALESCE(referral_counts.count_30d, 0) as referrals30d,
  COALESCE(referral_counts.count_7d, 0) as referrals7d,

  -- Attribution & conversion metrics
  COALESCE(attribution_stats.total_clicks, 0) as totalClicks,
  COALESCE(attribution_stats.active_clicks, 0) as activeClicks,
  COALESCE(attribution_stats.converted_clicks, 0) as convertedClicks,

  -- Conversion rate (clicks → paid members)
  CASE
    WHEN attribution_stats.total_clicks > 0 THEN
      ROUND((attribution_stats.converted_clicks::numeric / attribution_stats.total_clicks::numeric * 100), 2)
    ELSE 0
  END as conversionRate,

  -- Average order value
  CASE
    WHEN commission_counts.total > 0 THEN
      ROUND(revenue_all_time.amount / commission_counts.total, 2)
    ELSE 0
  END as avgOrderValue,

  -- Commission counts
  COALESCE(commission_counts.total, 0) as totalCommissions,
  COALESCE(commission_counts.pending, 0) as pendingCommissions,
  COALESCE(commission_counts.paid, 0) as paidCommissions,
  COALESCE(commission_counts.initial, 0) as initialCommissions,
  COALESCE(commission_counts.recurring, 0) as recurringCommissions,

  -- Growth rate (30d vs previous 30d)
  CASE
    WHEN revenue_previous_30d.amount > 0 THEN
      ROUND(((revenue_30d.amount - revenue_previous_30d.amount) / revenue_previous_30d.amount * 100), 2)
    ELSE 0
  END as revenueGrowthRate30d,

  -- Top performer (highest earner)
  top_earner.username as topEarnerUsername,
  top_earner.lifetimeEarnings as topEarnerAmount,

  -- Top referrer (most referrals)
  top_referrer.username as topReferrerUsername,
  top_referrer.totalReferred as topReferrerCount

FROM "Creator" c

-- Member counts
LEFT JOIN (
  SELECT
    creatorId,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE "updatedAt" >= NOW() - INTERVAL '30 days') as active_30d,
    COUNT(*) FILTER (WHERE "updatedAt" >= NOW() - INTERVAL '7 days') as active_7d,
    COUNT(*) FILTER (WHERE "createdAt" >= NOW() - INTERVAL '30 days') as new_30d
  FROM "Member"
  GROUP BY creatorId
) member_counts ON member_counts.creatorId = c.id

-- Revenue metrics
LEFT JOIN (
  SELECT creatorId, SUM(creatorShare) as amount
  FROM "Commission"
  WHERE status = 'paid'
  GROUP BY creatorId
) revenue_all_time ON revenue_all_time.creatorId = c.id

LEFT JOIN (
  SELECT creatorId, SUM(creatorShare) as amount
  FROM "Commission"
  WHERE status = 'paid' AND paidAt >= NOW() - INTERVAL '30 days'
  GROUP BY creatorId
) revenue_30d ON revenue_30d.creatorId = c.id

LEFT JOIN (
  SELECT creatorId, SUM(creatorShare) as amount
  FROM "Commission"
  WHERE status = 'paid' AND paidAt >= NOW() - INTERVAL '7 days'
  GROUP BY creatorId
) revenue_7d ON revenue_7d.creatorId = c.id

LEFT JOIN (
  SELECT creatorId, SUM(creatorShare) as amount
  FROM "Commission"
  WHERE status = 'paid' AND paidAt >= CURRENT_DATE
  GROUP BY creatorId
) revenue_today ON revenue_today.creatorId = c.id

-- Previous 30d revenue for growth calculation
LEFT JOIN (
  SELECT creatorId, SUM(creatorShare) as amount
  FROM "Commission"
  WHERE status = 'paid'
    AND paidAt >= NOW() - INTERVAL '60 days'
    AND paidAt < NOW() - INTERVAL '30 days'
  GROUP BY creatorId
) revenue_previous_30d ON revenue_previous_30d.creatorId = c.id

-- MRR calculation
LEFT JOIN (
  SELECT creatorId, SUM(creatorShare) as amount
  FROM "Commission"
  WHERE status = 'paid'
    AND paymentType = 'recurring'
    AND paidAt >= NOW() - INTERVAL '30 days'
  GROUP BY creatorId
) mrr ON mrr.creatorId = c.id

-- Referral counts
LEFT JOIN (
  SELECT
    creatorId,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE "createdAt" >= NOW() - INTERVAL '30 days') as count_30d,
    COUNT(*) FILTER (WHERE "createdAt" >= NOW() - INTERVAL '7 days') as count_7d
  FROM "Member"
  WHERE referredBy IS NOT NULL
  GROUP BY creatorId
) referral_counts ON referral_counts.creatorId = c.id

-- Attribution statistics
LEFT JOIN (
  SELECT
    m.creatorId,
    COUNT(ac.id) as total_clicks,
    COUNT(ac.id) FILTER (WHERE ac.expiresAt > NOW()) as active_clicks,
    COUNT(ac.id) FILTER (WHERE ac.converted = true) as converted_clicks
  FROM "AttributionClick" ac
  JOIN "Member" m ON m.id = ac.memberId
  GROUP BY m.creatorId
) attribution_stats ON attribution_stats.creatorId = c.id

-- Commission counts by status and type
LEFT JOIN (
  SELECT
    creatorId,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'pending') as pending,
    COUNT(*) FILTER (WHERE status = 'paid') as paid,
    COUNT(*) FILTER (WHERE paymentType = 'initial') as initial,
    COUNT(*) FILTER (WHERE paymentType = 'recurring') as recurring
  FROM "Commission"
  GROUP BY creatorId
) commission_counts ON commission_counts.creatorId = c.id

-- Top earner per creator
LEFT JOIN LATERAL (
  SELECT username, lifetimeEarnings
  FROM "Member"
  WHERE creatorId = c.id
  ORDER BY lifetimeEarnings DESC
  LIMIT 1
) top_earner ON true

-- Top referrer per creator
LEFT JOIN LATERAL (
  SELECT username, totalReferred
  FROM "Member"
  WHERE creatorId = c.id
  ORDER BY totalReferred DESC
  LIMIT 1
) top_referrer ON true

ORDER BY c.createdAt DESC;

-- Create indexes on the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS creator_analytics_mv_id_idx ON creator_analytics_mv (id);
CREATE INDEX IF NOT EXISTS creator_analytics_mv_companyId_idx ON creator_analytics_mv (companyId);
CREATE INDEX IF NOT EXISTS creator_analytics_mv_revenue_idx ON creator_analytics_mv (lifetimeRevenue DESC);
