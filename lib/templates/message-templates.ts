/**
 * Message Template Library
 *
 * 20+ pre-written templates for sharing referral links
 * Organized by platform and tone
 *
 * Variables:
 * - {name}: Member's first name
 * - {link}: Referral link
 * - {community}: Community name
 * - {earnings}: Total earnings
 * - {referrals}: Number of referrals
 */

export interface MessageTemplate {
  id: string;
  name: string;
  platform: 'twitter' | 'facebook' | 'linkedin' | 'whatsapp' | 'telegram' | 'discord' | 'slack' | 'reddit' | 'email' | 'sms' | 'general';
  category: 'casual' | 'professional' | 'excited' | 'testimonial' | 'urgency' | 'value' | 'social-proof';
  subject?: string; // For email
  message: string;
  variables: string[]; // Which variables this template uses
}

export const MESSAGE_TEMPLATES: MessageTemplate[] = [
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TWITTER / X TEMPLATES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'twitter-casual-1',
    name: 'Twitter - Casual Discovery',
    platform: 'twitter',
    category: 'casual',
    message: `Just discovered {community} and I'm already earning passive income 💰\n\nIf you join with my link, we both win. I get 10% of your payments, you get access to amazing content.\n\nWin-win 👇\n{link}`,
    variables: ['community', 'link'],
  },
  {
    id: 'twitter-social-proof-1',
    name: 'Twitter - Social Proof',
    platform: 'twitter',
    category: 'social-proof',
    message: `I've made ${earnings} just by sharing my {community} link\n\nHere's how it works:\n✅ You join with my link\n✅ I earn 10% of your payments (forever)\n✅ You get full access + your own referral link\n\nJoin here: {link}`,
    variables: ['earnings', 'community', 'link'],
  },
  {
    id: 'twitter-excited-1',
    name: 'Twitter - Excited Energy',
    platform: 'twitter',
    category: 'excited',
    message: `🚨 THIS IS INSANE 🚨\n\n{community} literally pays me 10% commission on every person I refer.\n\nI've referred {referrals} people and earned ${earnings}\n\nYou can do the same. Join with my link:\n{link}`,
    variables: ['community', 'referrals', 'earnings', 'link'],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FACEBOOK TEMPLATES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'facebook-testimonial-1',
    name: 'Facebook - Personal Testimonial',
    platform: 'facebook',
    category: 'testimonial',
    message: `Friends! 👋\n\nI wanted to share something cool I found - {community}.\n\nNot only is the content amazing, but they have this unique referral system where I earn 10% commission on anyone who joins with my link. It's completely passive income!\n\nI've already made ${earnings} just by sharing with people who'd benefit from it.\n\nIf you're interested, use my link and we both win:\n{link}\n\nHappy to answer any questions!`,
    variables: ['community', 'earnings', 'link'],
  },
  {
    id: 'facebook-value-1',
    name: 'Facebook - Value Proposition',
    platform: 'facebook',
    category: 'value',
    message: `💡 Quick question: Would you join a community if you could also earn money by sharing it?\n\nThat's exactly what {community} offers.\n\n✅ Get access to premium content\n✅ Get your own referral link\n✅ Earn 10% commission on every referral (lifetime recurring)\n\nI'm already in and loving it. Join with my link:\n{link}`,
    variables: ['community', 'link'],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // LINKEDIN TEMPLATES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'linkedin-professional-1',
    name: 'LinkedIn - Professional Network',
    platform: 'linkedin',
    category: 'professional',
    message: `I recently joined {community} and wanted to share an interesting opportunity with my network.\n\nBeyond the valuable content, they've implemented a revenue-sharing model where members earn 10% lifetime commission on referrals. It's a win-win approach to community growth.\n\nKey benefits:\n• Access to premium content and resources\n• Passive income through referrals\n• Aligned incentives (I only earn if you find value)\n\nIf this interests you, feel free to use my referral link:\n{link}\n\nOpen to discussing further if you'd like to learn more.`,
    variables: ['community', 'link'],
  },
  {
    id: 'linkedin-value-2',
    name: 'LinkedIn - ROI Focus',
    platform: 'linkedin',
    category: 'professional',
    message: `ROI update on my {community} membership:\n\n📊 Investment: $49/month\n💰 Earnings from referrals: ${earnings}\n👥 People I've helped: {referrals}\n📈 Net result: Positive cash flow\n\nThis is a rare case where sharing something valuable actually pays back. The content is worth it alone, but the referral model makes it compelling.\n\nInterested? Use my link:\n{link}`,
    variables: ['community', 'earnings', 'referrals', 'link'],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // WHATSAPP / SMS TEMPLATES (shorter, conversational)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'whatsapp-casual-1',
    name: 'WhatsApp - Quick Share',
    platform: 'whatsapp',
    category: 'casual',
    message: `Hey! 👋 You should check out {community}\n\nI'm in it and it's great. Plus if you use my link I get 10% commission (and you get your own link to earn too)\n\n{link}\n\nLet me know if you join!`,
    variables: ['community', 'link'],
  },
  {
    id: 'whatsapp-excited-1',
    name: 'WhatsApp - Exciting News',
    platform: 'whatsapp',
    category: 'excited',
    message: `Dude! I've made ${earnings} this month just sharing my {community} link 🤯\n\nYou need to get in on this. Use my link and you'll get your own too:\n{link}`,
    variables: ['earnings', 'community', 'link'],
  },
  {
    id: 'sms-short-1',
    name: 'SMS - Ultra Short',
    platform: 'sms',
    category: 'casual',
    message: `Join {community} with my link and we both earn! 💰 {link}`,
    variables: ['community', 'link'],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // DISCORD / SLACK TEMPLATES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'discord-casual-1',
    name: 'Discord - Community Share',
    platform: 'discord',
    category: 'casual',
    message: `@everyone Hey fam! 🎉\n\nJust wanted to share {community} - it's been super valuable for me.\n\nThe cool part: they have a referral system where you can earn passive income by sharing. I've made ${earnings} so far!\n\nIf you want to check it out, use my link:\n{link}\n\nYou'll get your own referral link too once you join 🚀`,
    variables: ['community', 'earnings', 'link'],
  },
  {
    id: 'slack-professional-1',
    name: 'Slack - Professional Share',
    platform: 'slack',
    category: 'professional',
    message: `Hey team! Quick share:\n\nI've been part of {community} and it's been great for [specific benefit]. They also have an interesting referral model where members can earn 10% commission.\n\nIf anyone's interested:\n{link}\n\n(Full disclosure: I get a commission if you join, but I wouldn't share if I didn't genuinely find value)`,
    variables: ['community', 'link'],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // REDDIT TEMPLATES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'reddit-value-1',
    name: 'Reddit - Honest Review',
    platform: 'reddit',
    category: 'value',
    message: `[Honest Review] {community}\n\nI joined {community} a few months ago and wanted to share my experience.\n\n**The Good:**\n- High-quality content\n- Active community\n- Unique referral system (10% lifetime commission)\n\n**The Not-So-Good:**\n- [Be honest about cons]\n\n**My Results:**\n- ${earnings} earned from {referrals} referrals\n- Worth the membership cost for the content alone\n\n**Full Disclosure:** The link below is my referral link, so I'll earn commission if you join. But I genuinely think it's worth checking out.\n\n{link}\n\nHappy to answer questions!`,
    variables: ['community', 'earnings', 'referrals', 'link'],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // EMAIL TEMPLATES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'email-professional-1',
    name: 'Email - Professional Introduction',
    platform: 'email',
    category: 'professional',
    subject: 'Thought you might find {community} interesting',
    message: `Hi there,\n\nI hope this email finds you well!\n\nI wanted to reach out because I recently joined {community} and thought it might be valuable for you too.\n\nWhat makes it interesting:\n• [Benefit 1 relevant to recipient]\n• [Benefit 2 relevant to recipient]\n• Members can earn passive income through referrals (I've made ${earnings} so far)\n\nIf you're interested, you can join here:\n{link}\n\nNo pressure at all - just wanted to share something I've found valuable!\n\nBest,\n{name}`,
    variables: ['community', 'earnings', 'link', 'name'],
  },
  {
    id: 'email-casual-1',
    name: 'Email - Casual Friend Share',
    platform: 'email',
    category: 'casual',
    subject: 'You need to see this!',
    message: `Hey!\n\nQuick email because I found something cool and thought of you.\n\nI joined {community} and it's been awesome. The best part? They have this referral thing where I can earn money by sharing it with friends.\n\nI've already made ${earnings} and helped {referrals} people find something valuable.\n\nWanna check it out? Use my link:\n{link}\n\nLet me know what you think!\n\n{name}`,
    variables: ['community', 'earnings', 'referrals', 'link', 'name'],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TELEGRAM TEMPLATES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'telegram-urgency-1',
    name: 'Telegram - Limited Time Feel',
    platform: 'telegram',
    category: 'urgency',
    message: `🚀 Opportunity alert!\n\n{community} has a referral program where you can earn 10% commission on everyone you refer.\n\nI'm already at ${earnings} earned from {referrals} referrals.\n\nThe earlier you start, the more you can earn. Get in now:\n{link}\n\n💰 Your link = Your passive income stream`,
    variables: ['community', 'earnings', 'referrals', 'link'],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // GENERAL / MULTI-PURPOSE TEMPLATES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'general-simple-1',
    name: 'General - Simple & Direct',
    platform: 'general',
    category: 'casual',
    message: `I'm part of {community} and earning passive income by sharing my referral link.\n\nJoin with my link and you'll get your own:\n{link}`,
    variables: ['community', 'link'],
  },
  {
    id: 'general-social-proof-1',
    name: 'General - Results Focused',
    platform: 'general',
    category: 'social-proof',
    message: `My {community} Results:\n💰 ${earnings} earned\n👥 {referrals} referrals\n📈 100% passive\n\nWant the same? Use my link:\n{link}`,
    variables: ['community', 'earnings', 'referrals', 'link'],
  },
  {
    id: 'general-value-focused',
    name: 'General - Value First',
    platform: 'general',
    category: 'value',
    message: `If you've been looking for [specific value], {community} is worth checking out.\n\nBonus: They have a referral system where both of us benefit. I earn 10%, you get full access + your own referral link.\n\nCheck it out:\n{link}`,
    variables: ['community', 'link'],
  },
];

/**
 * Replace variables in template with actual values
 */
export function fillTemplate(
  template: MessageTemplate,
  values: Partial<Record<string, string | number>>
): string {
  let filled = template.message;

  // Replace each variable
  for (const variable of template.variables) {
    const value = values[variable];
    if (value !== undefined) {
      const placeholder = `{${variable}}`;
      filled = filled.replace(new RegExp(placeholder, 'g'), String(value));
    }
  }

  return filled;
}

/**
 * Get templates by platform
 */
export function getTemplatesByPlatform(
  platform: MessageTemplate['platform']
): MessageTemplate[] {
  return MESSAGE_TEMPLATES.filter(
    (t) => t.platform === platform || t.platform === 'general'
  );
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(
  category: MessageTemplate['category']
): MessageTemplate[] {
  return MESSAGE_TEMPLATES.filter((t) => t.category === category);
}

/**
 * Get random template for a platform
 */
export function getRandomTemplate(
  platform: MessageTemplate['platform']
): MessageTemplate {
  const templates = getTemplatesByPlatform(platform);
  return templates[Math.floor(Math.random() * templates.length)];
}
