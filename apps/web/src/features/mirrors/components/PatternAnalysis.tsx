// frontend/src/features/mirrors/components/PatternAnalysis.tsx
/**
 * PatternAnalysis - Analyze patterns from daily entries
 */

import { GlassCard } from '@/ui';
import { BarChart3 } from 'lucide-react';

interface PatternAnalysisProps {
  statePattern: string;
  mainDrain: string;
}

export function PatternAnalysis({ statePattern, mainDrain }: PatternAnalysisProps) {
  return (
    <GlassCard className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-6 h-6 text-purple-400" />
        <h3 className="text-lg font-bold text-white">Аналіз патернів</h3>
      </div>

      <div className="space-y-4">
        {/* State Pattern */}
        <div>
          <div className="text-white/70 text-sm mb-2">Повторюваний стан:</div>
          <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-lg p-3 border border-orange-500/30">
            <p className="text-white font-medium">{statePattern}</p>
          </div>
        </div>

        {/* Main Drain */}
        <div>
          <div className="text-white/70 text-sm mb-2">Головний злив:</div>
          <div className="bg-gradient-to-r from-red-500/20 to-pink-500/20 rounded-lg p-3 border border-red-500/30">
            <p className="text-white font-medium">{mainDrain}</p>
          </div>
        </div>

        {/* Insight */}
        <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/10">
          <p className="text-white/70 text-sm">
            💡 Ці патерни допомагають зрозуміти, що потребує уваги. 
            Система буде враховувати це у рекомендаціях.
          </p>
        </div>
      </div>
    </GlassCard>
  );
}
