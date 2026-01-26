// frontend/src/features/admin/components/steps/ReviewStep.tsx

import React from 'react';
import { GlassCard } from '@/ui/GlassCard';
import { Check, AlertCircle } from 'lucide-react';

interface ReviewStepProps {
  data: any;
  template: any;
}

export const ReviewStep: React.FC<ReviewStepProps> = ({ data, template }) => {
  const enabledIntegrations = Object.entries(data.integrations)
    .filter(([_, config]: any) => config.enabled)
    .map(([platform]) => platform);

  const isReadyToPublish = () => {
    return (
      data.branding.name &&
      data.branding.description &&
      data.enabled_modules.length > 0 &&
      data.pricing.monthly > 0
    );
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">
          Останній крок!
        </h2>
        <p className="text-gray-400">
          Перевірте всі налаштування перед створенням продукту
        </p>
      </div>

      {/* Branding */}
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Check className="w-5 h-5 text-green-400" />
          Брендинг
        </h3>
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <span className="text-gray-400">Назва:</span>
            <span className="text-white font-semibold">{data.branding.name}</span>
          </div>
          <div className="flex items-start justify-between">
            <span className="text-gray-400">Опис:</span>
            <span className="text-white text-right max-w-xs">{data.branding.description}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Кольори:</span>
            <div className="flex items-center gap-2">
              <div 
                className="w-8 h-8 rounded-lg border border-white/20"
                style={{ backgroundColor: data.branding.colors.primary }}
              />
              <div 
                className="w-8 h-8 rounded-lg border border-white/20"
                style={{ backgroundColor: data.branding.colors.secondary }}
              />
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Template & Modules */}
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Check className="w-5 h-5 text-green-400" />
          Темплейт і модулі
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Темплейт:</span>
            <span className="text-white font-semibold">{template.name} v{template.version}</span>
          </div>
          <div>
            <span className="text-gray-400 mb-2 block">Увімкнені модулі ({data.enabled_modules.length}):</span>
            <div className="flex flex-wrap gap-2">
              {data.enabled_modules.map((moduleId: string) => {
                const module = template.modules.find((m: any) => m.id === moduleId);
                return (
                  <span 
                    key={moduleId}
                    className="px-3 py-1 bg-purple-500/20 text-purple-400 text-sm rounded-full"
                  >
                    {module?.name}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Trial & Pricing */}
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Check className="w-5 h-5 text-green-400" />
          Trial і ціни
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Trial період:</span>
            <span className="text-white font-semibold">
              {data.pricing.trial_days} {data.pricing.trial_days === 1 ? 'день' : data.pricing.trial_days < 5 ? 'дні' : 'днів'} безкоштовно
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Paid onboarding:</span>
            <span className="text-white font-semibold">
              {data.customizations.paid_onboarding.onboarding_hours} годин
            </span>
          </div>
          <div className="pt-3 border-t border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400">Місячна підписка:</span>
              <span className="text-white font-bold text-lg">€{data.pricing.monthly}/міс</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Річна підписка:</span>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-lg">€{data.pricing.yearly}/рік</span>
                <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                  -{Math.round((1 - data.pricing.yearly / (data.pricing.monthly * 12)) * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Integrations */}
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          {enabledIntegrations.length > 0 ? (
            <Check className="w-5 h-5 text-green-400" />
          ) : (
            <AlertCircle className="w-5 h-5 text-yellow-400" />
          )}
          Інтеграції
        </h3>
        {enabledIntegrations.length > 0 ? (
          <div className="space-y-2">
            {enabledIntegrations.map((platform) => (
              <div key={platform} className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400" />
                <span className="text-white capitalize">{platform}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-yellow-400 text-sm">
            ⚠️ Рекомендуємо підключити хоча б одну інтеграцію
          </p>
        )}
      </GlassCard>

      {/* Product URL Preview */}
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          URL продукту
        </h3>
        <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
          <code className="text-purple-400">
            https://starway.studio/products/{data.branding.name?.toLowerCase().replace(/\s+/g, '-') || 'your-product'}
          </code>
        </div>
      </GlassCard>

      {/* Status */}
      {isReadyToPublish() ? (
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
          <div className="flex items-center gap-3">
            <Check className="w-6 h-6 text-green-400 flex-shrink-0" />
            <div>
              <p className="text-green-400 font-semibold">Готово до створення!</p>
              <p className="text-sm text-gray-400">
                Всі обов'язкові поля заповнені. Натисніть "Створити продукт" для публікації.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-yellow-400 flex-shrink-0" />
            <div>
              <p className="text-yellow-400 font-semibold">Не всі поля заповнені</p>
              <p className="text-sm text-gray-400">
                Перевірте: назву, опис, модулі та ціни
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
