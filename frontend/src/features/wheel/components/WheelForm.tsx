import { useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

import { useAppSelector } from '@/app/hooks';
import { useCreateWheelAssessmentMutation } from '@/features/wheel/api';
import { WHEEL_CATEGORIES } from '@/features/wheel/types/wheel.types';
import { Button } from '@/ui/Button';

import { ResultView } from './ResultView';
import { SphereSlider } from './SphereSlider';
import { StepCard } from './StepCard';
import { wheelToast } from './Toast';
import { WheelChart } from './WheelChart';
import { useWheelFlowState } from '../hooks/useWheelFlowState';

interface WheelFormProps {
  userId?: string;
  onComplete?: (assessmentId: string) => void;
  onCancel?: () => void;
}

export const WheelForm = ({ userId, onComplete, onCancel }: WheelFormProps) => {
  const authUserId = useAppSelector((state) => state.auth.user?.id);
  const resolvedUserId = userId || authUserId || '';
  const MAX_GENERATIONS = 3;

  const {
    step,
    setStep,
    spheres,
    activeSphere,
    activeSphereIndex,
    generationsUsed,
    setGenerationsUsed,
    isResultStep,
    isIntroStep,
    canProceed,
    setScore,
    setComment,
    restart,
  } = useWheelFlowState();

  const [saveWheel, { isLoading }] = useCreateWheelAssessmentMutation();

  const stepLabel = useMemo(() => {
    if (step === 0) return 'Крок 0 із 9';
    if (step === 9) return 'Крок 9 із 9';
    return `Крок ${step} із 9`;
  }, [step]);

  const handleNext = useCallback(() => {
    if (!canProceed) {
      wheelToast.error('scoreRequired');
      return;
    }
    setStep((prev) => Math.min(9, prev + 1));
  }, [canProceed, setStep]);

  const handlePrev = useCallback(() => {
    if (step === 0) {
      onCancel?.();
      return;
    }
    setStep((prev) => Math.max(0, prev - 1));
  }, [onCancel, setStep, step]);

  const handleGenerate = useCallback(async () => {
    if (!resolvedUserId) {
      wheelToast.error('missingUser');
      return;
    }
    if (generationsUsed >= MAX_GENERATIONS) {
      wheelToast.error('limitReached');
      return;
    }

    try {
      const result = await saveWheel({
        userId: resolvedUserId,
        scores: spheres.map((item) => ({
          categoryId: item.categoryId,
          score: item.score ?? 1,
          comment: item.comment || undefined,
        })),
      }).unwrap();

      setGenerationsUsed((prev) => prev + 1);
      wheelToast.success('saved');
      onComplete?.(result.id);
    } catch (error: any) {
      const apiMessage = error?.data?.error || error?.error;
      wheelToast.error('saveError', apiMessage ? String(apiMessage) : undefined);
    }
  }, [resolvedUserId, generationsUsed, saveWheel, spheres, setGenerationsUsed, onComplete]);

  return (
    <div className="mx-auto max-w-[440px] space-y-4 p-4">
      <p className="text-center text-xs uppercase tracking-[0.16em] text-white/45">{stepLabel}</p>

      <StepCard
        key={step}
        title={isIntroStep ? 'Колесо балансу' : isResultStep ? 'Результат' : WHEEL_CATEGORIES[activeSphereIndex]?.nameUk || 'Сфера'}
        subtitle={isIntroStep ? '8 сфер життя • оцінка від 1 до 10 • короткий контекст' : undefined}
      >
        {isIntroStep ? (
          <div className="space-y-4">
            <WheelChart scores={spheres} size={280} />
            <p className="text-sm text-white/75">
              Пройдіть 8 сфер по черзі. Для кожної сфери поставте оцінку та коротко опишіть причину.
            </p>
            <Button onClick={handleNext} fullWidth>
              Почати
            </Button>
          </div>
        ) : null}

        {!isIntroStep && !isResultStep && activeSphere ? (
          <SphereSlider
            title={WHEEL_CATEGORIES[activeSphereIndex]?.nameUk || 'Сфера'}
            description="1 = потребує уваги • 10 = стабільно"
            score={activeSphere.score}
            comment={activeSphere.comment}
            onScoreChange={(value) => setScore(activeSphereIndex, value)}
            onCommentChange={(value) => setComment(activeSphereIndex, value)}
          />
        ) : null}

        {isResultStep ? (
          <ResultView
            scores={spheres}
            generationsUsed={generationsUsed}
            maxGenerations={MAX_GENERATIONS}
            isSubmitting={isLoading}
            onGenerate={handleGenerate}
          />
        ) : null}
      </StepCard>

      <div className="flex items-center justify-between gap-2">
        <Button onClick={handlePrev} variant="ghost" className="border border-white/15">
          <span className="inline-flex items-center gap-2">
            <ChevronLeft className="h-4 w-4" />
            {isIntroStep ? 'Скасувати' : 'Назад'}
          </span>
        </Button>

        {isIntroStep ? (
          <Button onClick={handleNext}>
            <span className="inline-flex items-center gap-2">
              Почати
              <ChevronRight className="h-4 w-4" />
            </span>
          </Button>
        ) : !isResultStep ? (
          <Button onClick={handleNext}>
            <span className="inline-flex items-center gap-2">
              Далі
              <ChevronRight className="h-4 w-4" />
            </span>
          </Button>
        ) : (
          <Button onClick={handleRestart} variant="outline">
            <span className="inline-flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              Почати заново
            </span>
          </Button>
        )}
      </div>

      {isResultStep ? (
        <div className="text-center text-xs text-white/55">
          Після 3 генерацій доступ до повторної генерації буде обмежено.
        </div>
      ) : null}
    </div>
  );
};
  const handleRestart = useCallback(() => {
    restart();
  }, [restart]);
