// frontend/src/features/landing/sections/PricingSection.tsx
import { CheckCircle2 } from 'lucide-react';
import { GlassCard } from '@/ui/GlassCard';

interface Plan {
  name:     string;
  price:    string;
  period:   string;
  desc:     string;
  features: string[];
  cta:      string;
  popular:  boolean;
}

const PLANS: Plan[] = [
  {
    name: 'Free', price: '0', period: 'назавжди', popular: false,
    desc: 'Спробуйте базові функції без карти',
    features: ['Колесо балансу (1/місяць)', 'Щоденний цикл', 'Базова аналітика', 'AI Ментор (обмежено)'],
    cta: 'Почати безкоштовно',
  },
  {
    name: 'Premium', price: '33', period: 'на місяць', popular: true,
    desc: 'Повний доступ до всіх модулів',
    features: ['Все з Free +', 'Необмежений AI Ментор', 'Бачення + Цілі', 'Zoom-сесії (щотижня)', 'Консультації', 'Пріоритетна підтримка'],
    cta: 'Спробувати 7 днів безкоштовно',
  },
];

interface PricingSectionProps { onSelectPlan: () => void; }

export function PricingSection({ onSelectPlan }: PricingSectionProps) {
  return (
    <section className="py-24 px-5 sm:px-8 bg-gradient-to-b from-slate-950/20 to-transparent">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black mb-4 text-white">
            Прозорі <span className="text-orange-500">ціни</span>
          </h2>
          <p className="text-xl text-white/45">Починай безкоштовно — оновись коли готовий</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {PLANS.map(plan => (
            <div key={plan.name} className={`relative ${plan.popular ? 'md:-translate-y-3' : ''}`}>
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 text-xs font-bold text-white shadow-lg shadow-orange-500/30 z-10 whitespace-nowrap">
                  Найпопулярніший
                </div>
              )}
              <GlassCard
                className={`p-8 h-full transition-all duration-300 hover:scale-[1.02] ${
                  plan.popular ? 'border-orange-500/40 shadow-2xl shadow-orange-500/10' : ''
                }`}
              >
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-black text-white mb-3">{plan.name}</h3>
                  <div className="flex items-end justify-center gap-1 mb-1">
                    <span className="text-6xl font-black text-white">{plan.price}</span>
                    <span className="text-2xl text-white/40 mb-2">€</span>
                  </div>
                  <p className="text-white/40 text-sm mb-2">{plan.period}</p>
                  <p className="text-white/55 text-sm">{plan.desc}</p>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-3 text-sm text-white/70">
                      <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={onSelectPlan}
                  className={`
                    w-full py-3.5 rounded-xl font-semibold text-sm transition-all hover:scale-105
                    ${plan.popular
                      ? 'bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-400 hover:to-rose-400 text-white shadow-lg shadow-orange-500/25'
                      : 'border border-white/15 bg-white/5 text-white hover:bg-white/10'}
                  `}
                >
                  {plan.cta}
                </button>

                {plan.popular && (
                  <p className="text-center text-xs text-white/30 mt-3">Скасувати можна будь-коли</p>
                )}
              </GlassCard>
            </div>
          ))}
        </div>

        <p className="text-center mt-8 text-sm text-white/30">
          💳 Карта не потрібна для Free · ✨ 7 днів trial Premium без оплати
        </p>
      </div>
    </section>
  );
}