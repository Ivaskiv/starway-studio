// frontend/src/features/landing/sections/TestimonialsSection.tsx
import { Quote, Star } from 'lucide-react';
import { GlassCard } from '@/ui/GlassCard';

const TESTIMONIALS = [
  { name: 'Марія К.',   role: 'Підприємець', rating: 5, text: 'За 2 місяці визначила точку Б та зробила конкретні кроки. Колесо балансу показало де зливала енергію.' },
  { name: 'Олексій Г.', role: 'IT Manager',  rating: 5, text: 'Щоденний цикл змінив все. За місяць стабільність з 45% до 82%. Бачу зливи і свідомо обираю.' },
  { name: 'Анна С.',    role: 'Психолог',    rating: 5, text: 'Як психолог, вражена структурованістю. AI Ментор не дає порад — веде по системі. Саме те що треба!' },
] as const;

export function TestimonialsSection() {
  return (
    <section className="py-24 px-5 sm:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black mb-4 text-white">
            Що кажуть <span className="text-orange-500">користувачі</span>
          </h2>
          <p className="text-xl text-white/45">Реальні результати</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map(t => {
            const initials = t.name.split(' ').map(n => n[0]).join('');
            return (
              <GlassCard
                key={t.name}
                className="p-7 relative overflow-hidden group hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300"
              >
                {/* bg quote */}
                <Quote className="absolute -top-3 -right-3 w-24 h-24 text-orange-500/5 group-hover:text-orange-500/10 transition-colors" />

                <div className="relative z-10">
                  <div className="flex gap-0.5 mb-4">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-amber-400" fill="currentColor" />
                    ))}
                  </div>
                  <p className="text-white/65 text-sm leading-relaxed mb-6">"{t.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center font-bold text-white text-sm shadow-lg">
                      {initials}
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm">{t.name}</p>
                      <p className="text-white/40 text-xs">{t.role}</p>
                    </div>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>

        {/* Social proof pill */}
        <div className="mt-14 flex justify-center">
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full border border-white/10 bg-white/5">
            <div className="flex -space-x-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-rose-500 border-2 border-black flex items-center justify-center text-[10px] font-bold text-white">
                  {String.fromCharCode(65 + i)}
                </div>
              ))}
            </div>
            <span className="text-sm text-white/50">
              <strong className="text-white">1,247+</strong> користувачів довіряють нам
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// FinalCTASection
// ─────────────────────────────────────────────────────────────────────────────

// frontend/src/features/landing/sections/FinalCTASection.tsx
import { Play, Sparkles as SparklesIcon } from 'lucide-react';

interface FinalCTASectionProps { onGetStarted: () => void; }

export function FinalCTASection({ onGetStarted }: FinalCTASectionProps) {
  return (
    <section className="py-24 px-5 sm:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="
          relative overflow-hidden rounded-3xl
          border border-white/10
          bg-gradient-to-br from-white/[0.06] to-white/[0.02]
          backdrop-blur-xl
          p-12 md:p-20 text-center
          shadow-[0_8px_64px_rgba(0,0,0,.4)]
        ">
          {/* orbs */}
          <div className="absolute -top-20 -left-20 w-72 h-72 bg-orange-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-rose-500/12 rounded-full blur-3xl pointer-events-none" />

          <div className="absolute top-8 left-8 opacity-15">
            <SparklesIcon className="w-10 h-10 text-orange-400 animate-pulse" />
          </div>
          <div className="absolute bottom-8 right-8 opacity-10">
            <SparklesIcon className="w-14 h-14 text-pink-400 animate-pulse" style={{ animationDelay: '.6s' }} />
          </div>

          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-black mb-6 text-white">
              Готовий почати{' '}
              <span className="bg-gradient-to-r from-orange-400 to-rose-400 bg-clip-text text-transparent">
                трансформацію
              </span>
              ?
            </h2>

            <p className="text-xl text-white/50 mb-10 max-w-xl mx-auto">
              Приєднуйся до <strong className="text-white">1,247+</strong> користувачів,
              які вже змінюють своє життя з AI Ментором
            </p>

            <button
              onClick={onGetStarted}
              className="
                inline-flex items-center gap-2
                px-10 py-5 rounded-2xl
                bg-gradient-to-r from-orange-500 to-rose-500
                hover:from-orange-400 hover:to-rose-400
                text-white font-bold text-lg
                shadow-2xl shadow-orange-500/35
                hover:scale-105 hover:-translate-y-1 transition-all duration-200
              "
            >
              <Play className="w-5 h-5" />
              Почати безкоштовно
            </button>

            <div className="mt-6 flex flex-wrap justify-center gap-6 text-sm text-white/35">
              {['Карта не потрібна', '7 днів trial', 'Скасування будь-коли'].map(t => (
                <span key={t} className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}