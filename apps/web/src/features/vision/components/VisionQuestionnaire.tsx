// frontend/src/features/vision/components/VisionQuestionnaire.tsx
/**
 * VisionQuestionnaire - Vision creation form
 */

import { ROUTES } from '@/config/routes';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateVisionMutation } from '../services/vision.api';
import { Button, GenerationCurtain, GlassCard, Textarea, useGenerationCurtain, withMinimumDelay } from '@/ui';
import { toast } from 'react-hot-toast';
import { Sparkles } from 'lucide-react';
import { resetWheelPersistedState } from '@/features/wheel/hooks/useWheelFlowState';
import { dashboardDesignSystem } from '@/styles/design-system';

interface VisionQuestionnaireProps {
  onComplete?: (visionId: string) => void;
}

export function VisionQuestionnaire({ onComplete }: VisionQuestionnaireProps) {
  const navigate = useNavigate();
  const typography = dashboardDesignSystem.typography;
  const spacing = dashboardDesignSystem.spacing;
  const step = dashboardDesignSystem.step;
  const [idealLife, setIdealLife] = useState('');
  const [noLongerNormal, setNoLongerNormal] = useState('');
  const [pointB, setPointB] = useState('');

  const [createVision, { isLoading }] = useCreateVisionMutation();
  const curtainVisible = useGenerationCurtain(isLoading, {
    enterDelay: 160,
    minVisibleMs: 1100,
  });

  const handleSubmit = async () => {
    if (!idealLife.trim() || !noLongerNormal.trim() || !pointB.trim()) {
      toast.error('Заповни всі поля');
      return;
    }

    try {
      const result = await withMinimumDelay(
        createVision({
          idealLife: idealLife.trim(),
          noLongerNormal: noLongerNormal.trim(),
          pointB: pointB.trim()
        }).unwrap(),
        950,
      );

      toast.success('Систему згенеровано! ✨');
      onComplete?.(result.id);
    } catch (error) {
      toast.error('Помилка створення');
    }
  };

  return (
    <div className="space-y-6">
      <div className={`mx-auto w-full ${spacing.stackMd}`}>
        <div className={spacing.stackXs}>
          <p className={typography.overline}>КРОК САМОДІАГНОСТИКИ</p>
          <div className={spacing.stackSm}>
            <h1 className={typography.headingLg}>Твоє бачення</h1>
            <p className={typography.helper}>
              Три запитання → повна система: vision · WEB-карта · цілі
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 items-start gap-4 sm:gap-8">
          {[
            { id: 1, label: 'Бачення', active: true },
            { id: 2, label: 'WEB-карта', active: false },
            { id: 3, label: 'Цілі', active: false },
          ].map((item, index, items) => (
            <div key={item.id} className="relative flex flex-col items-center text-center">
              {index < items.length - 1 ? (
                <span className="absolute left-[calc(50%+1.75rem)] top-6 hidden h-px w-[calc(100%-3.5rem)] bg-white/10 md:block" />
              ) : null}
              <div
                className={[
                  step.iconBase,
                  item.active ? step.iconActive : step.iconLocked,
                ].join(' ')}
              >
                {item.id}
              </div>
              <p
                className={[
                  typography.subtitle,
                  item.active ? step.labelActive : step.labelLocked,
                  'mt-4',
                ].join(' ')}
              >
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      <GlassCard className="relative overflow-hidden p-6">
        <GenerationCurtain
          open={curtainVisible}
          title="Генеруємо систему переходу"
          subtitle="Збираємо vision, WEB-карту, цілі, фактори, ресурси, обмеження й рішення без втрати твоїх відповідей."
        />
        <div className="flex items-center gap-3 mb-6">
          <Sparkles className="w-8 h-8 text-purple-400" />
          <div>
            <h2 className="text-2xl font-bold text-white">Твоє бачення життя</h2>
            <p className="text-white/70 text-sm">Після цього згенеруємо не текст, а систему: vision + WEB-карту + цілі</p>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-emerald-300/80">Seed example</p>
              <h3 className="mt-2 text-lg font-semibold text-white">Health 4→7 · 3 місяці</h3>
            </div>
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/55">system seed</span>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-white/40">Фактори</p>
              <ul className="mt-2 space-y-1 text-sm text-white/72">
                <li>нерівний сон</li>
                <li>низька енергія вдень</li>
                <li>пропуски відновлення</li>
              </ul>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-white/40">Ресурси</p>
              <ul className="mt-2 space-y-1 text-sm text-white/72">
                <li>30 хв на прогулянку</li>
                <li>підтримка близьких</li>
                <li>можливість планувати ранок</li>
              </ul>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-white/40">Обмеження</p>
              <ul className="mt-2 space-y-1 text-sm text-white/72">
                <li>пізні засинання</li>
                <li>хаос у графіку</li>
                <li>звичка ігнорувати втому</li>
              </ul>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-white/40">Рішення</p>
              <ul className="mt-2 space-y-1 text-sm text-white/72">
                <li>сон до 23:00</li>
                <li>3 прогулянки щотижня</li>
                <li>ранковий ритуал без телефона</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <p className="text-sm text-white/70">
            Це очистить дані і почне заново
          </p>
          <Button
            onClick={() => {
              resetWheelPersistedState();
              navigate(ROUTES.WHEEL_START);
            }}
            variant="ghost"
          >
            Почати заново
          </Button>
        </div>

        {/* Question 1 */}
        <div className="mb-6">
          <label className="block text-white font-medium mb-3">
            1. Як виглядає ідеальне життя через 1 рік?
          </label>
          <Textarea
            value={idealLife}
            onChange={(e) => setIdealLife(e.target.value)}
            placeholder="Опиши в деталях: де живеш, чим займаєшся, хто поруч, як виглядає твій звичайний день..."
            rows={5}
            className="w-full"
            maxLength={500}
          />
          <div className="text-right text-white/50 text-xs mt-1">
            {idealLife.length}/500
          </div>
        </div>

        {/* Question 2 */}
        <div className="mb-6">
          <label className="block text-white font-medium mb-3">
            2. Що більше не є нормою у твоєму житті?
          </label>
          <Textarea
            value={noLongerNormal}
            onChange={(e) => setNoLongerNormal(e.target.value)}
            placeholder="Які старі патерни, переконання, ситуації ти більше не приймаєш як норму..."
            rows={4}
            className="w-full"
            maxLength={500}
          />
          <div className="text-right text-white/50 text-xs mt-1">
            {noLongerNormal.length}/500
          </div>
        </div>

        {/* Question 3 */}
        <div className="mb-6">
          <label className="block text-white font-medium mb-3">
            3. Де ти хочеш бути (точка Б)?
          </label>
          <Textarea
            value={pointB}
            onChange={(e) => setPointB(e.target.value)}
            placeholder="Конкретно опиши кінцевий результат: емоції, стан, досягнення..."
            rows={4}
            className="w-full"
            maxLength={500}
          />
          <div className="text-right text-white/50 text-xs mt-1">
            {pointB.length}/500
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !idealLife.trim() || !noLongerNormal.trim() || !pointB.trim()}
            size="lg"
            className="bg-gradient-to-r from-purple-500 to-pink-500"
          >
            {isLoading ? 'Генеруємо систему...' : 'Згенерувати систему'}
          </Button>
        </div>
      </GlassCard>

      {/* Info */}
      <GlassCard className="p-4">
        <p className="text-white/70 text-sm">
          💡 Після сабміту система збере vision, WEB-карту, вузли обмежень і ресурсів, цілі з діями та основу для daily cycle.
        </p>
      </GlassCard>
    </div>
  );
}
