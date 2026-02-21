// features/ai-mentor/components/OnboardingFlow/steps/VisionStep.tsx
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Button, Textarea } from '@/ui';
import { useSubmitOnboardingAnswerMutation } from '@/features/ai-mentor/services/mentor.api';

export default function VisionStep() {
  const [value, setValue] = useState('');
  const [submit, { isLoading }] = useSubmitOnboardingAnswerMutation();

  const onSubmit = async () => {
    const answer = value.trim();
    if (answer.length < 30) {
      toast.error('Додай трохи більше конкретики (мінімум 30 символів).');
      return;
    }

    await submit({ stage: 'vision', answer }).unwrap();
    toast.success('Бачення збережено. Переходимо до цілі.');
    setValue('');
  };

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-white">
        Почнемо з бачення
      </h3>

      <p className="text-sm text-white/60">
        Опиши, ким ти хочеш стати через 1 рік.
        Без фільтрів. AI підлаштується.
      </p>

      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={5}
        className="w-full glass-field"
        placeholder="Наприклад: через 1 рік я веду 2 програми, маю стабільний дохід 3000€+, працюю зі спокою та системності..."
      />

      <div className="flex justify-end">
        <Button
          type="button"
          onClick={onSubmit}
          disabled={isLoading || value.trim().length < 30}
          className="gradient-button"
        >
          {isLoading ? 'Збереження...' : 'Зберегти і далі'}
        </Button>
      </div>
    </div>
  );
}
