// packages/frontend/src/features/ai-generator/components/ResultsPreview.tsx

import { Button, GlassCard } from '@/ui'
import { Check, DollarSign, Sparkles, TrendingUp, Users, Zap } from 'lucide-react'
import type { FunnelBlueprint } from '../types/generator.types'

interface ResultsPreviewProps {
  blueprint: FunnelBlueprint
  onSave: () => void
  onEdit: () => void
  isSaving: boolean
}

export default function ResultsPreview({
  blueprint,
  onSave,
  onEdit,
  isSaving,
}: ResultsPreviewProps) {
  return (
    <div className="space-y-6">
      {/* Success Header */}
      <GlassCard className="p-8 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg">
            <Check className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
              {blueprint.name}
            </h2>
            <p className="text-slate-300 mb-4">{blueprint.targetAudience}</p>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm font-semibold border border-green-500/30">
                {blueprint.type === 'fast_cash' ? '⚡ Швидкий продаж' :
                 blueprint.type === 'diagnostic' ? '🎯 Діагностика' :
                 '♾️ Evergreen'}
              </span>
              <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-sm font-semibold border border-blue-500/30">
                {blueprint.coreOffer.format}
              </span>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Financial Model */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <GlassCard className="p-6 text-center" data-hover="lift">
          <DollarSign className="w-8 h-8 text-orange-400 mx-auto mb-2" />
          <p className="text-sm text-slate-400 mb-1">Середній чек</p>
          <p className="text-2xl font-bold text-white">
            ₴{blueprint.financialModel.averageCheck.toLocaleString('uk-UA')}
          </p>
        </GlassCard>

        <GlassCard className="p-6 text-center" data-hover="lift">
          <Users className="w-8 h-8 text-blue-400 mx-auto mb-2" />
          <p className="text-sm text-slate-400 mb-1">Потрібно продажів</p>
          <p className="text-2xl font-bold text-white">
            {blueprint.financialModel.requiredSales}
          </p>
        </GlassCard>

        <GlassCard className="p-6 text-center" data-hover="lift">
          <TrendingUp className="w-8 h-8 text-green-400 mx-auto mb-2" />
          <p className="text-sm text-slate-400 mb-1">Конверсія</p>
          <p className="text-2xl font-bold text-white">
            {blueprint.financialModel.conversionRate}%
          </p>
        </GlassCard>

        <GlassCard className="p-6 text-center" data-hover="lift">
          <Zap className="w-8 h-8 text-purple-400 mx-auto mb-2" />
          <p className="text-sm text-slate-400 mb-1">Ціль на місяць</p>
          <p className="text-2xl font-bold text-white">
            ₴{blueprint.financialModel.targetRevenue.toLocaleString('uk-UA')}
          </p>
        </GlassCard>
      </div>

      {/* Funnel Structure */}
      <GlassCard className="p-6 md:p-8">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-orange-400" />
          Структура воронки
        </h3>

        <div className="space-y-4">
          {[
            { title: '🎣 Hook (Точка входу)', content: blueprint.steps.hook },
            { title: '🔍 AI-Діагностика', content: blueprint.steps.diagnostic },
            { title: '⚡ Quick Win', content: blueprint.steps.quickWin },
            { title: '💎 Core Offer', content: blueprint.steps.coreOffer },
            { title: '🚀 Upsell', content: blueprint.steps.upsell },
          ].map((step, idx) => (
            <div key={idx} className="glass-card bg-slate-800/50 p-4 rounded-lg">
              <h4 className="font-semibold text-white mb-2">{step.title}</h4>
              <p className="text-sm text-slate-300">{step.content}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Products (Core + Upsell) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GlassCard className="p-6">
          <h4 className="font-bold text-white mb-4 text-lg">💎 Основний продукт</h4>
          <p className="text-xl font-bold text-white mb-2">{blueprint.coreOffer.name}</p>
          <p className="text-3xl font-bold bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent mb-4">
            ₴{blueprint.coreOffer.price.toLocaleString('uk-UA')}
          </p>
          <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-sm font-semibold">
            {blueprint.coreOffer.format}
          </span>
        </GlassCard>

        {blueprint.upsell && (
          <GlassCard className="p-6 bg-gradient-to-br from-orange-500/10 to-red-500/10">
            <h4 className="font-bold text-white mb-4 text-lg">🚀 Апсел</h4>
            <p className="text-xl font-bold text-white mb-2">{blueprint.upsell.name}</p>
            <p className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
              ₴{blueprint.upsell.price.toLocaleString('uk-UA')}
            </p>
          </GlassCard>
        )}
      </div>

      {/* Додаткові продукти з Mini Apps */}
      {blueprint.products && blueprint.products.length > 0 && (
        <GlassCard className="p-6">
          <h4 className="font-bold text-white mb-4 text-lg">Продукти з Mini Apps та підписками</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {blueprint.products.map((product, idx) => (
              <div key={idx} className="glass-card p-4 rounded-lg">
                <p className="text-xl font-bold text-white mb-2">{product.name}</p>
                <p className="text-2xl font-bold text-green-400 mb-2">
                  ₴{product.price.toLocaleString('uk-UA')}
                  {product.type === 'subscription' && ' /міс'}
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-sm">
                    {product.format}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 text-sm">
                    {product.integration}
                  </span>
                  {product.includesMentorship && (
                    <span className="px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 text-sm">
                      + Наставництво
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm text-slate-400 mt-4">
            Завдання та нагадування через Telegram Mini App
          </p>
        </GlassCard>
      )}

      {/* Automation */}
      <GlassCard className="p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-orange-400" />
          Автоматизація
        </h3>
        <div className="flex flex-wrap gap-2">
          {blueprint.automation.map((item, idx) => (
            <span
              key={idx}
              className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-sm"
            >
              ✓ {item}
            </span>
          ))}
        </div>
      </GlassCard>

      {/* Actions */}
      <div className="flex gap-4">
        <Button
          onClick={onEdit}
          data-variant="ghost"
          data-size="lg"
          className="flex-1"
        >
          Редагувати
        </Button>
        <Button
          onClick={onSave}
          disabled={isSaving}
          data-color="orange"
          data-size="lg"
          className="flex-1"
        >
          {isSaving ? 'Зберігаємо...' : 'Зберегти воронку'}
        </Button>
      </div>
    </div>
  )
}