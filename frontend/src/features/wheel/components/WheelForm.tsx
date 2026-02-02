import { ChevronLeft, ChevronRight, Loader2, Sparkles } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

import { useSaveWheelMutation } from '@/services';
import { Button, Input } from '@/ui';
import { WheelChart } from './WheelChart';
import { WHEEL_CATEGORIES } from '@/features/wheel/types/wheel.types';

const TOTAL_CATEGORIES = WHEEL_CATEGORIES.length;

interface WheelFormProps {
  onComplete?: (assessmentId: string) => void;
  onCancel?: () => void;
}

export const WheelForm = ({ onComplete, onCancel }: WheelFormProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scores, setScores] = useState(
    WHEEL_CATEGORIES.map(cat => ({ category_id: cat.id, score: 5 })),
  );

  const [saveWheel, { isLoading: isSubmitting }] = useSaveWheelMutation();

  const currentCategory = WHEEL_CATEGORIES[currentIndex];
  const currentScore = scores.find(s => s.category_id === currentCategory.id)?.score ?? 5;

  const progress = ((currentIndex + 1) / TOTAL_CATEGORIES) * 100;
  const isFirstStep = currentIndex === 0;
  const isLastStep = currentIndex === TOTAL_CATEGORIES - 1;

  const setScore = (value: number) => {
    setScores(prev =>
      prev.map(s => (s.category_id === currentCategory.id ? { ...s, score: value } : s)),
    );
  };

  const goToStep = (index: number) => {
    if (index >= 0 && index < TOTAL_CATEGORIES) setCurrentIndex(index);
  };

  const nextStep = () => {
    if (!isLastStep) setCurrentIndex(p => p + 1);
  };

  const prevStep = () => {
    if (!isFirstStep) setCurrentIndex(p => p - 1);
  };

  const handleSubmit = async () => {
    try {
      const result = await saveWheel({ scores }).unwrap();
      toast.success('Колесо балансу збережено! +100 XP 🎯');
      onComplete?.(result.id);
    } catch {
      toast.error('Помилка збереження');
    }
  };

  const handleNext = () => {
    if (isLastStep) handleSubmit();
    else nextStep();
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
            style={{ backgroundColor: `${currentCategory.color}20` }}
          >
            {currentCategory.emoji}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{currentCategory.name}</h2>
            <p className="text-sm text-white/60">
              Крок {currentIndex + 1} з {TOTAL_CATEGORIES}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${progress}%`,
              background: `linear-gradient(90deg, ${currentCategory.color}, #8B5CF6)`,
            }}
          />
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        {WHEEL_CATEGORIES.map((cat, i) => {
          const score = scores.find(s => s.category_id === cat.id)?.score ?? 5;

          const isActive = i === currentIndex;
          const isPast = i < currentIndex;

          return (
            <Button
              key={cat.id}
              type="button"
              onClick={() => goToStep(i)}
              className={`
                flex-shrink-0 px-3 py-2 rounded-xl text-sm transition-all
                ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : isPast
                      ? 'bg-white/5 text-white/60'
                      : 'bg-white/5 text-white/40'
                }
              `}
            >
              <span className="mr-1">{cat.emoji}</span>
              <span className="font-medium">{score}</span>
            </Button>
          );
        })}
      </div>

      {/* Content */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Left */}
        <div key={currentIndex} className="space-y-6 transition-opacity duration-200">
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Як ти оцінюєш цю сферу?</h3>
            <p className="text-sm text-white/60">1 = Потребує уваги • 10 = Повністю задоволений</p>
          </div>

          {/* Score */}
          <div className="text-center py-4">
            <span
              key={currentScore}
              className="text-7xl font-bold transition-all duration-200 inline-block"
              style={{ color: currentCategory.color }}
            >
              {currentScore}
            </span>
          </div>

          {/* Slider */}
          <div className="space-y-4">
            <Input
              type="range"
              min="1"
              max="10"
              value={currentScore}
              onChange={e => setScore(Number(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(
                  to right,
                  ${currentCategory.color} 0%,
                  ${currentCategory.color} ${(currentScore - 1) * 11.1}%,
                  rgba(255,255,255,0.1) ${(currentScore - 1) * 11.1}%,
                  rgba(255,255,255,0.1) 100%
                )`,
              }}
            />

            <div className="flex justify-between text-xs text-white/40">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                <Button
                  key={n}
                  onClick={() => setScore(n)}
                  className={`w-6 h-6 rounded-full transition-all ${
                    n === currentScore ? 'bg-white/20 text-white' : 'hover:bg-white/10'
                  }`}
                >
                  {n}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center justify-center">
          <WheelChart
            scores={scores}
            size={280}
            interactive
            onCategoryClick={id => {
              const idx = WHEEL_CATEGORIES.findIndex(c => c.id === id);
              if (idx >= 0) goToStep(idx);
            }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between mt-8 pt-6 border-t border-white/10">
        <Button
          type="button"
          onClick={isFirstStep ? onCancel : prevStep}
          disabled={isFirstStep && !onCancel}
          variant="ghost"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium"
        >
          <ChevronLeft className="w-5 h-5" />
          {isFirstStep ? 'Скасувати' : 'Назад'}
        </Button>

        <Button
          type="button"
          onClick={handleNext}
          disabled={isSubmitting}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-white transition-transform hover:scale-105"
          style={{
            background: `linear-gradient(135deg, ${currentCategory.color}, #8B5CF6)`,
            boxShadow: `0 10px 30px -10px ${currentCategory.color}80`,
          }}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Збереження...
            </>
          ) : isLastStep ? (
            <>
              <Sparkles className="w-5 h-5" />
              Завершити
            </>
          ) : (
            <>
              Далі
              <ChevronRight className="w-5 h-5" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default WheelForm;
