// frontend/src/features/goals/pages/GoalsPage.tsx
/**
 * GoalsPage - Set 5 goals + select primary
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSetGoalsMutation } from '../services/goals.api';
import { GoalsInput } from '../components/GoalsInput';
import { PrimaryGoalSelector } from '../components/PrimaryGoalSelector';
import { Button, GlassCard } from '@/ui';
import { toast } from 'react-hot-toast';
import { Target } from 'lucide-react';

export default function GoalsPage() {
  const navigate = useNavigate();
  const [goals, setGoals] = useState<string[]>(['', '', '', '', '']);
  const [primaryIndex, setPrimaryIndex] = useState(0);
  const [step, setStep] = useState<'input' | 'select'>('input');

  const [setGoalsMutation, { isLoading }] = useSetGoalsMutation();

  const handleNext = () => {
    const filledGoals = goals.filter(g => g.trim().length > 0);
    
    if (filledGoals.length < 3) {
      toast.error('Введи мінімум 3 цілі');
      return;
    }

    setGoals(filledGoals);
    setStep('select');
  };

  const handleSubmit = async () => {
    try {
      await setGoalsMutation({
        goals,
        primaryIndex
      }).unwrap();

      toast.success('Цілі збережено! 🎯');
      navigate('/dashboard/mentor/workspace');
    } catch (error) {
      toast.error('Помилка збереження');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-6">
      <div className="max-w-3xl mx-auto">
        <GlassCard className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <Target className="w-8 h-8 text-purple-400" />
            <div>
              <h1 className="text-3xl font-bold text-white">Визнач цілі</h1>
              <p className="text-white/70">
                {step === 'input' 
                  ? 'Введи 3-5 цілей на найближчий рік'
                  : 'Обери головну ціль'}
              </p>
            </div>
          </div>

          {step === 'input' && (
            <>
              <GoalsInput value={goals} onChange={setGoals} />

              <div className="mt-6 flex justify-end">
                <Button
                  onClick={handleNext}
                  size="lg"
                  disabled={goals.filter(g => g.trim()).length < 3}
                  className="bg-gradient-to-r from-purple-500 to-pink-500"
                >
                  Далі: Обрати головну ціль
                </Button>
              </div>
            </>
          )}

          {step === 'select' && (
            <>
              <PrimaryGoalSelector
                goals={goals}
                selectedIndex={primaryIndex}
                onChange={setPrimaryIndex}
              />

              <div className="mt-6 flex justify-between">
                <Button
                  onClick={() => setStep('input')}
                  variant="ghost"
                >
                  ← Назад
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  size="lg"
                  className="bg-gradient-to-r from-purple-500 to-pink-500"
                >
                  {isLoading ? 'Збереження...' : 'Завершити'}
                </Button>
              </div>
            </>
          )}
        </GlassCard>
      </div>
    </div>
  );
}