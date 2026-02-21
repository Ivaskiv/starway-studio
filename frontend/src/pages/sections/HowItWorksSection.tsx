// frontend/src/features/landing/sections/HowItWorksSection.tsx
import type { LucideIcon } from 'lucide-react';
import { ArrowRight, Play, Sparkles, Target } from 'lucide-react';
import { GlassCard } from '@/ui/GlassCard';

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
            Як це <span className="text-orange-500">працює</span>
          </h2>
          <p className="text-xl text-white/45">Три кроки до трансформації</p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-6 mb-14">
          {STEPS.map((step, i) => (
            <div key={step.n} className="relative group">
              {/* connector */}
              {i < STEPS.length - 1 && (
                <div className="hidden md:block absolute top-9 left-[calc(100%+12px)] w-6 z-10">
                  <ArrowRight className="w-5 h-5 text-white/15" />
                </div>
              )}

              <GlassCard className="p-7 h-full hover:scale-[1.03] hover:-translate-y-1 transition-all duration-300">
                {/* number */}
                <div className="
                  w-10 h-10 rounded-xl mb-5
                  bg-gradient-to-br from-orange-500 to-rose-500
                  flex items-center justify-center
                  text-xs font-black text-white
                  shadow-lg shadow-orange-500/30
                  group-hover:scale-110 transition-transform
                ">
                  {step.n}
                </div>
                {/* icon */}
                <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-400 mb-4 group-hover:bg-orange-500/20 transition-colors">
                  <step.icon className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-orange-400 transition-colors">
                  {step.title}
                </h3>
                <p className="text-white/50 text-sm leading-relaxed">{step.desc}</p>
              </GlassCard>
            </div>
          ))}
        </div>

        <div className="text-center">
          <button
            onClick={onGetStarted}
            className="
              inline-flex items-center gap-2
              px-8 py-4 rounded-2xl
              bg-gradient-to-r from-orange-500 to-rose-500
              hover:from-orange-400 hover:to-rose-400
              text-white font-semibold
              shadow-2xl shadow-orange-500/25
              hover:scale-105 hover:-translate-y-0.5 transition-all
            "
          >
            Почати зараз <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
}