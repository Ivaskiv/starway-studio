// /features/subscription/pages/SubscriptionPage.tsx

import { useGetMeQuery } from '@/features/auth/services/auth.api';
import { Button, GlassCard } from '@/ui';
import { ArrowRight, BookOpen, Brain, Check, Crown, MessageCircle, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Plan {
  id: string;
  name: string;
  price: number;
  period: string;
  originalPrice?: number;
  features: string[];
  highlighted?: boolean;
  badge?: string;
}

const PLANS: Plan[] = [
  {
    id: 'monthly',
    name: 'Місячна',
    price: 299,
    period: 'міс',
    features: [
      'AI Ментор без обмежень',
      'Всі курси та матеріали',
      'Щоденні сесії',
      'Telegram нагадування',
      'Статистика та аналітика',
    ],
  },
  {
    id: 'yearly',
    name: 'Річна',
    price: 199,
    period: 'міс',
    originalPrice: 299,
    highlighted: true,
    badge: 'Економія 33%',
    features: [
      'Все з місячної підписки',
      'Пріоритетна підтримка',
      'Ранній доступ до нових курсів',
      'Ексклюзивні матеріали',
      'Знижка на наставництво',
    ],
  },
  {
    id: 'yearly_plus',
    name: 'Річна + Наставник',
    price: 499,
    period: 'міс',
    features: [
      'Все з річної підписки',
      'Особистий наставник',
      '4 Zoom-сесії на місяць',
      'Персональний план розвитку',
      'Прямий контакт у Telegram',
      'VIP чат спільноти',
    ],
    badge: 'Premium',
  },
];

const FEATURES_COMPARISON = [
  { feature: 'AI Ментор', free: '7 днів', paid: '✓' },
  { feature: 'Курси', free: '1 курс', paid: 'Всі курси' },
  { feature: 'Сесії', free: '1/день', paid: 'Без обмежень' },
  { feature: 'Telegram бот', free: '✓', paid: '✓' },
  { feature: 'Аналітика', free: 'Базова', paid: 'Повна' },
  { feature: 'Підтримка', free: 'Email', paid: 'Пріоритетна' },
];

export default function SubscriptionPage() {
  const { data } = useGetMeQuery();
  const user = data?.user;

  const [selectedPlan, setSelectedPlan] = useState<string>('yearly');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showTrial, setShowTrial] = useState(false);

  useEffect(() => {
    setTimeout(() => setShowTrial(true), 10);
  }, []);
  const hasSubscription = user?.subscriptionStatus === 'active';

  // Trial info
  const trialDaysLeft = user?.trialEndsAt
    ? Math.max(
        0,
        Math.ceil((new Date(user.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      )
    : 0;

  const handleSubscribe = async (planId: string) => {
    setIsProcessing(true);
    // TODO: Інтеграція з WayForPay
    console.log('Subscribe to plan:', planId);
    setTimeout(() => setIsProcessing(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/20 text-purple-400 text-sm mb-4">
          <Crown className="w-4 h-4" />
          Premium підписка
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
          Розблокуй повний потенціал
        </h1>
        <p className="text-white/60 max-w-lg mx-auto">
          Отримай необмежений доступ до AI-ментора, всіх курсів та персональної підтримки
        </p>
      </div>

      {/* Trial Banner */}
      {!hasSubscription && trialDaysLeft > 0 && (
        <div
          className={`
    p-4 rounded-2xl
    bg-gradient-to-r from-amber-500/20 to-orange-500/20
    border border-amber-500/30 text-center
    transition-all duration-300
    ${showTrial ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-5'}
  `}
        >
          <p className="text-amber-400">
            ⏰ Твій безкоштовний період закінчується через <strong>{trialDaysLeft} днів</strong>.
            Оформи підписку, щоб не втратити прогрес!
          </p>
        </div>
      )}

      {/* Current Subscription */}
      {hasSubscription && (
        <GlassCard className="p-6 text-center">
          <div
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 
                        flex items-center justify-center mx-auto mb-4"
          >
            <Check className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Підписка активна</h2>
          <p className="text-white/60">
            Твоя підписка: <strong className="text-white">{user?.subscriptionPlan}</strong>
          </p>
          <p className="text-white/40 text-sm mt-1">Наступне списання: 01.02.2026</p>
        </GlassCard>
      )}

      {/* Plans */}
      {!hasSubscription && (
        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map(plan => (
            <div
              className={`
    p-4 rounded-2xl
    bg-gradient-to-r from-amber-500/20 to-orange-500/20
    border border-amber-500/30 text-center
    transition-all duration-300
    ${showTrial ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-5'}
  `}
            >
              {plan.badge && (
                <div className="absolute top-0 right-0 px-3 py-1 bg-purple-500 text-white text-xs font-semibold rounded-bl-xl">
                  {plan.badge}
                </div>
              )}

              <GlassCard className={`h-full p-6 ${plan.highlighted ? 'bg-purple-500/10' : ''}`}>
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold text-white mb-2">{plan.name}</h3>
                  <div className="flex items-baseline justify-center gap-1">
                    {plan.originalPrice && (
                      <span className="text-white/40 line-through text-lg">
                        ₴{plan.originalPrice}
                      </span>
                    )}
                    <span className="text-4xl font-bold text-white">₴{plan.price}</span>
                    <span className="text-white/60">/{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <span className="text-white/80">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={isProcessing}
                  className={`w-full ${
                    plan.highlighted
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  {isProcessing ? 'Обробка...' : 'Обрати план'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </GlassCard>
            </div>
          ))}
        </div>
      )}

      {/* Features Comparison */}
      <GlassCard className="p-6">
        <h2 className="text-xl font-semibold text-white mb-6 text-center">
          Порівняння можливостей
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-white/60 font-medium">Функція</th>
                <th className="text-center py-3 px-4 text-white/60 font-medium">Безкоштовно</th>
                <th className="text-center py-3 px-4 text-purple-400 font-medium">Premium</th>
              </tr>
            </thead>
            <tbody>
              {FEATURES_COMPARISON.map((row, i) => (
                <tr key={i} className="border-b border-white/5">
                  <td className="py-3 px-4 text-white">{row.feature}</td>
                  <td className="py-3 px-4 text-center text-white/60">{row.free}</td>
                  <td className="py-3 px-4 text-center text-green-400">{row.paid}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Benefits */}
      <div className="grid md:grid-cols-4 gap-4">
        {[
          { icon: Brain, title: 'AI Ментор', desc: 'Персональний помічник 24/7' },
          { icon: BookOpen, title: 'Всі курси', desc: '5+ преміум курсів' },
          { icon: MessageCircle, title: 'Підтримка', desc: 'Швидка відповідь' },
          { icon: Users, title: 'Спільнота', desc: 'Доступ до чату' },
        ].map((item, i) => (
          <GlassCard key={i} className="p-4 text-center">
            <item.icon className="w-8 h-8 text-purple-400 mx-auto mb-2" />
            <p className="text-white font-medium">{item.title}</p>
            <p className="text-white/50 text-sm">{item.desc}</p>
          </GlassCard>
        ))}
      </div>

      {/* FAQ */}
      <GlassCard className="p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Часті питання</h2>
        <div className="space-y-4">
          {[
            {
              q: 'Чи можу я скасувати підписку?',
              a: 'Так, ви можете скасувати підписку в будь-який момент. Доступ залишиться до кінця оплаченого періоду.',
            },
            {
              q: 'Які методи оплати доступні?',
              a: 'Приймаємо карти Visa, Mastercard через WayForPay, а також Apple Pay та Google Pay.',
            },
            {
              q: 'Чи є гарантія повернення коштів?',
              a: 'Так, протягом 7 днів після оплати ви можете повернути кошти без пояснень.',
            },
          ].map((faq, i) => (
            <div key={i} className="p-4 rounded-xl bg-white/5">
              <p className="text-white font-medium mb-1">{faq.q}</p>
              <p className="text-white/60 text-sm">{faq.a}</p>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
