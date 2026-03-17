// frontend/src/features/daily-cycle/components/DailyCycleForm.tsx
/**
 * DailyCycleForm - Main daily entry form
 */

import { useState } from 'react';
import { StateSelector } from './StateSelector';
import { DrainSelector } from './DrainSelector';
import { ChoiceSelector } from './ChoiceSelector';
import { Button, GlassCard, Textarea } from '@/ui';
import { toast } from 'react-hot-toast';

import {
  DailyState,
  DailyChoice,
  DailyDrain
} from '../types/daily.types';

import { useSubmitDailyCycleMutation } from '../services/daily.api';

interface DailyCycleFormProps {
  onComplete?: () => void;
}

export function DailyCycleForm({ onComplete }: DailyCycleFormProps) {
  const [state, setState] = useState<DailyState>('стабільність');
  const [drain, setDrain] = useState<DailyDrain | undefined>();
  const [choice, setChoice] = useState<DailyChoice>('обрала нове');
  const [dayFact, setDayFact] = useState('');

  const [submitDailyCycle, { isLoading }] = useSubmitDailyCycleMutation();

  const handleSubmit = async () => {
    if (!dayFact.trim()) {
      toast.error('Опиши факт дня (1-2 речення)');
      return;
    }

    try {
      await submitDailyCycle({
        state,
        drain,
        choice,
        dayFact: dayFact.trim()
      }).unwrap();

      toast.success('Запис збережено');

      setState('стабільність');
      setDrain(undefined);
      setChoice('обрала нове');
      setDayFact('');

      onComplete?.();
    } catch {
      toast.error('Помилка збереження');
    }
  };

  return (
    <div className="daily-form">
      <GlassCard className="daily-form__card">
        <h2 className="daily-form__title">
          Щоденний цикл
        </h2>

        <div className="daily-form__section">
          <StateSelector value={state} onChange={setState} />
        </div>

        <div className="daily-form__section">
          <DrainSelector value={drain} onChange={setDrain} />
        </div>

        <div className="daily-form__section">
          <ChoiceSelector value={choice} onChange={setChoice} />
        </div>

        <div className="daily-form__section">
          <label className="daily-form__label">
            Факт дня (1-2 речення)
          </label>

          <Textarea
            value={dayFact}
            onChange={(e) => setDayFact(e.target.value)}
            placeholder="Що відбулося сьогодні важливого?"
            rows={4}
            maxLength={300}
            className="daily-form__textarea"
          />

          <div className="daily-form__counter">
            {dayFact.length}/300
          </div>
        </div>

        <div className="daily-form__actions">
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !dayFact.trim()}
            size="lg"
          >
            {isLoading ? 'Збереження...' : 'Зберегти запис'}
          </Button>
        </div>
      </GlassCard>

      <GlassCard className="daily-form__info">
        <div className="daily-form__info-text">
          <p><strong>Стан:</strong> Як ти себе відчуваєш зараз</p>
          <p><strong>Злив:</strong> Що забирало енергію протягом дня</p>
          <p><strong>Вибір:</strong> Старий патерн чи нова дія</p>
          <p><strong>Факт дня:</strong> Головна подія або інсайт</p>
        </div>
      </GlassCard>
    </div>
  );
}