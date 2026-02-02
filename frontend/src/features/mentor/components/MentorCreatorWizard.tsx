// frontend/src/features/admin/components/MentorCreatorWizard.tsx
// Wizard для створення AI-ментора адміністратором
// Крок 1: Налаштування 8 сфер колеса балансу
// Крок 2: Створення ранкових питань (3-5 шт)
// Крок 3: Створення вечірніх питань (3-5 шт)
// Крок 4: Налаштування landing page (заголовки, features)
// Результат: POST /api/mentor-templates → редирект на /mentor/:id

import { LandingConfig, MentorTemplate } from '@/features/mentor/types/mentor.types';
import { WHEEL_CATEGORIES, WheelConfigItem } from '@/features/wheel/types/wheel.types';
import { Button, GlassCard } from '@/ui';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { LandingConfigStep } from './LandingConfigStep';
import { QuestionsStep } from './QuestionsStep';
import { WheelConfigStep } from './WheelConfigStep';

export const MentorCreatorWizard = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const defaultWheelConfig: WheelConfigItem[] = WHEEL_CATEGORIES.map(category => ({
    id: category.id,
    label: '',
    emoji: '',
    description: '',
    wheelConfig: category.id ? [] : [], // порожні сфери спочатку
  }));

  const defaultLandingConfig: LandingConfig = {
    heroTitle: '',
    heroSubtitle: '',
    ctaText: 'Розпочати безкоштовно',
    features: [],
    testimonials: [],
  };

  const [config, setConfig] = useState<MentorTemplate>({
    name: 'Мій AI-Ментор',
    wheelConfig: defaultWheelConfig,
    morningQuestions: [],
    eveningQuestions: [],
    landingConfig: defaultLandingConfig,
  });

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/mentor-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (!response.ok) throw new Error('Failed to create mentor');

      const data = await response.json();
      toast.success('✅ AI-ментор успішно створено!');
      navigate(`/mentor/${data.id}`);
    } catch (error) {
      console.error('Failed to create mentor:', error);
      toast.error('Помилка створення ментора');
    } finally {
      setIsLoading(false);
    }
  };

  const canGoNext = () => {
    if (step === 1) return config.wheelConfig.some(s => s.label && s.emoji);
    if (step === 2) return config.morningQuestions.length > 0;
    if (step === 3) return config.eveningQuestions.length > 0;
    if (step === 4) return config.landingConfig.heroTitle && config.landingConfig.ctaText;
    return true;
  };

  return (
    <div className="min-h-screen bg-slate-950 py-12 px-4">
      <GlassCard className="max-w-3xl mx-auto p-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex gap-2 mb-4">
            {[1, 2, 3, 4].map(s => (
              <div
                key={s}
                className={`h-2 flex-1 rounded-full transition-all ${
                  s <= step ? 'bg-gradient-to-r from-orange-500 to-pink-500' : 'bg-white/10'
                }`}
              />
            ))}
          </div>
          <p className="text-white/60 text-sm">Крок {step} з 4</p>
        </div>

        {/* Step 1: Wheel Config */}
        {step === 1 && (
          <WheelConfigStep
            data={config.wheelConfig}
            onUpdate={data => setConfig({ ...config, wheelConfig: data })}
          />
        )}

        {/* Step 2: Morning Questions */}
        {step === 2 && (
          <QuestionsStep
            title="Ранкові питання"
            data={config.morningQuestions}
            onUpdate={data => setConfig({ ...config, morningQuestions: data })}
          />
        )}

        {/* Step 3: Evening Questions */}
        {step === 3 && (
          <QuestionsStep
            title="Вечірні питання"
            data={config.eveningQuestions}
            onUpdate={data => setConfig({ ...config, eveningQuestions: data })}
          />
        )}

        {/* Step 4: Landing Config */}
        {step === 4 && (
          <LandingConfigStep
            data={config.landingConfig}
            onUpdate={data => setConfig({ ...config, landingConfig: data })}
          />
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t border-white/10">
          {step > 1 ? (
            <Button
              onClick={() => setStep(step - 1)}
              className="bg-white/10 hover:bg-white/20 text-white"
              disabled={isLoading}
            >
              Назад
            </Button>
          ) : (
            <div />
          )}

          <Button
            onClick={step === 4 ? handleSave : () => setStep(step + 1)}
            disabled={!canGoNext() || isLoading}
            className="bg-gradient-to-r from-orange-500 to-pink-500 hover:opacity-90 text-white disabled:opacity-50"
          >
            {isLoading ? 'Збереження...' : step === 4 ? 'Запустити систему' : 'Далі'}
          </Button>
        </div>
      </GlassCard>
    </div>
  );
};
