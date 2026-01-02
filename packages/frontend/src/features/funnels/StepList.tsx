// packages/frontend/src/components/funnel/StepList.tsx
import { Trash2, MessageCircle, Mail, CreditCard, Gift, Zap, Edit, Clock, GitBranch } from 'lucide-react';
import { FunnelStep, StepType } from '@starway/shared';
import { Button } from '@starway/shared/ui';
import { LucideIcon } from 'lucide-react';

interface StepListProps {
  steps: FunnelStep[];
  onDelete: (stepId: string) => void;
  onEdit: (step: FunnelStep) => void;
}

export default function StepList({ steps, onDelete, onEdit }: StepListProps) {
  const stepTypeIcons: Record<StepType, LucideIcon> = {
    [StepType.MESSAGE]: MessageCircle,
    [StepType.FORM]: Edit,
    [StepType.PAYMENT]: CreditCard,
    [StepType.CONDITION]: GitBranch,
    [StepType.DELAY]: Clock,
    [StepType.WEBHOOK]: Zap,
    [StepType.AI_MENTOR]: Zap,
    [StepType.GAMIFICATION]: Gift,
    [StepType.EMAIL]: Mail,
    [StepType.SMS]: MessageCircle,
    [StepType.TELEGRAM]: MessageCircle,
  };

  const stepTypeLabels: Record<StepType, string> = {
    [StepType.MESSAGE]: 'Повідомлення',
    [StepType.FORM]: 'Форма',
    [StepType.PAYMENT]: 'Оплата',
    [StepType.CONDITION]: 'Умова',
    [StepType.DELAY]: 'Затримка',
    [StepType.WEBHOOK]: 'Webhook',
    [StepType.AI_MENTOR]: 'AI Ментор',
    [StepType.GAMIFICATION]: 'Геймифікація',
    [StepType.EMAIL]: 'Email',
    [StepType.SMS]: 'SMS',
    [StepType.TELEGRAM]: 'Telegram',
  };

  if (steps.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <div className="icon-container-orange w-12 h-12 mx-auto mb-4">
          <Zap className="w-6 h-6 text-orange-500" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">Немає кроків</h3>
        <p className="text-slate-400">Додайте перший крок воронки, щоб почати</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {steps.map((step, index) => {
        const Icon = stepTypeIcons[step.type];
        const label = stepTypeLabels[step.type];
        
        return (
          <div
            key={step.id}
            className="glass-card p-4 hover:bg-slate-800/50 transition group"
          >
            <div className="flex items-center gap-4">
              {/* Step Number */}
              <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 font-bold text-sm flex-shrink-0">
                {index + 1}
              </div>

              {/* Step Icon */}
              <div className="icon-container-orange w-10 h-10 flex-shrink-0">
                <Icon className="w-5 h-5 text-orange-500" />
              </div>

              {/* Step Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-white text-sm">{step.name}</h4>
                  <span className="badge-orange text-xs">{label}</span>
                </div>
                {step.description && (
                  <p className="text-xs text-slate-400 line-clamp-2">{step.description}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(step)}
                  className="glass-button"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Редагувати
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(step.id)}
                  className="glass-button text-red-400 hover:text-red-300"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}