// frontend/src/features/landing/sections/TestimonialsSection.tsx
import { GlassCard } from '@/ui/GlassCard';
import { Quote, Star } from 'lucide-react';

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
            Що кажуть {' '}
            
                        <span className="text-[rgb(var(--accent-soft-rgb))]">користувачі</span>

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
                <Quote className="absolute -top-3 -right-3 w-24 h-24 text-[rgba(var(--accent-rgb),0.05)] group-hover:text-[rgba(var(--accent-rgb),0.10)] transition-colors" />

                <div className="relative z-10">
                  <div className="flex gap-0.5 mb-4">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-amber-400" fill="currentColor" />
                    ))}
                  </div>
                  <p className="text-white/65 text-sm leading-relaxed mb-6">"{t.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="
                      w-11 h-11 rounded-full font-bold text-white text-sm
                      flex items-center justify-center
                      bg-[rgba(var(--accent-rgb),0.20)]
                      border border-[rgba(var(--accent-rgb),0.35)]
                      text-[rgb(var(--accent-rgb))]
                      shadow-[0_4px_12px_rgba(var(--accent-rgb),0.25)]
                    ">
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
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full border border-[rgba(var(--accent-rgb),0.15)] bg-[rgba(var(--accent-rgb),0.05)]">
            <div className="flex -space-x-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="
                    w-7 h-7 rounded-full border-2 border-black
                    flex items-center justify-center
                    text-[10px] font-bold
                    bg-[rgba(var(--accent-rgb),0.25)]
                    text-[rgb(var(--accent-soft-rgb))]
                  "
                >
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