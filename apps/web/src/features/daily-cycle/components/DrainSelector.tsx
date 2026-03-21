// frontend/src/features/daily-cycle/components/DrainSelector.tsx
/**
 * DrainSelector - Choose energy drain
 */

import { GlassCard } from '@/ui';
import { DailyDrain } from '../types/daily.types';

interface DrainSelectorProps {
  value?: DailyDrain;
  onChange: (drain: DailyDrain | undefined) => void;
}

const DRAINS: { value: DailyDrain; label: string; emoji: string }[] = [
  { value: 'сумнів', label: 'Сумнів', emoji: '🤔' },
  { value: 'прокрастинація', label: 'Прокрастинація', emoji: '⏰' },
  { value: 'емоційний злив', label: 'Емоційний злив', emoji: '😢' },
  { value: 'зовнішній тиск', label: 'Зовнішній тиск', emoji: '⚡' }
];

export function DrainSelector({ value, onChange }: DrainSelectorProps) {
  return (
    <div>
      <label className="block text-white font-medium mb-3">
        Що забирало енергію? (опціонально)
      </label>
      <div className="grid grid-cols-2 gap-3">
        {DRAINS.map((drain) => (
          <GlassCard
            key={drain.value}
            onClick={() => onChange(value === drain.value ? undefined : drain.value)}
            className={`p-3 cursor-pointer transition-all ${
              value === drain.value 
                ? 'bg-gradient-to-r from-orange-500 to-red-500 border-2 border-white' 
                : 'hover:border-white/50'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl">{drain.emoji}</span>
              <span className="text-white text-sm">{drain.label}</span>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}