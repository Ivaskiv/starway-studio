// frontend/src/features/mirrors/components/ContrastView.tsx
/**
 * ContrastView - Before/After contrast
 */

import { GlassCard } from '@/ui';
import { ArrowRight } from 'lucide-react';

interface ContrastViewProps {
  before: {
    label: string;
    value: string;
  };
  after: {
    label: string;
    value: string;
  };
}

export function ContrastView({ before, after }: ContrastViewProps) {
  return (
    <GlassCard className="p-6">
      <h3 className="text-lg font-bold text-white mb-4">Контраст: До / Після</h3>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Before */}
        <div>
          <div className="text-white/60 text-sm mb-2">{before.label}</div>
          <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/30">
            <p className="text-white">{before.value}</p>
          </div>
        </div>

        {/* Arrow */}
        <div className="hidden md:flex items-center justify-center">
          <ArrowRight className="w-8 h-8 text-purple-400" />
        </div>

        {/* After */}
        <div>
          <div className="text-white/60 text-sm mb-2">{after.label}</div>
          <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/30">
            <p className="text-white">{after.value}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/10">
        <p className="text-white/70 text-sm text-center">
          ✨ Бачиш різницю? Це результат усвідомлених виборів із ментором
        </p>
      </div>
    </GlassCard>
  );
}
