// frontend/src/features/progress/components/Achievements.tsx

import { GlassCard } from '@/ui';
import { Award, Calendar, Target, TrendingUp, Trophy, Zap } from 'lucide-react';

interface Achievement {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  date?: string;
  unlocked: boolean;
}

const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-step',
    icon: Zap,
    title: 'Перший крок',
    description: 'Завершив першу сесію',
    date: '10.01.2026',
    unlocked: true,
  },
  {
    id: 'week-streak',
    icon: Calendar,
    title: 'Тижнева серія',
    description: '7 днів поспіль',
    date: '17.01.2026',
    unlocked: true,
  },
  {
    id: 'goal-achiever',
    icon: Target,
    title: 'Цілеспрямований',
    description: 'Досягнув 5 цілей',
    date: '20.01.2026',
    unlocked: true,
  },
  {
    id: 'month-streak',
    icon: Trophy,
    title: 'Місячна серія',
    description: '30 днів поспіль',
    unlocked: false,
  },
  {
    id: 'balance-master',
    icon: TrendingUp,
    title: 'Майстер балансу',
    description: 'Всі сфери > 7',
    unlocked: false,
  },
  {
    id: 'legend',
    icon: Award,
    title: 'Легенда',
    description: 'Досягнув рівня 10',
    unlocked: false,
  },
];

export default function Achievements() {
  const unlockedCount = ACHIEVEMENTS.filter(a => a.unlocked).length;

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Досягнення</h2>
          <p className="text-white/60 text-sm">
            Відкрито {unlockedCount} з {ACHIEVEMENTS.length}
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent">
            {Math.round((unlockedCount / ACHIEVEMENTS.length) * 100)}%
          </div>
          <p className="text-xs text-white/40">Прогрес</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ACHIEVEMENTS.map(achievement => {
          const Icon = achievement.icon;
          return (
            <div
              key={achievement.id}
              className={`relative p-4 rounded-xl border transition-all ${
                achievement.unlocked
                  ? 'bg-gradient-to-br from-orange-500/10 to-pink-500/10 border-orange-500/30'
                  : 'bg-white/5 border-white/10 grayscale opacity-50'
              }`}
            >
              {/* Icon */}
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${
                  achievement.unlocked
                    ? 'bg-gradient-to-br from-orange-500 to-pink-500'
                    : 'bg-white/10'
                }`}
              >
                <Icon className="w-6 h-6 text-white" />
              </div>

              {/* Content */}
              <h3 className="text-white font-semibold mb-1">{achievement.title}</h3>
              <p className="text-white/60 text-sm mb-2">{achievement.description}</p>

              {/* Date */}
              {achievement.date && <p className="text-xs text-orange-400">{achievement.date}</p>}

              {/* Lock overlay */}
              {!achievement.unlocked && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-white/60"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
