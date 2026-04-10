// frontend/src/features/vision/components/VisionQuestionnaire.tsx
/**
 * VisionQuestionnaire - Vision creation form
 */

import { useState } from 'react';
import { useCreateVisionMutation } from '../services/vision.api';
import { Button, GenerationCurtain, GlassCard, Textarea, useGenerationCurtain, withMinimumDelay } from '@/ui';
import { toast } from 'react-hot-toast';
import { Sparkles } from 'lucide-react';

interface VisionQuestionnaireProps {
  onComplete?: (visionId: string) => void;
}

export function VisionQuestionnaire({ onComplete }: VisionQuestionnaireProps) {
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

      toast.success('Vision statement створено! ✨');
      onComplete?.(result.id);
    } catch (error) {
      toast.error('Помилка створення');
    }
  };

  return (
    <div className="space-y-6">
      <GlassCard className="relative overflow-hidden p-6">
        <GenerationCurtain
          open={curtainVisible}
          title="Формуємо vision statement"
          subtitle="Збираємо опорні сенси, точку Б і критерії переходу без втрати твоїх відповідей."
        />
        <div className="flex items-center gap-3 mb-6">
          <Sparkles className="w-8 h-8 text-purple-400" />
          <div>
            <h2 className="text-2xl font-bold text-white">Твоє бачення життя</h2>
            <p className="text-white/70 text-sm">Відповідай щиро, без обмежень</p>
          </div>
        </div>

        {/* Question 1 */}
        <div className="mb-6">
          <label className="block text-white font-medium mb-3">
            1. Як виглядає ідеальне життя через 5 років?
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
            {isLoading ? 'Формуємо vision...' : 'Створити vision statement'}
          </Button>
        </div>
      </GlassCard>

      {/* Info */}
      <GlassCard className="p-4">
        <p className="text-white/70 text-sm">
          💡 Vision statement — це твоє бачення ідеального життя, яке буде сформульоване на основі твоїх відповідей. 
          Воно стане основою для визначення цілей та усвідомлених виборів.
        </p>
      </GlassCard>
    </div>
  );
}
