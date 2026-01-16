import React from 'react';
import { GlassCard } from '@/ui/GlassCard';
import { Calendar, Clock } from 'lucide-react';
import { Input } from '@/ui';

interface TrialSettingsStepProps {
  data: {
    customizations: {
      trial: {
        duration_days: number;
      };
      paid_onboarding: {
        onboarding_hours: number;
      };
    };
    pricing: {
      trial_days: number;
    };
  };
  onChange: (data: any) => void;
  template: {
    pricing: {
      limits: {
        trial_days_min?: number;
        trial_days_max?: number;
      };
    };
  };
}

export const TrialSettingsStep: React.FC<TrialSettingsStepProps> = ({ 
  data, 
  onChange, 
  template 
}) => {
  const trialDays = data.customizations.trial.duration_days;
  const onboardingHours = data.customizations.paid_onboarding.onboarding_hours;

  const updateTrialDuration = (days: number) => {
    onChange({
      ...data,
      customizations: {
        ...data.customizations,
        trial: { duration_days: days }
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
        paid_onboarding: { onboarding_hours: hours }
      }
    });
  };

  return (
    <div className="space-y-8">
      <GlassCard className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-blue-500/20 rounded-lg">
            <Calendar className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-white">Trial період</h3>
            <p className="text-sm text-gray-400">Безкоштовний доступ</p>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-300">Тривалість</span>
            <span className="text-2xl font-bold text-white">{trialDays} днів</span>
          </div>
          
          <Input
            type="range"
            min={template.pricing.limits.trial_days_min || 3}
            max={template.pricing.limits.trial_days_max || 30}
            value={trialDays}
            onChange={(e) => updateTrialDuration(Number(e.target.value))}
            className="w-full h-2 bg-white/10 rounded-lg cursor-pointer"
          />
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-green-500/20 rounded-lg">
            <Clock className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-white">Paid Onboarding</h3>
            <p className="text-sm text-gray-400">Структурований вхід</p>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-300">Тривалість</span>
            <span className="text-2xl font-bold text-white">{onboardingHours} годин</span>
          </div>
          
          <Input
            type="range"
            min={24}
            max={168}
            step={24}
            value={onboardingHours}
            onChange={(e) => updatePaidOnboarding(Number(e.target.value))}
            className="w-full h-2 bg-white/10 rounded-lg cursor-pointer"
          />
        </div>
      </GlassCard>
    </div>
  );
};