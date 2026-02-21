import { useCallback, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';

import { useCreateWheelAssessmentMutation } from '@/features/wheel/api';
import { WHEEL_CATEGORIES } from '@/features/wheel/types/wheel.types';
import { BalanceWheel } from './BalanceWheel';
import { ScoreSlider } from './ScoreSlider';
import { WheelFooter } from './WheelFooter';
import { WheelTabs } from './WheelTabs';

interface WheelFormProps {
  userId: string;
  onComplete?: (assessmentId: string) => void;
  onCancel?: () => void;
}

export const WheelForm = ({ userId, onComplete, onCancel }: WheelFormProps) => {
  const [index, setIndex] = useState(0);
  const [scores, setScores] = useState(() =>
    WHEEL_CATEGORIES.map(cat => ({ categoryId: cat.id, score: 5 })),
  );

  // fix code_x: runtime crash fix — use existing mutation hook and pass required userId.
  const [saveWheel, { isLoading }] = useCreateWheelAssessmentMutation();

  const currentScore = scores[index].score;
  const currentComment = scores[index].comment ?? '';
  const category = WHEEL_CATEGORIES[index];

  const handleScoreChange = useCallback(
    (val: number) =>
      setScores(prev => prev.map((s, i) => (i === index ? { ...s, score: val } : s))),
    [index],
  );

  const handleNext = useCallback(async () => {
    if (index < scores.length - 1) {
      setIndex(i => i + 1);
      return;
    }
    try {
      const result = await saveWheel({ userId, scores }).unwrap();
      toast.success('Збережено!');
      onComplete?.(result.id); // assessmentId тепер строго string
    } catch (error: any) {
      const apiMessage =
        error?.data?.error || error?.error || 'Не вдалося зберегти колесо. Спробуйте ще раз.';
      // fix code_x: show backend reason (e.g. cooldown / validation), not generic failure.
      toast.error(String(apiMessage));
    }
  }, [index, saveWheel, scores, onComplete, userId]);

  const handlePrev = useCallback(() => {
    if (index > 0) setIndex(i => i - 1);
  }, [index]);

  const handleCommentChange = useCallback(
    (value: string) =>
      setScores(prev => prev.map((s, i) => (i === index ? { ...s, comment: value } : s))),
    [index],
  );

  const scoreList = useMemo(() => scores.map(s => s.score), [scores]);
  const averageScore = useMemo(
    () => (scores.length ? scores.reduce((sum, item) => sum + item.score, 0) / scores.length : 0),
    [scores],
  );

  const caption = useMemo(() => {
    if (averageScore >= 8.5) return 'Сильний темп: ви вже тримаєте баланс на високому рівні.'
    if (averageScore >= 6.5) return 'Добра база: кілька точних кроків і картина стане значно гармонійнішою.'
    if (averageScore >= 4.5) return 'Зараз точка росту: чесна оцінка вже запускає реальні зміни.'
    return 'Початок шляху: невеликі щоденні дії швидко вирівняють ваш внутрішній ритм.'
  }, [averageScore]);

  return (
    <div className="max-w-3xl mx-auto p-4">
      <WheelTabs scores={scoreList} activeIndex={index} onSelect={setIndex} />

      <BalanceWheel scores={scores} size={300} />

      <div className="p-4">
        <h3 className="text-xl font-semibold text-white">{category.nameUk}</h3>
        <p className="text-sm text-white/60">1 = Потребує увагу • 10 = Ідеально</p>

        <div className="text-center text-5xl font-bold my-4" style={{ color: category.color }}>
          {currentScore}
        </div>

        <ScoreSlider value={currentScore} onChange={handleScoreChange} color={category.color} />

        <p className="mt-4 text-sm text-white/80 text-center">
          {caption}
        </p>

        <div className="mt-5">
          <label className="block text-sm text-white/70 mb-2">
            Коротко: чому така оцінка? <span className="text-white/40">(необовʼязково)</span>
          </label>
          {/* fix code_x: optional reason input per category to enrich wheel context and future recommendations. */}
          <textarea
            value={currentComment}
            onChange={(e) => handleCommentChange(e.target.value)}
            placeholder="Наприклад: зараз мало енергії через перевтому..."
            rows={3}
            className="w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/35 outline-none focus:border-[color:rgba(var(--accent-rgb),0.55)] focus:ring-2 focus:ring-[color:rgba(var(--accent-rgb),0.2)]"
          />
        </div>
      </div>

      <WheelFooter
        isFirst={index === 0}
        isLast={index === scores.length - 1}
        isSubmitting={isLoading}
        onPrev={handlePrev}
        onNext={handleNext}
        onCancel={onCancel}
      />
    </div>
  );
};
