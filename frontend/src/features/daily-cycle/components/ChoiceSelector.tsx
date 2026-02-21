// frontend/src/features/daily-cycle/components/ChoiceSelector.tsx
/**
 * ChoiceSelector - Choose daily choice
 */

import { GlassCard } from '@/ui';
import { DailyChoice } from '../types/daily.types';

interface ChoiceSelectorProps {
  value: DailyChoice;
  onChange: (choice: DailyChoice) => void;
}

const CHOICES: { value: DailyChoice; label: string; emoji: string; color: string }[] = [
  { 
    value: 'підтверджувала старе', 
    label: 'Підтверджувала старе', 
    emoji: '🔁', 
    color: 'from-gray-500 to-slate-500' 
  },
  { 
    value: 'обрала нове', 
    label: 'Обрала нове', 
    emoji: '✨', 
    color: 'from-purple-500 to-pink-500' 
  }
];

export function ChoiceSelector({ value, onChange }: ChoiceSelectorProps) {
  return (
    <div>
      <label className="block text-white font-medium mb-3">Мій вибір сьогодні</label>
      <div className="grid grid-cols-2 gap-3">
        {CHOICES.map((choice) => (
          <GlassCard
            key={choice.value}
            onClick={() => onChange(choice.value)}
            className={`p-4 cursor-pointer transition-all ${
              value === choice.value 
                ? `bg-gradient-to-r ${choice.color} border-2 border-white` 
                : 'hover:border-white/50'
            }`}
          >
            <div className="text-center">
              <div className="text-3xl mb-2">{choice.emoji}</div>
              <div className="text-white text-sm">{choice.label}</div>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}