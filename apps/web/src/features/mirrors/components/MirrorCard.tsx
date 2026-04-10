// frontend/src/features/mirrors/components/MirrorCard.tsx
/**
 * MirrorCard - Display mirror analysis
 */

import { GlassCard } from '@/ui';
import { TrialMirror } from '../types/mirror.types';
import { TrendingUp, AlertCircle, Target } from 'lucide-react';

interface MirrorCardProps {
  mirror: TrialMirror;
}

export function MirrorCard({ mirror }: MirrorCardProps) {
  return (
    <GlassCard className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-bold text-white">
            Дзеркало: День {mirror.day}
          </h3>
          <div className="text-white/60 text-sm">
            {new Date(mirror.createdAt).toLocaleDateString('uk-UA')}
          </div>
        </div>
        <div className="h-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
      </div>

      {/* AI Analysis */}
      <div className="mb-6">
        <h4 className="text-white font-medium mb-3 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-purple-400" />
          Аналіз
        </h4>
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <p className="text-white/90 leading-relaxed whitespace-pre-line">
            {mirror.analysis}
          </p>
        </div>
      </div>

      {/* State Pattern */}
      {mirror.statePattern && (
        <div className="mb-4">
          <h4 className="text-white/70 text-sm mb-2 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Повторюваний стан
          </h4>
          <div className="bg-orange-500/10 rounded-lg p-3 border border-orange-500/30">
            <p className="text-orange-300 text-sm">{mirror.statePattern}</p>
          </div>
        </div>
      )}

      {/* Main Drain */}
      {mirror.mainDrain && (
        <div className="mb-4">
          <h4 className="text-white/70 text-sm mb-2 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Головний злив енергії
          </h4>
          <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/30">
            <p className="text-red-300 text-sm">{mirror.mainDrain}</p>
          </div>
        </div>
      )}

      {/* Sphere Imbalance */}
      {mirror.sphereImbalance && (
        <div>
          <h4 className="text-white/70 text-sm mb-2 flex items-center gap-2">
            <Target className="w-4 h-4" />
            Перекіс у колесі балансу
          </h4>
          <div className="bg-purple-500/10 rounded-lg p-3 border border-purple-500/30">
            <p className="text-purple-300 text-sm">{mirror.sphereImbalance}</p>
          </div>
        </div>
      )}
    </GlassCard>
  );
}
