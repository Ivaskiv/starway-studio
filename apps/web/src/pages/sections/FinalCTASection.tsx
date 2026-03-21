// frontend/src/features/landing/sections/FinalCTASection.tsx
import { Play, Sparkles as SparklesIcon } from 'lucide-react';

interface FinalCTASectionProps { onGetStarted: () => void; }

export function FinalCTASection({ onGetStarted }: FinalCTASectionProps) {
  return (
    <section className="py-24 px-5 sm:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="
          relative overflow-hidden rounded-3xl
          border border-[rgba(var(--accent-rgb),0.20)]
          bg-gradient-to-br from-[rgba(var(--accent-rgb),0.08)] to-[rgba(var(--accent-rgb),0.02)]
          p-12 md:p-20 text-center
          shadow-[0_8px_64px_rgba(0,0,0,.4),0_0_60px_rgba(var(--accent-rgb),0.08)]
        ">
          {/* orbs */}
          <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full blur-3xl pointer-events-none bg-[rgba(var(--accent-rgb),0.12)]" />
          <div className="absolute -bottom-20 -right-20 w-64 h-64 rounded-full blur-3xl pointer-events-none bg-[rgba(var(--accent-soft-rgb),0.08)]" />

          <div className="absolute top-8 left-8 opacity-20">
            <SparklesIcon className="w-10 h-10 text-[rgb(var(--accent-soft-rgb))] animate-pulse" />
          </div>
          <div className="absolute bottom-8 right-8 opacity-10">
            <SparklesIcon className="w-14 h-14 text-[rgb(var(--accent-rgb))] animate-pulse delay-[600ms]" />
          </div>

          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-black mb-6 text-white">
              Готовий почати{' '}
            <span className="text-[rgb(var(--accent-soft-rgb))]">
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
              className="hero-cta-primary inline-flex items-center gap-2 px-10 py-5 rounded-2xl font-bold text-lg overflow-hidden relative"
            >
              <Play className="w-5 h-5 relative z-[1]" />
              <span className="relative z-[1]">Почати безкоштовно</span>
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