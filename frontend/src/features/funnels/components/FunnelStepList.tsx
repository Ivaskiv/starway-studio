// features/funnels/components/FunnelStepList.tsx

import { Button } from '@/ui';
import type { LucideIcon } from 'lucide-react';
import {
  Clock,
  CreditCard,
  Edit,
  Gift,
  GitBranch,
  Mail,
  MessageCircle,
  Send,
  Trash2,
  Zap,
} from 'lucide-react';
import type { FunnelStep, StepType } from '../types/funnel.types';

const STEP_ICONS: Record<StepType, LucideIcon> = {
  message: MessageCircle,
  form: Edit,
  payment: CreditCard,
  condition: GitBranch,
  delay: Clock,
  webhook: Zap,
  ai_mentor: Zap,
  gamification: Gift,
  email: Mail,
  sms: MessageCircle,
  telegram: Send,
};

const STEP_LABELS: Record<StepType, string> = {
  message: 'Повідомлення',
  form: 'Форма',
  payment: 'Оплата',
  condition: 'Умова',
  delay: 'Затримка',
  webhook: 'Webhook',
  ai_mentor: 'AI Ментор',
  gamification: 'Гейміфікація',
  email: 'Email',
  sms: 'SMS',
  telegram: 'Telegram',
};

interface Props {
  steps: FunnelStep[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export function FunnelStepList({ steps, selectedId, onSelect, onDelete }: Props) {
  if (!steps.length) {
    return (
      <div className="p-8 text-center">
        <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center mx-auto mb-4">
          <Zap className="w-6 h-6 text-orange-500" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">Немає кроків</h3>
        <p className="text-slate-400 text-sm">Додайте перший крок</p>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-2">
      {steps.map((step, index) => {
        const Icon = STEP_ICONS[step.type];
        const isSelected = step.id === selectedId;

        return (
          <div
            key={step.id}
            onClick={() => onSelect(step.id)}
            className={`
              p-3 rounded-xl cursor-pointer transition-all group
              ${isSelected ? 'bg-orange-500/20 ring-1 ring-orange-500/50' : 'hover:bg-slate-800/50'}
            `}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 font-bold text-sm shrink-0">
                {index + 1}
              </div>

              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-orange-400" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h4 className="font-medium text-white text-sm truncate">{step.name}</h4>
                </div>
                <span className="text-xs text-slate-400">{STEP_LABELS[step.type]}</span>
              </div>

              <Button
                onClick={e => {
                  e.stopPropagation();
                  onDelete(step.id);
                }}
                data-color="ghost"
                data-size="sm"
                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
