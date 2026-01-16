// packages/frontend/src/features/admin/components/steps/TrialSettingsStep.tsx

import React from 'react';
import { GlassCard } from '@/ui/GlassCard';
import { Calendar, Clock } from 'lucide-react';
import { Input } from '@/ui';

interface TrialSettingsStepProps {
  data: any;
  onChange: (data: any) => void;
  template: any;
}

export const TrialSettingsStep: React.FC<TrialSettingsStepProps> = ({ data, onChange, template }) => {
  const updateTrialDuration = (days: number) => {
    onChange({
      ...data,
      customizations: {
        ...data.customizations,
        trial: {
          ...data.customizations.trial,
          duration_days: days
        }
      },
      pricing: {
        ...data.pricing,
        trial_days: days
      }
    });
  };

  const updatePaidOnboarding = (hours: number) => {
    onChange({
      ...data,
      customizations: {
        ...data.customizations,
        paid_onboarding: {
          ...data.customizations.paid_onboarding,
          onboarding_hours: hours
        }
      }
    });
  };

  const trialDays = data.customizations.trial.duration_days;
  const onboardingHours = data.customizations.paid_onboarding.onboarding_hours;

  // Динамічний timeline для Trial
  const getTrialTimeline = (days: number) => {
    const midPoint = Math.floor(days / 2);
    return {
      day_1: 'Колесо балансу',
      [`day_1_${Math.min(3, days - 2)}`]: 'Щоденний цикл',
      [`day_${midPoint}`]: 'Дзеркало 1',
      [`day_${midPoint + 1}_${days - 1}`]: 'Продовження циклу',
      [`day_${days}`]: 'Фінальне дзеркало + CTA'
    };
  };

  return (
    <div className="space-y-8">
      {/* Trial Period */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-blue-500/20 rounded-lg">
            <Calendar className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-white">Trial період</h3>
            <p className="text-sm text-gray-400">Безкоштовний доступ для нових користувачів</p>
          </div>
        </div>

        {/* Slider */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-300">
              Тривалість Trial
            </label>
            <span className="text-2xl font-bold text-white">
              {trialDays} {trialDays === 1 ? 'день' : trialDays < 5 ? 'дні' : 'днів'}
            </span>
          </div>
          
          <Input
            type="range"
            min={template.pricing.limits.trial_days_min || 3}
            max={template.pricing.limits.trial_days_max || 30}
            value={trialDays}
            onChange={(e) => updateTrialDuration(Number(e.target.value))}
            className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-600"
          />
          
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>Мінімум: {template.pricing.limits.trial_days_min || 3} дні</span>
            <span>Максимум: {template.pricing.limits.trial_days_max || 30} днів</span>
          </div>
        </div>

        {/* Timeline Preview */}
        <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
          <p className="text-xs text-gray-500 mb-3">Структура Trial:</p>
          <div className="space-y-2">
            {Object.entries(getTrialTimeline(trialDays)).map(([day, module], index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                <span className="text-gray-400">{day}:</span>
                <span className="text-white">{module}</span>
              </div>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* Paid Onboarding */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-green-500/20 rounded-lg">
            <Clock className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-white">Paid Onboarding</h3>
            <p className="text-sm text-gray-400">Структурований вхід після оплати</p>
          </div>
        </div>

        {/* Slider */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-300">
              Тривалість Onboarding
            </label>
            <span className="text-2xl font-bold text-white">
              {onboardingHours} {onboardingHours === 1 ? 'година' : onboardingHours < 5 ? 'години' : 'годин'}
            </span>
          </div>
          
          <Input
            type="range"
            min={24}
            max={168}
            step={24}
            value={onboardingHours}
            onChange={(e) => updatePaidOnboarding(Number(e.target.value))}
            className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-green-600"
          />
          
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>24 години (1 день)</span>
            <span>168 годин (7 днів)</span>
          </div>
        </div>

        {/* Phases Preview */}
        <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
          <p className="text-xs text-gray-500 mb-3">5 фаз Onboarding:</p>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-gray-400">0-{Math.floor(onboardingHours * 0.03)}h:</span>
              <span className="text-white">Фіксація входу</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-gray-400">{Math.floor(onboardingHours * 0.03)}-{Math.floor(onboardingHours * 0.17)}h:</span>
              <span className="text-white">Бачення</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-gray-400">{Math.floor(onboardingHours * 0.17)}-{Math.floor(onboardingHours * 0.33)}h:</span>
              <span className="text-white">Головна ціль</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-gray-400">{Math.floor(onboardingHours * 0.33)}-{Math.floor(onboardingHours * 0.67)}h:</span>
              <span className="text-white">Вибір і рішення</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-gray-400">{Math.floor(onboardingHours * 0.67)}-{onboardingHours}h:</span>
              <span className="text-white">Дії</span>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Info */}
      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <p className="text-sm text-blue-200">
          💡 <strong>Порада:</strong> Оптимальна тривалість Trial — 7 днів. 
          Для Paid Onboarding рекомендуємо 72 години (3 дні).
        </p>
      </div>
    </div>
  );
};