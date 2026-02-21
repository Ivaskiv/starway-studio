// frontend/src/features/goals/components/PrimaryGoalSelector.tsx
/**
 * PrimaryGoalSelector - Select primary goal from list
 */

import { GlassCard } from '@/ui';
import { CheckCircle, Circle } from 'lucide-react';

interface PrimaryGoalSelectorProps {
  goals: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
}

export function PrimaryGoalSelector({ goals, selectedIndex, onChange }: PrimaryGoalSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="block text-white font-medium mb-3">
        Обери головну ціль (primary goal)
      </label>
      
      {goals.map((goal, index) => (
        <GlassCard
          key={index}
          onClick={() => onChange(index)}
          className={`p-4 cursor-pointer transition-all ${
            selectedIndex === index
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 border-2 border-white'
              : 'hover:border-white/50'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              {selectedIndex === index ? (
                <CheckCircle className="w-6 h-6 text-white" />
              ) : (
                <Circle className="w-6 h-6 text-white/50" />
              )}
            </div>
            <div className="flex-1">
              <div className={`font-medium ${
                selectedIndex === index ? 'text-white' : 'text-white/90'
              }`}>
                {goal}
              </div>
              {selectedIndex === index && (
                <div className="text-white/80 text-sm mt-1">
                  ⭐ Це твоя головна ціль. AI буде перевіряти всі вибори відносно неї.
                </div>
              )}
            </div>
          </div>
        </GlassCard>
      ))}

      <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/10">
        <p className="text-white/70 text-sm">
          💡 <strong>Primary goal</strong> - це ціль №1, на яку ти фокусуєшся. 
          AI буде аналізувати кожен твій вибір: чи веде він до цієї цілі.
        </p>
      </div>
    </div>
  );
}