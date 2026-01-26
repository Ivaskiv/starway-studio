import { Button, Input } from '@/ui';
import { ChevronLeft, ChevronRight, Sparkles, X } from 'lucide-react';
// import { useCallback, useMemo } from 'react';
// import { useAppDispatch, useAppSelector } from '../../app/store/hooks';
// import {
//   finishWheelAssessment,
//   nextWheelCategory,
//   prevWheelCategory,
//   selectWheel,
//   setShowWheelModal,
//   setWheelScore,
// } from './services/aiMentorSlice';
// import { WHEEL_CATEGORIES } from './types/ai-mentor.types';
// import { WheelScore } from '@/features/wheel';
// import { useCreateWheelAssessmentMutation } from '@/features/ai-mentor';

// ============ WHEEL VISUALIZATION ============
interface WheelChartProps {
  scores: WheelScore[];
  size?: number;
}

const WheelChart = ({ scores, size = 300 }: WheelChartProps) => {
  const center = size / 2;
  const maxRadius = center - 20;

  const getScoreRadius = (score: number) => (score / 10) * maxRadius;

  const getPoint = (index: number, radius: number) => {
    const angle = (index * 360 / 8 - 90) * (Math.PI / 180);
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    };
  };

  const pathData = WHEEL_CATEGORIES.map((cat, i) => {
    const score = scores.find(s => s.category_id === cat.id)?.score || 0;
    const point = getPoint(i, getScoreRadius(score));
    return `${i === 0 ? 'M' : 'L'} ${point.x} ${point.y}`;
  }).join(' ') + ' Z';

  return (
    <svg width={size} height={size} className="drop-shadow-2xl">
      {[2, 4, 6, 8, 10].map((level) => (
        <circle
          key={level}
          cx={center}
          cy={center}
          r={getScoreRadius(level)}
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth="1"
        />
      ))}

      {WHEEL_CATEGORIES.map((cat, i) => {
        const point = getPoint(i, maxRadius);
        return (
          <line
            key={cat.id}
            x1={center}
            y1={center}
            x2={point.x}
            y2={point.y}
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth="1"
          />
        );
      })}

      {scores.length > 0 && (
        <path
          d={pathData}
          fill="url(#wheelGradient)"
          fillOpacity="0.6"
          stroke="url(#wheelStroke)"
          strokeWidth="2"
        />
      )}

      {WHEEL_CATEGORIES.map((cat, i) => {
        const score = scores.find(s => s.category_id === cat.id)?.score || 0;
        const point = getPoint(i, getScoreRadius(score));
        const labelPoint = getPoint(i, maxRadius + 25);
        return (
          <g key={cat.id}>
            <circle
              cx={point.x}
              cy={point.y}
              r={6}
              fill={cat.color}
              stroke="white"
              strokeWidth="2"
            />
            <text
              x={labelPoint.x}
              y={labelPoint.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-xs fill-white/80"
            >
              {cat.icon}
            </text>
          </g>
        );
      })}

      <defs>
        <linearGradient id="wheelGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="50%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
        <linearGradient id="wheelStroke" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#F472B6" />
        </linearGradient>
      </defs>
    </svg>
  );
});

// ============ SCORE SLIDER ============
interface ScoreSliderProps {
  value: number;
  onChange: (value: number) => void;
  color: string;
}

const ScoreSlider = ({ value, onChange, color }: ScoreSliderProps) => {
  return (
    <div className="w-full">
      <div className="flex justify-between mb-2">
        {[1,2,3,4,5,6,7,8,9,10].map(num => (
          <Button
            key={num}
            onClick={() => onChange(num)}
            className={`
              w-10 h-10 rounded-xl font-semibold text-sm
              transition-all duration-200 transform
              ${value === num
                ? 'scale-110 shadow-lg'
                : 'hover:scale-105 bg-white/5 hover:bg-white/10'}
            `}
            style={{
              backgroundColor: value === num ? color : undefined,
              color: value === num ? 'white' : 'rgba(255,255,255,0.6)',
            }}
          >
            {num}
          </Button>
        ))}
      </div>

      <Input
        type="range"
        min="1"
        max="10"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, ${color} 0%, ${color} ${(value-1)*11.11}%, rgba(255,255,255,0.1) ${(value-1)*11.11}%, rgba(255,255,255,0.1) 100%)`,
        }}
      />

      <div className="flex justify-between mt-2 text-xs text-white/40">
        <span>Критично</span>
        <span>Ідеально</span>
      </div>
    </div>
  );
};

// ============ MAIN COMPONENT ============
export const WheelOfBalance = () => {
  const dispatch = useAppDispatch();
  const { isAssessing, currentCategoryIndex, scores } = useAppSelector(selectWheel);
  const [createAssessment, { isLoading }] = useCreateWheelAssessmentMutation();

  const currentCategory = WHEEL_CATEGORIES[currentCategoryIndex];
  const currentScore = scores.find(s => s.category_id === currentCategory?.id)?.score || 5;
  const isLastCategory = currentCategoryIndex === WHEEL_CATEGORIES.length - 1;
  const progress = ((currentCategoryIndex+1) / WHEEL_CATEGORIES.length) * 100;

  const handleScoreChange = useCallback((value: number) => {
    if (!currentCategory) return;
    dispatch(setWheelScore({
      category_id: currentCategory.id,
      score: value,
      created_at: new Date().toISOString(),
    }));
  }, [dispatch, currentCategory]);

  const handleNext = useCallback(() => {
    if (isLastCategory) {
      dispatch(finishWheelAssessment());
    } else {
      dispatch(nextWheelCategory());
    }
  }, [dispatch, isLastCategory]);

  const handleClose = useCallback(() => {
    dispatch(setShowWheelModal(false));
  }, [dispatch]);

  if (!currentCategory) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={handleClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-3xl"
        style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%)',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {/* Header */}
        <div className="relative p-6 border-b border-white/10">
          <Button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-white/60" />
          </Button>

          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
              style={{ backgroundColor: `${currentCategory.color}20` }}
            >
              {currentCategory.icon}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{currentCategory.nameUk}</h2>
              <p className="text-sm text-white/60">
                Крок {currentCategoryIndex+1} з {WHEEL_CATEGORIES.length}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${currentCategory.color}, #8B5CF6)` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Як ти оцінюєш цю сферу?
                </h3>
                <p className="text-sm text-white/60">
                  1 = Потребує термінової уваги • 10 = Повністю задоволений
                </p>
              </div>

              <div className="text-center py-4">
                <span className="text-7xl font-bold" style={{ color: currentCategory.color }}>
                  {currentScore}
                </span>
              </div>

              <ScoreSlider
                value={currentScore}
                onChange={handleScoreChange}
                color={currentCategory.color}
              />
            </div>

            <div className="flex items-center justify-center">
              <WheelChart scores={scores} size={250} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 flex justify-between">
          <Button
            onClick={() => dispatch(prevWheelCategory())}
            disabled={currentCategoryIndex === 0}
            className={`
              flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium
              transition-all duration-200
              ${currentCategoryIndex === 0
                ? 'opacity-30 cursor-not-allowed'
                : 'bg-white/5 hover:bg-white/10 text-white'
              }
            `}
          >
            <ChevronLeft className="w-5 h-5" />
            Назад
          </Button>

          <Button
            onClick={handleNext}
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-white transition-all duration-200 hover:scale-105"
            style={{
              background: `linear-gradient(135deg, ${currentCategory.color}, #8B5CF6)`,
              boxShadow: `0 10px 30px -10px ${currentCategory.color}80`,
            }}
          >
            {isLastCategory ? (
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
    </div>
  );
};

export default WheelOfBalance;
