// frontend/src/features/admin/components/steps/PricingStep.tsx

import { GlassCard } from '@/frontend/srcui/GlassCard';
import { Input } from '@/frontend/srcui/Input';
import { Label } from '@/frontend/srcui/Label';
import { Calendar, DollarSign } from 'lucide-react';
import React from 'react';

interface PricingStepProps {
  data: any;
  onChange: (data: any) => void;
  template: any;
}

export const PricingStep: React.FC<PricingStepProps> = ({ data, onChange, template }) => {
  const updateMonthlyPrice = (price: number) => {
    // Автоматично розрахувати yearly з знижкою
    const yearlyPrice = Math.round(price * 12 * 0.8); // 20% знижка

    onChange({
      ...data,
      pricing: {
        ...data.pricing,
        monthly: price,
        yearly: yearlyPrice,
      },
    });
  };

  const updateYearlyPrice = (price: number) => {
    onChange({
      ...data,
      pricing: {
        ...data.pricing,
        yearly: price,
      },
    });
  };

  const calculateDiscount = () => {
    const fullYearly = data.pricing.monthly * 12;
    const discount = ((fullYearly - data.pricing.yearly) / fullYearly) * 100;
    return Math.round(discount);
  };

  const monthlySavings = () => {
    return Math.round((data.pricing.monthly * 12 - data.pricing.yearly) / 12);
  };

  return (
    <div className="space-y-6">
      <p className="text-gray-400">Встановіть ціни для вашого продукту</p>

      {/* Monthly Price */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-purple-500/20 rounded-lg">
            <DollarSign className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Місячна підписка</h3>
            <p className="text-sm text-gray-400">Ціна за 1 місяць доступу</p>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">Ціна (€)</label>
          <div className="relative">
            <Input
              type="number"
              min={template.pricing.limits.monthly_min}
              max={template.pricing.limits.monthly_max}
              value={data.pricing.monthly}
              onChange={e => updateMonthlyPrice(Number(e.target.value))}
              className="w-full pl-8"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">€</span>
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>Мінімум: €{template.pricing.limits.monthly_min}</span>
            <span>Максимум: €{template.pricing.limits.monthly_max}</span>
          </div>
        </div>

        {/* Range Slider */}
        <Input
          type="range"
          min={template.pricing.limits.monthly_min}
          max={template.pricing.limits.monthly_max}
          value={data.pricing.monthly}
          onChange={e => updateMonthlyPrice(Number(e.target.value))}
          className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-600"
        />
      </GlassCard>

      {/* Yearly Price */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-green-500/20 rounded-lg">
            <Calendar className="w-6 h-6 text-green-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white">Річна підписка</h3>
            <p className="text-sm text-gray-400">Ціна за 12 місяців зі знижкою</p>
          </div>
          <div className="px-3 py-1 bg-green-500/20 rounded-full">
            <span className="text-green-400 font-semibold text-sm">
              -{calculateDiscount()}% знижка
            </span>
          </div>
        </div>

        <div className="mb-4">
          <Label className="block text-sm font-medium text-gray-300 mb-2">Ціна (€)</Label>
          <div className="relative">
            <Input
              type="number"
              value={data.pricing.yearly}
              onChange={e => updateYearlyPrice(Number(e.target.value))}
              className="w-full pl-8"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">€</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Повна річна ціна без знижки: €{data.pricing.monthly * 12}
          </p>
        </div>

        {/* Savings */}
        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
          <p className="text-sm text-green-400">
            💰 Економія: €{monthlySavings()}/міс або €
            {data.pricing.monthly * 12 - data.pricing.yearly}/рік
          </p>
        </div>
      </GlassCard>

      {/* Preview */}
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Попередній перегляд цін</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Monthly Card */}
          <div className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg">
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-3xl font-bold text-white">€{data.pricing.monthly}</span>
              <span className="text-gray-400">/міс</span>
            </div>
            <p className="text-sm text-gray-400">Місячна підписка</p>
            <p className="text-xs text-gray-500 mt-2">
              Trial: {data.pricing.trial_days} днів безкоштовно
            </p>
          </div>

          {/* Yearly Card */}
          <div className="relative p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-2 border-green-500/30 rounded-lg">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-green-600 to-emerald-600 rounded-full">
              <span className="text-xs font-semibold text-white">НАЙВИГІДНІШЕ</span>
            </div>
            <div className="flex items-baseline gap-1 mb-2 mt-2">
              <span className="text-3xl font-bold text-white">€{data.pricing.yearly}</span>
              <span className="text-gray-400">/рік</span>
            </div>
            <p className="text-sm text-gray-400 mb-2">Річна підписка</p>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                -{calculateDiscount()}%
              </span>
              <span className="text-xs text-gray-500">€{monthlySavings()} економія/міс</span>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Currency */}
      <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-300">Валюта</p>
            <p className="text-xs text-gray-500">Ціни відображаються в євро</p>
          </div>
          <span className="px-4 py-2 bg-white/10 rounded-lg text-white font-semibold">EUR (€)</span>
        </div>
      </div>

      {/* Recommendation */}
      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <p className="text-sm text-blue-200">
          💡 <strong>Порада:</strong> Рекомендована знижка на річну підписку — 20%. Це стимулює
          користувачів обирати довший термін.
        </p>
      </div>
    </div>
  );
};
