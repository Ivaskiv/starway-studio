// frontend/src/features/daily-cycle/components/DailyCycleForm.tsx
/**
 * DailyCycleForm - Main daily entry form
 */

import { useState } from 'react';
import { useSubmitDailyCycleMutation } from '../services/daily.api';
import { StateSelector } from './StateSelector';
import { DrainSelector } from './DrainSelector';
import { ChoiceSelector } from './ChoiceSelector';
import { Button, GlassCard, Textarea } from '@/ui';
import { toast } from 'react-hot-toast';
import { DailyState, DailyChoice, DailyDrain } from '../types/daily.types';

interface DailyCycleFormProps {
  onComplete?: () => void;
}

export function DailyCycleForm({ onComplete }: DailyCycleFormProps) {
  const [state, setState] = useState<DailyState>('стабільність');
  const [drain, setDrain] = useState<DailyDrain | undefined>();
  const [choice, setChoice] = useState<DailyChoice>('обрала нове');
  const [dayFact, setDayFact] = useState('');

  const [submitDaily, { isLoading }] = useSubmitDailyCycleMutation();

  const handleSubmit = async () => {
    if (!dayFact.trim()) {
      toast.error('Опиши факт дня (1-2 речення)');
      return;
    }

    try {
      await submitDaily({
        state,
        drain,
        choice,
        dayFact: dayFact.trim()
      }).unwrap();

      toast.success('Запис збережено! 🎉');
      
      // Reset form
      setState('стабільність');
      setDrain(undefined);
      setChoice('обрала нове');
      setDayFact('');

      onComplete?.();
    } catch (error) {
      toast.error('Помилка збереження');
    }
  };

  return (
    <div className="space-y-6">
      <GlassCard className="p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Щоденний цикл</h2>

        {/* State */}
        <div className="mb-6">
          <StateSelector value={state} onChange={setState} />
        </div>

        {/* Drain */}
        <div className="mb-6">
          <DrainSelector value={drain} onChange={setDrain} />
        </div>

        {/* Choice */}
        <div className="mb-6">
          <ChoiceSelector value={choice} onChange={setChoice} />
        </div>

        {/* Day Fact */}
        <div className="mb-6">
          <label className="block text-white font-medium mb-3">
            Факт дня (1-2 речення)
          </label>
          <Textarea
            value={dayFact}
            onChange={(e) => setDayFact(e.target.value)}
            placeholder="Що відбулось сьогодні важливого? Яка була головна подія дня?"
            rows={4}
            className="w-full"
            maxLength={300}
          />
          <div className="text-right text-white/50 text-xs mt-1">
            {dayFact.length}/300
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !dayFact.trim()}
            size="lg"
            className="bg-gradient-to-r from-purple-500 to-pink-500"
          >
            {isLoading ? 'Збереження...' : 'Зберегти запис'}
          </Button>
        </div>
      </GlassCard>

      {/* Info Card */}
      <GlassCard className="p-4">
        <div className="text-white/70 text-sm space-y-2">
          <p>💡 <strong>Стан:</strong> Як ти себе відчуваєш зараз</p>
          <p>⚡ <strong>Злив:</strong> Що забирало енергію протягом дня</p>
          <p>✨ <strong>Вибір:</strong> Чи підтримуєш старі патерни або обираєш нове</p>
          <p>📝 <strong>Факт дня:</strong> Головна подія або інсайт</p>
        </div>
      </GlassCard>
    </div>
  );
}