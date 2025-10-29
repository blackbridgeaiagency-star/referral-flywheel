'use client';

import { useState } from 'react';
import { X, Check, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';

interface OnboardingWizardProps {
  creatorId: string;
  currentName: string;
  onComplete: () => void;
  onSkip: () => void;
}

type Step = 'welcome' | 'rewards' | 'competition' | 'message' | 'review';

interface OnboardingData {
  // Reward tiers
  tier1Count: number;
  tier1Reward: string;
  tier2Count: number;
  tier2Reward: string;
  tier3Count: number;
  tier3Reward: string;
  tier4Count: number;
  tier4Reward: string;

  // Competition
  competitionEnabled: boolean;
  competitionTimeframe: string;
  competitionType: string;
  reward1st: string;
  reward2nd: string;
  reward3rd: string;

  // Welcome message
  welcomeMessage: string;
}

const REWARD_TEMPLATES = [
  {
    name: 'Digital Perks',
    tiers: [
      { count: 3, reward: 'Exclusive Discord Role' },
      { count: 5, reward: 'Early Access to Content' },
      { count: 10, reward: 'VIP Channel Access' },
      { count: 25, reward: 'Lifetime Premium Membership' },
    ],
  },
  {
    name: 'Recognition Based',
    tiers: [
      { count: 3, reward: 'Shoutout in Community' },
      { count: 5, reward: 'Featured Member Badge' },
      { count: 10, reward: 'Hall of Fame Entry' },
      { count: 25, reward: 'Co-Creator Title' },
    ],
  },
  {
    name: 'Financial Incentives',
    tiers: [
      { count: 3, reward: '1 Month Free' },
      { count: 5, reward: '3 Months Free' },
      { count: 10, reward: '6 Months Free + Merch' },
      { count: 25, reward: 'Lifetime Free + $500 Cash' },
    ],
  },
  {
    name: 'Learning & Growth',
    tiers: [
      { count: 3, reward: 'Free Mini-Course' },
      { count: 5, reward: '1-on-1 Coaching Call' },
      { count: 10, reward: 'Advanced Course Bundle' },
      { count: 25, reward: 'Personal Mentorship Program' },
    ],
  },
];

const WELCOME_TEMPLATES = [
  {
    name: 'Friendly & Casual',
    message: `Hey {memberName}! 🎉

Welcome to {creatorName}! We're stoked to have you here.

Here's something cool: You now have your own referral link that pays you 10% lifetime commission on everyone you invite!

Your link: {referralLink}

Share it with friends, post it on social media, or send it to anyone who'd love what we do. You'll earn passive income every month they stay. Pretty sweet, right?

See you in the community! 🚀`,
  },
  {
    name: 'Professional & Direct',
    message: `Dear {memberName},

Welcome to {creatorName}.

As a member, you have access to a referral program offering 10% lifetime commission on all referred members.

Your unique referral link: {referralLink}

Share this link to start earning passive income. Commission is calculated monthly and paid directly to your account.

For questions, contact our support team.

Best regards,
The {creatorName} Team`,
  },
  {
    name: 'Excited & Motivational',
    message: `🚀 WELCOME {memberName}! 🚀

You just joined {creatorName} - and you're about to discover something AMAZING!

💰 YOUR MONEY-MAKING LINK:
{referralLink}

This isn't just any link. This is YOUR ticket to passive income!

Share it. Post it. Send it. Every person who joins through your link pays you 10% FOREVER!

Imagine: 100 referrals = $499/month in passive income!

The community is waiting for you. Let's GO! 🔥`,
  },
  {
    name: 'Value-Focused',
    message: `Welcome to {creatorName}, {memberName}!

You're now part of a community that rewards you for bringing value.

📊 YOUR REFERRAL PROGRAM:
• Link: {referralLink}
• Commission: 10% lifetime recurring
• Payment: Monthly, automatic
• Potential: Unlimited

The more value you share, the more you earn. It's that simple.

Ready to start? Share your link and watch your earnings grow.`,
  },
];

export function OnboardingWizard({ creatorId, currentName, onComplete, onSkip }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState<Step>('welcome');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [data, setData] = useState<OnboardingData>({
    tier1Count: 3,
    tier1Reward: 'Exclusive Discord Role',
    tier2Count: 5,
    tier2Reward: 'Early Access to Content',
    tier3Count: 10,
    tier3Reward: 'VIP Channel Access',
    tier4Count: 25,
    tier4Reward: 'Lifetime Premium Membership',
    competitionEnabled: false,
    competitionTimeframe: 'monthly',
    competitionType: 'top_earners',
    reward1st: '$100 Cash Prize',
    reward2nd: '$50 Cash Prize',
    reward3rd: '$25 Cash Prize',
    welcomeMessage: WELCOME_TEMPLATES[0].message,
  });

  const steps: Step[] = ['welcome', 'rewards', 'competition', 'message', 'review'];
  const currentStepIndex = steps.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex]);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex]);
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/creator/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId,
          ...data,
        }),
      });

      if (!response.ok) throw new Error('Failed to save onboarding data');

      onComplete();
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const applyTemplate = (template: typeof REWARD_TEMPLATES[0]) => {
    setData({
      ...data,
      tier1Count: template.tiers[0].count,
      tier1Reward: template.tiers[0].reward,
      tier2Count: template.tiers[1].count,
      tier2Reward: template.tiers[1].reward,
      tier3Count: template.tiers[2].count,
      tier3Reward: template.tiers[2].reward,
      tier4Count: template.tiers[3].count,
      tier4Reward: template.tiers[3].reward,
    });
  };

  const applyWelcomeTemplate = (template: typeof WELCOME_TEMPLATES[0]) => {
    setData({
      ...data,
      welcomeMessage: template.message,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1A1A1A] border border-purple-500/30 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Setup Wizard</h2>
                <p className="text-sm text-gray-400">Let's configure your referral program</p>
              </div>
            </div>
            <button
              onClick={onSkip}
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="Skip onboarding"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="relative">
            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-600 to-pink-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Step {currentStepIndex + 1} of {steps.length}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentStep === 'welcome' && (
            <WelcomeStep communityName={currentName} onNext={handleNext} />
          )}
          {currentStep === 'rewards' && (
            <RewardsStep
              data={data}
              setData={setData}
              templates={REWARD_TEMPLATES}
              applyTemplate={applyTemplate}
            />
          )}
          {currentStep === 'competition' && (
            <CompetitionStep data={data} setData={setData} />
          )}
          {currentStep === 'message' && (
            <MessageStep
              data={data}
              setData={setData}
              templates={WELCOME_TEMPLATES}
              applyTemplate={applyWelcomeTemplate}
            />
          )}
          {currentStep === 'review' && (
            <ReviewStep data={data} communityName={currentName} />
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-800 flex items-center justify-between">
          <button
            onClick={onSkip}
            className="text-gray-400 hover:text-white transition-colors text-sm"
          >
            Skip for now
          </button>

          <div className="flex gap-3">
            {currentStepIndex > 0 && (
              <button
                onClick={handleBack}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            )}

            {currentStep !== 'review' ? (
              <button
                onClick={handleNext}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-all font-medium flex items-center gap-2"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={isSubmitting}
                className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg transition-all font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Saving...' : 'Complete Setup'}
                <Check className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Step components will be in separate files for better organization
function WelcomeStep({ communityName, onNext }: { communityName: string; onNext: () => void }) {
  return (
    <div className="space-y-6 text-center max-w-xl mx-auto">
      <div className="text-6xl mb-4">🚀</div>
      <h3 className="text-3xl font-bold text-white">Welcome to Referral Flywheel!</h3>
      <p className="text-lg text-gray-300 leading-relaxed">
        You're about to turn <span className="text-purple-400 font-semibold">{communityName}</span> into
        a viral growth engine. Every member becomes an automatic affiliate earning 10% lifetime commissions.
      </p>

      <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/20 border border-purple-500/30 rounded-xl p-6 text-left">
        <h4 className="font-semibold text-white mb-3">What we'll set up:</h4>
        <ul className="space-y-2 text-gray-300">
          <li className="flex items-start gap-2">
            <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <span><strong>Reward Tiers</strong> - Incentivize members to refer more</span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <span><strong>Competition Rewards</strong> - Monthly prizes for top performers</span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <span><strong>Welcome Message</strong> - Automatically greet new members</span>
          </li>
        </ul>
      </div>

      <p className="text-sm text-gray-500">
        💡 Don't worry - you can change everything later in settings. Let's make this quick!
      </p>

      <button
        onClick={onNext}
        className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-all font-medium flex items-center justify-center gap-2 text-lg"
      >
        Let's Get Started!
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
}

function RewardsStep({
  data,
  setData,
  templates,
  applyTemplate,
}: {
  data: OnboardingData;
  setData: (data: OnboardingData) => void;
  templates: typeof REWARD_TEMPLATES;
  applyTemplate: (template: typeof REWARD_TEMPLATES[0]) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-white mb-2">Reward Tiers</h3>
        <p className="text-gray-400">
          Set milestones and rewards to motivate members. Rewards don't have to be financial - get creative!
        </p>
      </div>

      {/* Templates */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">Quick Templates:</label>
        <div className="grid grid-cols-2 gap-3">
          {templates.map((template) => (
            <button
              key={template.name}
              onClick={() => applyTemplate(template)}
              className="px-4 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-purple-500/50 rounded-lg transition-all text-left"
            >
              <div className="font-medium text-white text-sm">{template.name}</div>
              <div className="text-xs text-gray-500 mt-1">
                {template.tiers[0].reward.substring(0, 20)}...
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Tier inputs */}
      <div className="space-y-4">
        {[1, 2, 3, 4].map((tier) => {
          const countKey = `tier${tier}Count` as keyof OnboardingData;
          const rewardKey = `tier${tier}Reward` as keyof OnboardingData;

          return (
            <div key={tier} className="flex gap-3 items-start">
              <div className="w-20">
                <label className="block text-xs text-gray-500 mb-1">Referrals</label>
                <input
                  type="number"
                  value={data[countKey] as number}
                  onChange={(e) => setData({ ...data, [countKey]: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  min="1"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Reward</label>
                <input
                  type="text"
                  value={data[rewardKey] as string}
                  onChange={(e) => setData({ ...data, [rewardKey]: e.target.value })}
                  placeholder="e.g., VIP Access, Shoutout, Free Month"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
        <p className="text-sm text-blue-300">
          💡 <strong>Pro Tip:</strong> Non-financial rewards often work better! Try badges, shoutouts,
          exclusive access, or recognition in your community.
        </p>
      </div>
    </div>
  );
}

function CompetitionStep({
  data,
  setData,
}: {
  data: OnboardingData;
  setData: (data: OnboardingData) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-white mb-2">Competition Rewards (Optional)</h3>
        <p className="text-gray-400">
          Add time-based competitions to create urgency and excitement. Top performers win prizes!
        </p>
      </div>

      {/* Enable toggle */}
      <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700">
        <div>
          <div className="font-medium text-white">Enable Competitions</div>
          <div className="text-sm text-gray-500">Monthly prizes for top referrers</div>
        </div>
        <button
          onClick={() => setData({ ...data, competitionEnabled: !data.competitionEnabled })}
          className={`relative w-14 h-7 rounded-full transition-colors ${
            data.competitionEnabled ? 'bg-green-600' : 'bg-gray-600'
          }`}
        >
          <div
            className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
              data.competitionEnabled ? 'translate-x-7' : ''
            }`}
          />
        </button>
      </div>

      {data.competitionEnabled && (
        <>
          {/* Timeframe */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Competition Period:</label>
            <div className="grid grid-cols-3 gap-3">
              {['daily', 'weekly', 'monthly'].map((period) => (
                <button
                  key={period}
                  onClick={() => setData({ ...data, competitionTimeframe: period })}
                  className={`px-4 py-3 rounded-lg border transition-all ${
                    data.competitionTimeframe === period
                      ? 'bg-purple-600 border-purple-500 text-white'
                      : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-purple-500/50'
                  }`}
                >
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Prize inputs */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-300">Prizes:</label>
            {[
              { key: 'reward1st', label: '🥇 1st Place', placeholder: 'e.g., $100 Cash' },
              { key: 'reward2nd', label: '🥈 2nd Place', placeholder: 'e.g., $50 Cash' },
              { key: 'reward3rd', label: '🥉 3rd Place', placeholder: 'e.g., $25 Cash' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-xs text-gray-500 mb-1">{label}</label>
                <input
                  type="text"
                  value={data[key as keyof OnboardingData] as string}
                  onChange={(e) => setData({ ...data, [key]: e.target.value })}
                  placeholder={placeholder}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            ))}
          </div>

          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
            <p className="text-sm text-yellow-300">
              ⚡ <strong>Competition Mode:</strong> This creates friendly competition and motivates
              members to share more. Winners are announced automatically!
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function MessageStep({
  data,
  setData,
  templates,
  applyTemplate,
}: {
  data: OnboardingData;
  setData: (data: OnboardingData) => void;
  templates: typeof WELCOME_TEMPLATES;
  applyTemplate: (template: typeof WELCOME_TEMPLATES[0]) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-white mb-2">Welcome Message</h3>
        <p className="text-gray-400">
          This message is sent to every new member explaining how the referral program works.
        </p>
      </div>

      {/* Templates */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">Message Style:</label>
        <div className="grid grid-cols-2 gap-3">
          {templates.map((template) => (
            <button
              key={template.name}
              onClick={() => applyTemplate(template)}
              className="px-4 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-purple-500/50 rounded-lg transition-all text-left"
            >
              <div className="font-medium text-white text-sm">{template.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Message editor */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Your Message:</label>
        <textarea
          value={data.welcomeMessage}
          onChange={(e) => setData({ ...data, welcomeMessage: e.target.value })}
          className="w-full h-64 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500 font-mono text-sm"
          placeholder="Write your welcome message..."
        />
        <p className="text-xs text-gray-500 mt-2">
          Use variables: {'{memberName}'}, {'{creatorName}'}, {'{referralLink}'}
        </p>
      </div>

      <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
        <p className="text-sm text-purple-300">
          💌 <strong>Auto-Send:</strong> This message is sent automatically via Whop DM or email
          when someone joins your community.
        </p>
      </div>
    </div>
  );
}

function ReviewStep({ data, communityName }: { data: OnboardingData; communityName: string }) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-5xl mb-4">✨</div>
        <h3 className="text-2xl font-bold text-white mb-2">Review Your Setup</h3>
        <p className="text-gray-400">
          Everything looks good? Hit "Complete Setup" to activate your referral program!
        </p>
      </div>

      <div className="space-y-4">
        {/* Rewards summary */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <h4 className="font-semibold text-white mb-3">🎁 Reward Tiers</h4>
          <div className="space-y-2 text-sm">
            {[1, 2, 3, 4].map((tier) => (
              <div key={tier} className="flex justify-between text-gray-300">
                <span>{data[`tier${tier}Count` as keyof OnboardingData]} referrals:</span>
                <span className="text-purple-400 font-medium">
                  {data[`tier${tier}Reward` as keyof OnboardingData]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Competition summary */}
        {data.competitionEnabled && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            <h4 className="font-semibold text-white mb-3">🏆 Competition</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-300">
                <span>Period:</span>
                <span className="text-purple-400 font-medium capitalize">
                  {data.competitionTimeframe}
                </span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Prizes:</span>
                <span className="text-purple-400 font-medium">
                  {data.reward1st}, {data.reward2nd}, {data.reward3rd}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Message preview */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <h4 className="font-semibold text-white mb-3">💌 Welcome Message</h4>
          <div className="text-sm text-gray-300 max-h-32 overflow-y-auto whitespace-pre-wrap font-mono">
            {data.welcomeMessage.substring(0, 200)}...
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/20 border border-green-500/30 rounded-xl p-6 text-center">
        <p className="text-green-300 font-medium mb-2">
          🚀 You're all set! Your referral program is ready to launch.
        </p>
        <p className="text-sm text-gray-400">
          Members will automatically get their referral links and start earning 10% commissions.
        </p>
      </div>
    </div>
  );
}
