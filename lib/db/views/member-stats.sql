-- Materialized view for member statistics
-- Refreshed every 5 minutes via cron job
-- Optimizes leaderboard queries and member dashboard loads

CREATE MATERIALIZED VIEW IF NOT EXISTS member_stats_mv AS
SELECT
  m.id,
  m.userId,
  m.membershipId,
  m.username,
  m.referralCode,
  m.creatorId,
  m.lifetimeEarnings,
  m.monthlyEarnings,
  m.totalReferred,
  m.monthlyReferred,
  m.createdAt,

  -- Global rankings
  ROW_NUMBER() OVER (ORDER BY m.lifetimeEarnings DESC) as globalEarningsRank,
  ROW_NUMBER() OVER (ORDER BY m.totalReferred DESC) as globalReferralsRank,

  -- Community rankings
  ROW_NUMBER() OVER (PARTITION BY m.creatorId ORDER BY m.lifetimeEarnings DESC) as communityEarningsRank,
  ROW_NUMBER() OVER (PARTITION BY m.creatorId ORDER BY m.totalReferred DESC) as communityReferralsRank,

  -- Weekly rankings (custom reward competitions)
  ROW_NUMBER() OVER (
    PARTITION BY m.creatorId
    ORDER BY COALESCE(weekly_earnings.amount, 0) DESC
  ) as weeklyRank,
  COALESCE(weekly_earnings.amount, 0) as weeklyEarnings,
  COALESCE(weekly_referrals.count, 0) as weeklyReferrals,

  -- Monthly rankings
  ROW_NUMBER() OVER (
    PARTITION BY m.creatorId
    ORDER BY m.monthlyEarnings DESC
  ) as monthlyRank,

  -- Performance metrics
  CASE
    WHEN m.lifetimeEarnings >= 5000 THEN 'platinum'
    WHEN m.lifetimeEarnings >= 2000 THEN 'gold'
    WHEN m.lifetimeEarnings >= 500 THEN 'silver'
    ELSE 'bronze'
  END as tier,

  -- Conversion rate (referrals → paid members)
  CASE
    WHEN attribution_clicks.clicks > 0 THEN
      ROUND((m.totalReferred::numeric / attribution_clicks.clicks::numeric * 100), 2)
    ELSE 0
  END as conversionRate,

  -- Total clicks on their referral link
  COALESCE(attribution_clicks.clicks, 0) as totalClicks,
  COALESCE(attribution_clicks.active_clicks, 0) as activeClicks

FROM "Member" m

-- Weekly earnings subquery
LEFT JOIN (
  SELECT
    c.memberId,
    SUM(c.memberShare) as amount
  FROM "Commission" c
  WHERE c.paidAt >= NOW() - INTERVAL '7 days'
    AND c.status = 'paid'
  GROUP BY c.memberId
) weekly_earnings ON weekly_earnings.memberId = m.id

-- Weekly referrals subquery
LEFT JOIN (
  SELECT
    memberId,
    COUNT(*) as count
  FROM "Member"
  WHERE createdAt >= NOW() - INTERVAL '7 days'
  GROUP BY memberId
) weekly_referrals ON weekly_referrals.memberId = m.id

-- Attribution clicks subquery
LEFT JOIN (
  SELECT
    memberId,
    COUNT(*) as clicks,
    COUNT(*) FILTER (WHERE expiresAt > NOW()) as active_clicks
  FROM "AttributionClick"
  GROUP BY memberId
) attribution_clicks ON attribution_clicks.memberId = m.id

ORDER BY m.lifetimeEarnings DESC;

-- Create indexes on the materialized view for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS member_stats_mv_id_idx ON member_stats_mv (id);
CREATE INDEX IF NOT EXISTS member_stats_mv_userId_idx ON member_stats_mv (userId);
CREATE INDEX IF NOT EXISTS member_stats_mv_referralCode_idx ON member_stats_mv (referralCode);
CREATE INDEX IF NOT EXISTS member_stats_mv_creatorId_idx ON member_stats_mv (creatorId);
CREATE INDEX IF NOT EXISTS member_stats_mv_globalEarningsRank_idx ON member_stats_mv (globalEarningsRank);
CREATE INDEX IF NOT EXISTS member_stats_mv_communityRank_idx ON member_stats_mv (creatorId, communityEarningsRank);
CREATE INDEX IF NOT EXISTS member_stats_mv_weeklyRank_idx ON member_stats_mv (creatorId, weeklyRank);
