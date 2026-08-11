// frontend/src/features/ai-mentor/components/SetupWizard/QuestionsSetup.tsx
/**
 * QuestionsSetup - Step 2 of Setup Wizard
 * Configure daily questions frequency and custom questions
 */

import { useState } from 'react';
import {
  useCompleteSetupMutation,
  useGenerateQuestionsVariantsMutation,
  useSetupQuestionsMutation,
} from '../../services/setup.api';
import { Button, GenerationCurtain, GlassCard, Input, Select, useGenerationCurtain, withMinimumDelay } from '@/ui';
import { toast } from 'react-hot-toast';
import { Sparkles } from 'lucide-react';

interface QuestionsSetupProps {
  onComplete: () => void;
}

export function QuestionsSetup({ onComplete }: QuestionsSetupProps) {
  const [frequency, setFrequency] = useState<'morning' | 'evening' | 'both' | 'daily'>('both');
  const [customQuestions, setCustomQuestions] = useState<string[]>(['']);
  const [telegramContact, setTelegramContact] = useState('');
  const [goalContext, setGoalContext] = useState('');
  const [audienceContext, setAudienceContext] = useState('');
  const [remainingGenerations, setRemainingGenerations] = useState(3);
  
  const [setupQuestions, { isLoading: isSaving }] = useSetupQuestionsMutation();
  const [generateQuestions, { isLoading: isGenerating }] = useGenerateQuestionsVariantsMutation();
  const [completeSetup, { isLoading: isCompleting }] = useCompleteSetupMutation();
  const curtainVisible = useGenerationCurtain(isSaving || isGenerating || isCompleting, {
    enterDelay: 140,
    minVisibleMs: 950,
  });

  const handleAddQuestion = () => {
    setCustomQuestions([...customQuestions, '']);
  };

  const handleQuestionChange = (index: number, value: string) => {
    const updated = [...customQuestions];
    updated[index] = value;
    setCustomQuestions(updated);
  };

  const handleRemoveQuestion = (index: number) => {
    setCustomQuestions(customQuestions.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    try {
      if (!telegramContact.trim()) {
        toast.error('Вкажи Telegram username або chat id для нагадувань');
        return;
      }

      // Filter empty questions
      const filtered = customQuestions.filter(q => q.trim().length > 0);

      await withMinimumDelay(
        setupQuestions({
          frequency,
          customQuestions: filtered.length > 0 ? filtered : undefined,
          telegramContact: telegramContact.trim(),
        }).unwrap(),
        800,
      );

      await withMinimumDelay(completeSetup().unwrap(), 700);

      toast.success('Налаштування завершено!');
      onComplete();
    } catch (error) {
      toast.error('Помилка збереження');
    }
  };

  const handleGenerate = async () => {
    if (remainingGenerations <= 0) {
      toast.error('Ліміт генерацій вичерпано (3/3)');
      return;
    }

    try {
      const res = await withMinimumDelay(
        generateQuestions({
          frequency,
          goal: goalContext,
          audience: audienceContext,
          tone: 'коротко, структуровано, практично',
        }).unwrap(),
        950,
      );

      const first = res?.variants?.[0];
      if (!first) {
        toast.error('Не вдалося сформувати варіанти');
        return;
      }

      const merged = [...(first.morningQuestions || []), ...(first.eveningQuestions || [])].slice(0, 6);
      setCustomQuestions(merged.length ? merged : ['']);
      setRemainingGenerations(prev => Math.max(0, prev - 1));
      toast.success('Питання сформовано. Можеш відредагувати вручну.');
    } catch {
      toast.error('Не вдалося згенерувати питання');
    }
  };

  return (
    <div className="relative">
      <GenerationCurtain
        open={curtainVisible}
        title={isGenerating ? 'Генеруємо питання' : 'Фіналізуємо onboarding'}
        subtitle="Збираємо частоту, Telegram-контакт і варіанти питань без втрати ручних правок."
      />
      <h2 className="text-2xl font-bold text-white mb-4">Крок 2: Налаштування питань</h2>
      <p className="text-white/70 mb-6">
        Обери коли хочеш отримувати питання та додай власні (опціонально).
      </p>

      {/* Frequency Selector */}
      <GlassCard className="p-6 mb-6">
        <label className="block text-white font-medium mb-3">Telegram контакт (обовʼязково)</label>
        <Input
          value={telegramContact}
          onChange={(e) => setTelegramContact(e.target.value)}
          placeholder="@username або chat id"
          className="w-full mb-4"
        />

        <label className="block text-white font-medium mb-3">Коли отримувати питання?</label>
        <Select
          value={frequency}
          onChange={(e) => setFrequency(e.target.value as any)}
          className="w-full"
        >
          <option value="morning">Тільки ранок</option>
          <option value="evening">Тільки вечір</option>
          <option value="both">Ранок і вечір</option>
          <option value="daily">Раз на день (вільний час)</option>
        </Select>

        <div className="mt-4 text-sm text-white/60">
          {frequency === 'morning' && '📅 Щодня о 8:00 - фокус на день'}
          {frequency === 'evening' && '📅 Щодня о 21:00 - рефлексія дня'}
          {frequency === 'both' && '📅 О 8:00 та 21:00 - повний цикл'}
          {frequency === 'daily' && '📅 Один раз на день - ти обираєш коли'}
        </div>
      </GlassCard>

      {/* Custom Questions */}
      <GlassCard className="p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <label className="text-white font-medium">Додати власні питання (опціонально)</label>
          <div className="flex items-center gap-2">
            <Button onClick={handleAddQuestion} size="sm">
              + Додати
            </Button>
            <Button
              onClick={handleGenerate}
              size="sm"
              disabled={isGenerating || remainingGenerations <= 0}
              className="bg-gradient-to-r from-purple-500 to-pink-500"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1" />
              Сформувати ({remainingGenerations})
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-3 mb-4">
          <Input
            value={goalContext}
            onChange={(e) => setGoalContext(e.target.value)}
            placeholder="Мета ментора (напр. дисципліна + фокус)"
          />
          <Input
            value={audienceContext}
            onChange={(e) => setAudienceContext(e.target.value)}
            placeholder="ЦА (напр. жінки 25-40)"
          />
        </div>

        <div className="space-y-3">
          {customQuestions.map((question, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={question}
                onChange={(e) => handleQuestionChange(index, e.target.value)}
                placeholder="Наприклад: Що мене надихнуло сьогодні?"
                className="flex-1"
              />
              {customQuestions.length > 1 && (
                <Button
                  onClick={() => handleRemoveQuestion(index)}
                  variant="ghost"
                  size="sm"
                  aria-label="Видалити питання"
                >
                  ×
                </Button>
              )}
            </div>
          ))}
        </div>

        <p className="text-xs text-white/50 mt-3">
          💡 Поради: питання мають бути короткими та конкретними
        </p>
      </GlassCard>

      {/* Submit Button */}
      <div className="flex justify-end gap-3">
        <Button
          onClick={handleSubmit}
          disabled={isSaving || isCompleting || !telegramContact.trim()}
          size="lg"
          className="bg-gradient-to-r from-purple-500 to-pink-500"
        >
          {isSaving || isCompleting ? 'Збереження...' : 'Завершити налаштування'}
        </Button>
      </div>
    </div>
  );
}
