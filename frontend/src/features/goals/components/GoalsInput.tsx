// frontend/src/features/goals/components/GoalsInput.tsx
/**
 * GoalsInput - Input 5 goals
 */

import { useState } from 'react';
import { Button, GlassCard, Input } from '@/ui';
import { Plus, X } from 'lucide-react';

interface GoalsInputProps {
  value: string[];
  onChange: (goals: string[]) => void;
  maxGoals?: number;
}

export function GoalsInput({ value, onChange, maxGoals = 5 }: GoalsInputProps) {
  const handleAdd = () => {
    if (value.length < maxGoals) {
      onChange([...value, '']);
    }
  };

  const handleChange = (index: number, text: string) => {
    const updated = [...value];
    updated[index] = text;
    onChange(updated);
  };

  const handleRemove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {value.map((goal, index) => (
        <GlassCard key={index} className="p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0">
            {index + 1}
          </div>
          <Input
            value={goal}
            onChange={(e) => handleChange(index, e.target.value)}
            placeholder="Введи ціль (SMART: конкретна, вимірна, досяжна)"
            className="flex-1"
            maxLength={200}
          />
          {value.length > 1 && (
            <Button
              onClick={() => handleRemove(index)}
              variant="ghost"
              size="sm"
              className="text-white/50 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </GlassCard>
      ))}

      {value.length < maxGoals && (
        <Button
          onClick={handleAdd}
          variant="outline"
          size="sm"
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Додати ціль ({value.length}/{maxGoals})
        </Button>
      )}
    </div>
  );
}