import { GlassCard } from '@/ui/GlassCard';
import { Sparkles, Trophy } from 'lucide-react';
import { LeaderboardItem, TrendingItem } from '../sections/cards';

export function TrendingLegacySection() {
  return (
    <section className="py-16 px-6">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-8">
        <GlassCard className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-2xl font-bold">🔥 Trending Topics</h3>
          </div>

          <div className="space-y-3">
            <TrendingItem rank="#1" title="AI Revolution 2026" stats="12.5K обговорень" />
            <TrendingItem rank="#2" title="React 19 Features" stats="8.3K обговорень" />
            <TrendingItem rank="#3" title="Python Tips & Tricks" stats="6.7K обговорень" />
            <TrendingItem rank="#4" title="DevOps Best Practices" stats="5.2K обговорень" />
            <TrendingItem rank="#5" title="Web3 Development" stats="4.8K обговорень" />
          </div>
        </GlassCard>

        <GlassCard className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-2xl font-bold">🏆 Топ учнів тижня</h3>
          </div>

          <div className="space-y-3">
            <LeaderboardItem rank="👑" name="Максим Петренко" points="1,247" />
            <LeaderboardItem rank="🥈" name="Юлія Бондар" points="1,089" />
            <LeaderboardItem rank="🥉" name="Ігор Грищенко" points="967" />
            <LeaderboardItem rank="4" name="Софія Кравчук" points="834" />
            <LeaderboardItem rank="5" name="Олег Ткаченко" points="792" />
          </div>
        </GlassCard>
      </div>
    </section>
  );
}
