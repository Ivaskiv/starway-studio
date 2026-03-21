// frontend/src/features/trial/components/TrialStatus.tsx
/**
 * TrialStatus - Display trial countdown
 */

import { GlassCard } from '@/ui';
import { Clock, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/ui';

interface TrialStatusProps {
  daysLeft: number;
  isActive: boolean;
}

export function TrialStatus({ daysLeft, isActive }: TrialStatusProps) {
  const navigate = useNavigate();

  if (!isActive) return null;

  return (
    <GlassCard className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-orange-400" />
          <div>
            <div className="text-white font-medium">Trial активний</div>
            <div className="text-white/60 text-sm">
              {daysLeft} {daysLeft === 1 ? 'день' : 'днів'} залишилось
            </div>
          </div>
        </div>

        {daysLeft <= 2 && (
          <Button
            onClick={() => navigate('/subscription')}
            size="sm"
            className="bg-gradient-to-r from-purple-500 to-pink-500"
          >
            <Zap className="w-4 h-4 mr-1" />
            Оформити підписку
          </Button>
        )}
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-2 bg-white/10 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-orange-500 to-red-500"
          style={{ width: `${(daysLeft / 7) * 100}%` }}
        />
      </div>
    </GlassCard>
  );
}