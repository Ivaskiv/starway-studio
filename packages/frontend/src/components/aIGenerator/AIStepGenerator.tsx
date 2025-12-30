// packages/frontend/src/components/funnel/AIStepGenerator.tsx

import { useState } from 'react';
import { Sparkles, Loader, Plus, Zap, MessageCircle, Mail, CreditCard } from 'lucide-react';
import { Button } from '@starway/shared/ui';
import { FunnelStep } from '@starway/shared';
import toast from 'react-hot-toast';

interface AIStepGeneratorProps {
  funnelName: string;
  funnelDescription?: string;
  currentSteps: FunnelStep[];
  onAddStep: (type: FunnelStep['type']) => void;
}

export default function AIStepGenerator({
  funnelName,
  funnelDescription,
  currentSteps,
  onAddStep
}: AIStepGeneratorProps) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{
    type: FunnelStep['type'];
    name: string;
    description: string;
    reason: string;
  }>>([]);

  const generateSuggestions = async () => {
    setLoading(true);

    // TODO: Реальний API виклик до AI
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock AI suggestions based on funnel name/description
    const mockSuggestions = [
      {
        type: 'telegram' as const,
        name: 'Привітальне повідомлення',
        description: 'Вітаємо користувача та пояснюємо що на нього чекає',
        reason: 'Перший контакт з користувачем - важливо зробити warm welcome'
      },
      {
        type: 'telegram' as const,
        name: 'Діагностика: Колесо балансу',
        description: 'Запрошуємо пройти колесо балансу для оцінки поточного стану',
        reason: 'AI-Ментор потребує початкової діагностики для персоналізації'
      },
      {
        type: 'delay' as const,
        name: 'Затримка 24 години',
        description: 'Даємо час користувачу на роздуми',
        reason: 'Після діагностики потрібен час для осмислення результатів'
      },
      {
        type: 'telegram' as const,
        name: 'Дзеркало №1',
        description: 'AI аналіз першого тижня - показуємо патерни та злив',
        reason: 'День 7 - важливий момент для першого зворотного зв\'язку'
      },
      {
        type: 'email' as const,
        name: 'Email: Перші результати',
        description: 'Відправляємо детальний звіт на email',
        reason: 'Додатковий канал комунікації - збільшує engagement'
      },
      {
        type: 'payment' as const,
        name: 'Пропозиція Paid підписки',
        description: 'День 14 - пропонуємо перейти на повну версію',
        reason: 'Trial закінчується - час для конверсії в платних користувачів'
      }
    ];

    setSuggestions(mockSuggestions);
    setLoading(false);
  };

  const handleAddSuggestion = (suggestion: typeof suggestions[0]) => {
    onAddStep(suggestion.type);
    toast.success(`Крок "${suggestion.name}" додано!`);
  };

  const stepTypeIcons: Record<FunnelStep['type'], any> = {
    trigger: Zap,
    telegram: MessageCircle,
    email: Mail,
    payment: CreditCard,
    gift: Sparkles,
    segment: Zap,
    notify: MessageCircle,
    delay: Zap,
    condition: Zap,
  };

  const stepTypeLabels: Record<FunnelStep['type'], string> = {
    trigger: 'Тригер',
    telegram: 'Telegram',
    email: 'Email',
    payment: 'Оплата',
    gift: 'Подарунок',
    segment: 'Сегмент',
    notify: 'Нотифікація',
    delay: 'Затримка',
    condition: 'Умова',
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="icon-container-orange w-12 h-12">
            <Sparkles className="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <h3 className="font-semibold text-white">AI Помічник</h3>
            <p className="text-xs text-slate-400">Генерація кроків воронки</p>
          </div>
        </div>

        <div className="glass-card bg-slate-800/50 p-4 mb-4">
          <h4 className="text-sm font-semibold text-white mb-2">{funnelName}</h4>
          <p className="text-xs text-slate-400">{funnelDescription}</p>
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
            <span>Поточних кроків: {currentSteps.length}</span>
          </div>
        </div>

        <Button
          variant="primary"
          size="md"
          className="gradient-button w-full"
          onClick={generateSuggestions}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader className="w-5 h-5 mr-2 animate-spin" />
              AI аналізує...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              Згенерувати кроки
            </>
          )}
        </Button>
      </div>

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-white">Рекомендовані кроки</h4>
            <span className="text-xs text-slate-400">{suggestions.length} пропозицій</span>
          </div>

          <div className="space-y-3">
            {suggestions.map((suggestion, index) => {
              const Icon = stepTypeIcons[suggestion.type];

              return (
                <div
                  key={index}
                  className="glass-card bg-slate-800/50 p-4 hover:bg-slate-800/70 transition group"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="icon-container-orange w-10 h-10 flex-shrink-0">
                      <Icon className="w-5 h-5 text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h5 className="font-semibold text-white text-sm">
                          {suggestion.name}
                        </h5>
                        <span className="badge-orange text-xs flex-shrink-0">
                          {stepTypeLabels[suggestion.type]}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mb-2">
                        {suggestion.description}
                      </p>
                      <div className="glass-card bg-blue-500/10 border border-blue-500/20 p-2 rounded-lg">
                        <p className="text-xs text-blue-300">
                          💡 {suggestion.reason}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="glass-button w-full opacity-0 group-hover:opacity-100 transition"
                    onClick={() => handleAddSuggestion(suggestion)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Додати крок
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && suggestions.length === 0 && (
        <div className="text-center py-12">
          <div className="icon-container-orange w-16 h-16 mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-orange-500" />
          </div>
          <h4 className="text-white font-semibold mb-2">AI готовий допомогти</h4>
          <p className="text-sm text-slate-400 mb-6">
            Натисніть кнопку, щоб AI проаналізував вашу воронку та запропонував оптимальні кроки
          </p>
        </div>
      )}

      {/* Quick Add Buttons */}
      <div>
        <h4 className="text-sm font-semibold text-white mb-3">Швидке додавання</h4>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="glass-button justify-start"
            onClick={() => onAddStep('telegram')}
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Telegram
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="glass-button justify-start"
            onClick={() => onAddStep('email')}
          >
            <Mail className="w-4 h-4 mr-2" />
            Email
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="glass-button justify-start"
            onClick={() => onAddStep('payment')}
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Оплата
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="glass-button justify-start"
            onClick={() => onAddStep('delay')}
          >
            <Zap className="w-4 h-4 mr-2" />
            Затримка
          </Button>
        </div>
      </div>

      {/* Tips */}
      <div className="glass-card-gradient p-4">
        <h4 className="text-sm font-semibold text-white mb-2">💡 Підказки</h4>
        <ul className="text-xs text-slate-400 space-y-1.5">
          <li>• Починайте з привітального повідомлення</li>
          <li>• Додавайте затримки між кроками</li>
          <li>• Використовуйте умови для сегментації</li>
          <li>• Інтегруйте Telegram для швидкого фідбеку</li>
        </ul>
      </div>
    </div>
  );
}