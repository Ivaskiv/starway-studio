import { Button } from '@/ui';
import { useNavigate } from 'react-router-dom';

export default function CompletedStep() {
  const navigate = useNavigate();

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-white">Онбординг завершено</h3>
      <p className="text-sm text-white/60">
        Базовий профіль готовий. Тепер AI ментор зможе давати персоналізовані рекомендації.
      </p>
      <div className="flex justify-end">
        <Button type="button" className="gradient-button" onClick={() => navigate('/dashboard/ai-mentor')}>
          Перейти до AI-ментора
        </Button>
      </div>
    </div>
  );
}
