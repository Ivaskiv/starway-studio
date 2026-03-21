import { useState } from 'react';
import toast from 'react-hot-toast';
import { Button, Textarea } from '@/ui';
import { useSubmitOnboardingAnswerMutation } from '@/features/ai-mentor/services/mentor.api';

export default function ContextStep() {
  const [value, setValue] = useState('');
  const [submit, { isLoading }] = useSubmitOnboardingAnswerMutation();

  const onSubmit = async () => {
    const answer = value.trim();
    if (answer.length < 20) {
      toast.error('Додай ключові обмеження та ризики.');
      return;
    }

    await submit({ stage: 'context', answer }).unwrap();
    toast.success('Контекст збережено. Онбординг завершено.');
    setValue('');
  };

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-white">Контекст і обмеження</h3>
      <p className="text-sm text-white/60">
        Додай поточні обставини: час, ресурси, ризики і ключові перешкоди. Це потрібно для реалістичного плану.
      </p>

      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={4}
        className="w-full glass-field"
        placeholder="Наприклад: можу виділяти 1.5 години щодня, є 1 асистент, ризик — нестабільний графік і вигорання."
      />

      <div className="flex justify-end">
        <Button
          type="button"
          onClick={onSubmit}
          disabled={isLoading || value.trim().length < 20}
          className="gradient-button"
        >
          {isLoading ? 'Збереження...' : 'Завершити онбординг'}
        </Button>
      </div>
    </div>
  );
}
