'use client';

import { useEffect, useState } from 'react';
import { CommunityCard } from '../../components/discover/community-card';
import { TrendingUp, Users, DollarSign } from 'lucide-react';

interface Community {
  id: string;
  name: string;
  productId: string;
  memberCount: number;
  totalReferrals: number;
  avgEarnings: number;
  topEarner: { earnings: number; referrals: number } | null;
}

export default function DiscoverPage() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/discover/communities')
      .then(res => res.json())
      .then(data => {
        setCommunities(data.communities || []);
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Failed to load communities:', error);
        setIsLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-b from-purple-900/30 via-purple-900/10 to-[#0F0F0F] border-b border-purple-500/20">
        {/* Animated background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-purple-600/20 rounded-full blur-3xl animate-pulse"></div>

        <div className="max-w-7xl mx-auto px-4 py-20 sm:py-32 text-center relative z-10">
          <div className="inline-flex items-center justify-center w-20 h-20 mb-8 animate-pulse">
            <img
              src="/logo.png"
              alt="Referral Flywheel Logo"
              className="w-20 h-20 shadow-2xl shadow-purple-600/50"
            />
          </div>

          <h1 className="text-6xl sm:text-7xl font-bold mb-8 leading-tight">
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent animate-in fade-in duration-700">
              Turn Your Community
            </span>
            <br />
            <span className="text-white animate-in fade-in duration-700 delay-200">
              Into a Referral Engine
            </span>
          </h1>

          <p className="text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed animate-in fade-in duration-700 delay-300">
            Every member becomes an automatic affiliate earning <span className="text-green-400 font-bold">10% lifetime commissions</span>.
            Join thriving communities and start earning today.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12 animate-in fade-in duration-700 delay-500">
            <div className="bg-gradient-to-br from-purple-900/40 to-purple-900/20 border border-purple-500/30 rounded-xl p-8 hover:border-purple-500/50 transition-all duration-300 hover:scale-105 group">
              <div className="flex items-center justify-center mb-3 transform group-hover:scale-110 transition-transform">
                <div className="p-3 bg-purple-500/20 rounded-xl border border-purple-500/30">
                  <Users className="w-8 h-8 text-purple-300" />
                </div>
              </div>
              <p className="text-4xl font-bold text-white mb-2">1,000+</p>
              <p className="text-sm text-gray-400 font-medium">Referrals Made</p>
            </div>

            <div className="bg-gradient-to-br from-green-900/40 to-green-900/20 border border-green-500/30 rounded-xl p-8 hover:border-green-500/50 transition-all duration-300 hover:scale-105 group">
              <div className="flex items-center justify-center mb-3 transform group-hover:scale-110 transition-transform">
                <div className="p-3 bg-green-500/20 rounded-xl border border-green-500/30">
                  <DollarSign className="w-8 h-8 text-green-300" />
                </div>
              </div>
              <p className="text-4xl font-bold text-white mb-2">$500+</p>
              <p className="text-sm text-gray-400 font-medium">Avg Monthly Earnings</p>
            </div>

            <div className="bg-gradient-to-br from-yellow-900/40 to-yellow-900/20 border border-yellow-500/30 rounded-xl p-8 hover:border-yellow-500/50 transition-all duration-300 hover:scale-105 group">
              <div className="flex items-center justify-center mb-3 transform group-hover:scale-110 transition-transform">
                <div className="p-3 bg-yellow-500/20 rounded-xl border border-yellow-500/30">
                  <TrendingUp className="w-8 h-8 text-yellow-300" />
                </div>
              </div>
              <p className="text-4xl font-bold text-white mb-2">10%</p>
              <p className="text-sm text-gray-400 font-medium">Lifetime Commission</p>
            </div>
          </div>

          {/* Primary CTA */}
          <div className="flex gap-4 justify-center animate-in fade-in duration-700 delay-700">
            <a
              href="https://whop.com/apps"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl font-bold text-lg transition-all duration-300 shadow-2xl shadow-purple-600/50 hover:shadow-purple-600/70 hover:scale-105"
            >
              Get Started Free →
            </a>
            <a
              href="#communities"
              className="px-8 py-4 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 hover:border-gray-600 rounded-xl font-bold text-lg transition-all duration-300 backdrop-blur"
            >
              Browse Communities
            </a>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="max-w-7xl mx-auto px-4 py-24">
        <div className="flex items-center justify-center gap-3 mb-16">
          <div className="w-1 h-10 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
          <h2 className="text-4xl font-bold text-center">How It Works</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
          {/* Connecting line (hidden on mobile) */}
          <div className="hidden md:block absolute top-8 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 opacity-30"></div>

          <div className="text-center relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 text-white font-bold flex items-center justify-center text-2xl mx-auto mb-6 shadow-2xl shadow-purple-600/50 relative z-10 hover:scale-110 transition-transform">
              1
            </div>
            <h3 className="text-2xl font-bold mb-3 text-white">Get Your Link</h3>
            <p className="text-gray-400 leading-relaxed text-lg">
              Join a community and instantly receive your unique referral link
            </p>
          </div>

          <div className="text-center relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 text-white font-bold flex items-center justify-center text-2xl mx-auto mb-6 shadow-2xl shadow-purple-600/50 relative z-10 hover:scale-110 transition-transform">
              2
            </div>
            <h3 className="text-2xl font-bold mb-3 text-white">Share & Invite</h3>
            <p className="text-gray-400 leading-relaxed text-lg">
              Share your link with friends, on social media, or anywhere online
            </p>
          </div>

          <div className="text-center relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 text-white font-bold flex items-center justify-center text-2xl mx-auto mb-6 shadow-2xl shadow-purple-600/50 relative z-10 hover:scale-110 transition-transform">
              3
            </div>
            <h3 className="text-2xl font-bold mb-3 text-white">Earn Forever</h3>
            <p className="text-gray-400 leading-relaxed text-lg">
              Get <span className="text-green-400 font-semibold">10% commission</span> every month for the lifetime of your referrals
            </p>
          </div>
        </div>
      </div>

      {/* Communities Browser */}
      <div id="communities" className="max-w-7xl mx-auto px-4 py-24 scroll-mt-20">
        <div className="flex items-center justify-center gap-3 mb-16">
          <div className="w-1 h-10 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full"></div>
          <h2 className="text-4xl font-bold text-center">Browse Communities</h2>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-8 animate-pulse">
                <div className="h-7 bg-gray-800 rounded-lg mb-6 w-3/4"></div>
                <div className="h-5 bg-gray-800 rounded mb-3 w-1/2"></div>
                <div className="h-5 bg-gray-800 rounded mb-3 w-full"></div>
                <div className="h-12 bg-gray-800 rounded-lg mt-6"></div>
              </div>
            ))}
          </div>
        ) : communities.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {communities.map(community => (
              <CommunityCard key={community.id} {...community} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-[#1A1A1A] border border-gray-800 rounded-xl">
            <div className="text-5xl mb-4">🚀</div>
            <p className="text-xl text-gray-300 mb-2 font-semibold">No communities available yet</p>
            <p className="text-sm text-gray-500">Check back soon for new communities to join!</p>
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <div className="relative overflow-hidden bg-gradient-to-br from-purple-900/30 via-pink-900/20 to-purple-900/30 border-t border-purple-500/30">
        {/* Animated background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-3xl"></div>

        <div className="max-w-7xl mx-auto px-4 py-24 text-center relative z-10">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-purple-600/20 border border-purple-500/30 text-purple-300 font-semibold text-sm mb-8">
              🚀 Join the Referral Revolution
            </div>
          </div>
          <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
            Ready to Start Earning?
          </h2>
          <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
            Join a community above or create your own referral program for your community.<br />
            <span className="text-green-400 font-semibold">Start earning passive income today</span>.
          </p>
          <div className="flex gap-6 justify-center flex-wrap">
            <a
              href="https://whop.com/apps"
              target="_blank"
              rel="noopener noreferrer"
              className="px-10 py-5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl font-bold text-lg transition-all duration-300 shadow-2xl shadow-purple-600/50 hover:shadow-purple-600/70 hover:scale-105"
            >
              Install on Whop →
            </a>
            <a
              href="#communities"
              className="px-10 py-5 bg-gray-800/80 hover:bg-gray-800 border-2 border-gray-700 hover:border-gray-600 rounded-xl font-bold text-lg transition-all duration-300 backdrop-blur"
            >
              Browse Communities
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
