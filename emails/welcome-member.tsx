// emails/welcome-member.tsx
import * as React from 'react';

interface WelcomeMemberEmailProps {
  memberName: string;
  creatorName: string;
  referralLink: string;
  tier1Count: number;
  tier1Reward: string;
  tier2Count: number;
  tier2Reward: string;
  tier3Count: number;
  tier3Reward: string;
  tier4Count: number;
  tier4Reward: string;
}

export const WelcomeMemberEmail = ({
  memberName,
  creatorName,
  referralLink,
  tier1Count,
  tier1Reward,
  tier2Count,
  tier2Reward,
  tier3Count,
  tier3Reward,
  tier4Count,
  tier4Reward,
}: WelcomeMemberEmailProps) => {
  return (
    <html>
      <head>
        <style>{`
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            text-align: center;
            margin-bottom: 30px;
          }
          .content {
            background: #f9fafb;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 20px;
          }
          .cta-button {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            margin: 20px 0;
          }
          .referral-link {
            background: white;
            padding: 15px;
            border-radius: 8px;
            border: 2px dashed #667eea;
            word-break: break-all;
            margin: 15px 0;
            font-family: monospace;
            font-size: 14px;
          }
          .rewards-list {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin: 15px 0;
          }
          .reward-item {
            padding: 10px 0;
            border-bottom: 1px solid #e5e7eb;
          }
          .reward-item:last-child {
            border-bottom: none;
          }
          .emoji {
            font-size: 24px;
            margin-right: 10px;
          }
        `}</style>
      </head>
      <body>
        <div className="header">
          <h1>🎉 Welcome to {creatorName}!</h1>
        </div>

        <div className="content">
          <p>Hi {memberName},</p>

          <p>
            <strong>You're now part of something special!</strong> Every member in {creatorName} is
            automatically an affiliate - you can earn <strong>10% lifetime commission</strong> by
            sharing your unique referral link.
          </p>

          <h2>💰 Your Referral Link</h2>
          <div className="referral-link">{referralLink}</div>

          <p>
            <strong>How it works:</strong>
          </p>
          <ul>
            <li>Share your link with friends</li>
            <li>When they join, you earn 10% every month they stay</li>
            <li>Refer 100 people = $499/month passive income!</li>
          </ul>

          <h2>🏆 Leaderboard Rewards</h2>
          <p>Compete with other members and unlock exclusive rewards:</p>

          <div className="rewards-list">
            <div className="reward-item">
              <span className="emoji">🥉</span>
              <strong>{tier1Count} referrals:</strong> {tier1Reward}
            </div>
            <div className="reward-item">
              <span className="emoji">🥈</span>
              <strong>{tier2Count} referrals:</strong> {tier2Reward}
            </div>
            <div className="reward-item">
              <span className="emoji">🥇</span>
              <strong>{tier3Count} referrals:</strong> {tier3Reward}
            </div>
            <div className="reward-item">
              <span className="emoji">💎</span>
              <strong>{tier4Count} referrals:</strong> {tier4Reward}
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <a href={`${process.env.NEXT_PUBLIC_APP_URL}/customer`} className="cta-button">
              View Your Dashboard
            </a>
          </div>

          <p style={{ marginTop: '30px', color: '#6b7280', fontSize: '14px' }}>
            Questions? Reply to this email - we're here to help!
          </p>
        </div>

        <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: '12px' }}>
          <p>Referral Flywheel - Turn every member into an affiliate</p>
        </div>
      </body>
    </html>
  );
};

export default WelcomeMemberEmail;
