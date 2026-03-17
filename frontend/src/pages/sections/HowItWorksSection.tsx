// frontend/src/features/landing/sections/HowItWorksSection.tsx
import { GlassCard } from '@/ui/GlassCard';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight, Play, Sparkles, Target } from 'lucide-react';

interface Step { n: string; icon: LucideIcon; title: string; desc: string; }

const STEPS: Step[] = [
  { n: '01', icon: Play,     title: 'Реєстрація',      desc: 'Email + пароль за 30 секунд. 7 днів trial всіх функцій.' },
  { n: '02', icon: Target,   title: 'Колесо балансу',  desc: 'Оціни 6 сфер. AI будує аналіз та персональний план.' },
  { n: '03', icon: Sparkles, title: 'AI Ментор сесія', desc: 'Визнач ціль, отримай план дій — трансформація починається.' },
];

interface HowItWorksSectionProps { onGetStarted: () => void; }

export function HowItWorksSection({ onGetStarted }: HowItWorksSectionProps) {
  return (
    <section id="how-it-works" className="py-24 px-5 sm:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black mb-4 text-white">
            Як це{' '}
            <span className="text-[rgb(var(--accent-soft-rgb))]">працює</span>
          </h2>
          <p className="text-xl text-white/45">Три кроки до трансформації</p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-6 mb-14">
          {STEPS.map((step, i) => (
            <div key={step.n} className="relative group">
              {i < STEPS.length - 1 && (
                <div className="hidden md:block absolute top-9 left-[calc(100%+12px)] w-6 z-10">
                  <ArrowRight className="w-5 h-5 text-white/50" />
                </div>
              )}

              <GlassCard className="step-card">
                <div className="step-card__badge gap-1 text-[rgb(var(--accent-soft-rgb))]">
                  {step.n}
              

                <div className="step-card__icon">
                  <step.icon className="w-5 h-5 text-[rgb(var(--accent-soft-rgb))]" />
                </div>
  </div>
                <h3 className="step-card-title">{step.title}</h3>
                <p className="step-card-desc text-sm">{step.desc}</p>
              </GlassCard>
            </div>
          ))}
        </div>

        <div className="text-center">
          <button
            onClick={onGetStarted}
            className="hero-cta-primary inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-semibold"
          >
            Почати зараз <ArrowRight className="w-4 h-4 relative z-[1]" />
          </button>
        </div>
      </div>
    </section>
  );
}
