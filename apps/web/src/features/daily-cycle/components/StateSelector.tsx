// frontend/src/features/daily-cycle/components/StateSelector.tsx
/**
 * StateSelector - Choose daily state
 */

import { GlassCard } from '@/ui';
import { DailyState } from '../types/daily.types';

interface StateSelectorProps {
  value: DailyState;
  onChange: (state: DailyState) => void;
}

const STATES: { value: DailyState; label: string; emoji: string; color: string }[] = [
  { value: 'напруга', label: 'Напруга', emoji: '😰', color: 'from-red-500 to-orange-500' },
  { value: 'страх', label: 'Страх', emoji: '😨', color: 'from-purple-500 to-pink-500' },
  { value: 'стабільність', label: 'Стабільність', emoji: '😌', color: 'from-blue-500 to-cyan-500' },
  { value: 'внутрішня опора', label: 'Духовність', emoji: '💪', color: 'from-green-500 to-emerald-500' }
];

export function StateSelector({ value, onChange }: StateSelectorProps) {
  return (
    <div>
      <label className="block text-white font-medium mb-3">Мій стан сьогодні</label>
      <div className="grid grid-cols-2 gap-3">
        {STATES.map((state) => (
          <GlassCard
            key={state.value}
            onClick={() => onChange(state.value)}
            className={`p-4 cursor-pointer transition-all ${
              value === state.value 
                ? `bg-gradient-to-r ${state.color} border-2 border-white` 
                : 'hover:border-white/50'
            }`}
          >
            <div className="text-center">
              <div className="text-4xl mb-2">{state.emoji}</div>
              <div className="text-white font-medium">{state.label}</div>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}