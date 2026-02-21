import { useState } from 'react';
import toast from 'react-hot-toast';
import { Button, Textarea } from '@/ui';
import { useSubmitOnboardingAnswerMutation } from '@/features/ai-mentor/services/mentor.api';

export default function GoalStep() {
  const [value, setValue] = useState('');
  const [submit, { isLoading }] = useSubmitOnboardingAnswerMutation();

  const onSubmit = async () => {
    const answer = value.trim();
    if (answer.length < 20) {
      toast.error('Сформулюй ціль більш конкретно.');
      return;
    }

    await submit({ stage: 'goal', answer }).unwrap();
    toast.success('Ціль збережено. Тепер контекст і обмеження.');
    setValue('');
  };

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-white">Уточни ціль</h3>
      <p className="text-sm text-white/60">
        Сформулюй конкретний результат на найближчі 90 днів: що саме має змінитись і як це виміряти.
      </p>

      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={4}
        className="w-full glass-field"
        placeholder="Приклад: за 90 днів запустити 1 AI-воронку, отримати 30 заявок і 10 оплат."
      />

      <div className="flex justify-end">
        <Button
          type="button"
          onClick={onSubmit}
          disabled={isLoading || value.trim().length < 20}
          className="gradient-button"
        >
          {isLoading ? 'Збереження...' : 'Зберегти і далі'}
        </Button>
      </div>
    </div>
  );
}
