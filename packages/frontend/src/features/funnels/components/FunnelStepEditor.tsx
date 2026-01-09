// features/funnels/components/FunnelStepEditor.tsx

import { Trash2, MessageCircle, Mail, CreditCard, Gift, Zap, Clock, GitBranch, Send, Edit } from 'lucide-react'
import { Button, Input, Textarea, GlassCard, Select } from '@/ui'
import type { FunnelStep, StepType } from '../types/funnel.types'
import type { LucideIcon } from 'lucide-react'
import { Label } from '@/ui/Label'

const STEP_TYPES: { type: StepType; icon: LucideIcon; label: string }[] = [
  { type: 'message', icon: MessageCircle, label: 'Повідомлення' },
  { type: 'form', icon: Edit, label: 'Форма' },
  { type: 'payment', icon: CreditCard, label: 'Оплата' },
  { type: 'condition', icon: GitBranch, label: 'Умова' },
  { type: 'delay', icon: Clock, label: 'Затримка' },
  { type: 'webhook', icon: Zap, label: 'Webhook' },
  { type: 'ai_mentor', icon: Zap, label: 'AI Ментор' },
  { type: 'gamification', icon: Gift, label: 'Гейміфікація' },
  { type: 'email', icon: Mail, label: 'Email' },
  { type: 'telegram', icon: Send, label: 'Telegram' },
]

interface Props {
  step: FunnelStep
  onUpdate: (updates: Partial<FunnelStep>) => void
  onDelete: () => void
}

export function FunnelStepEditor({ step, onUpdate, onDelete }: Props) {
  return (
    <div className="space-y-6">
      <GlassCard className="p-6">
        <h2 className="text-xl font-bold text-white mb-6">Налаштування кроку</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Назва кроку</label>
            <Input
              value={step.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              placeholder="Введіть назву..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Тип кроку</label>
            <div className="grid grid-cols-5 gap-2">
              {STEP_TYPES.map(({ type, icon: Icon, label }) => (
                <button
                  key={type}
                  onClick={() => onUpdate({ type })}
                  className={`p-3 rounded-xl flex flex-col items-center gap-2 transition ${
                    step.type === type
                      ? 'bg-orange-500/20 ring-1 ring-orange-500'
                      : 'glass-card hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${step.type === type ? 'text-orange-400' : 'text-slate-400'}`} />
                  <span className="text-xs text-slate-300">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Type-specific config */}
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Конфігурація</h3>

        {step.type === 'message' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Текст повідомлення</label>
              <Textarea
                value={step.config.message?.text || ''}
                onChange={(e) => onUpdate({ config: { ...step.config, message: { ...step.config.message, text: e.target.value } } })}
                rows={5}
                placeholder="Введіть текст повідомлення..."
              />
            </div>
          </div>
        )}

        {step.type === 'delay' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Тривалість</label>
              <Input
                type="number"
                value={step.config.delay?.duration || 0}
                onChange={(e) => onUpdate({ config: { ...step.config, delay: { ...step.config.delay, duration: +e.target.value, unit: step.config.delay?.unit || 'hours' } } })}
                min={1}
              />
            </div>
            <div>
              <Label className="block text-sm font-medium text-slate-300 mb-2">Одиниця</Label>
              <Select
                value={step.config.delay?.unit || 'hours'}
                onChange={(e) => onUpdate({ config: { ...step.config, delay: { ...step.config.delay, duration: step.config.delay?.duration || 1, unit: e.target.value as 'minutes' | 'hours' | 'days' } } })}
                className="w-full h-11 px-4 rounded-xl bg-slate-800 border border-white/10 text-white"
              >
                <option value="minutes">Хвилини</option>
                <option value="hours">Години</option>
                <option value="days">Дні</option>
              </Select>
            </div>
          </div>
        )}

        {step.type === 'payment' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Сума</label>
              <Input
                type="number"
                value={step.config.payment?.amount || 0}
                onChange={(e) => onUpdate({ config: { ...step.config, payment: { ...step.config.payment, amount: +e.target.value, currency: step.config.payment?.currency || 'UAH', provider: step.config.payment?.provider || 'wayforpay' } } })}
                min={0}
              />
            </div>
            <div>
              <Label className="block text-sm font-medium text-slate-300 mb-2">Валюта</Label>
              <Select
                value={step.config.payment?.currency || 'UAH'}
                onChange={(e) => onUpdate({ config: { ...step.config, payment: { ...step.config.payment, currency: e.target.value, amount: step.config.payment?.amount || 0, provider: step.config.payment?.provider || 'wayforpay' } } })}
                className="w-full h-11 px-4 rounded-xl bg-slate-800 border border-white/10 text-white"
              >
                <option value="UAH">UAH</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </Select>
            </div>
          </div>
        )}

        {['form', 'condition', 'webhook', 'ai_mentor', 'gamification', 'email', 'sms', 'telegram'].includes(step.type) && (
          <p className="text-slate-400 text-sm">Конфігурація для цього типу в розробці</p>
        )}
      </GlassCard>

      {/* Actions */}
      <div className="flex justify-end">
        <Button onClick={onDelete} data-color="ghost" className="text-red-400 hover:text-red-300">
          <Trash2 className="w-4 h-4 mr-2" />
          Видалити крок
        </Button>
      </div>
    </div>
  )
}