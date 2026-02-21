// frontend/src/features/ai-mentor/components/MentorHeader.tsx
/**
 * MentorHeader - Trial/Paid status indicator
 */

import { GlassCard } from '@/ui';
import { Sparkles, Clock } from 'lucide-react';

interface MentorHeaderProps {
  level: 'none' | 'trial' | 'paid';
  isOnboarding: boolean;
  progress: number;
}

export default function MentorHeader({ level, isOnboarding, progress }: MentorHeaderProps) {
  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-purple-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">AI-Ментор</h1>
            <p className="text-white/60 text-sm">
              {level === 'trial' && `Trial • ${7 - Math.floor(progress / 14)} днів залишилось`}
              {level === 'paid' && 'Повний доступ'}
            </p>
          </div>
        </div>

        {isOnboarding && (
          <div className="flex items-center gap-2 text-white/70">
            <Clock className="w-5 h-5" />
            <span className="text-sm">Онбординг: {progress}%</span>
          </div>
        )}
      </div>

      {isOnboarding && (
        <div className="mt-4 h-2 bg-white/10 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </GlassCard>
  );
}