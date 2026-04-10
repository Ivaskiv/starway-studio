// frontend/src/features/landing/sections/HeroSection.tsx
import { ArrowRight, ChevronLeft, ChevronRight, Play, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

const SLIDES = [
  {
    eyebrow: 'Менторська екосистема · Starway Studio',
    h1a: 'Вийди із застою.',
    h1b: 'Побудуй систему.',
    h1c: 'Живи результат.',
    sub: 'Підтримка 24/7. Система: СТАН → ЦІЛЬ → ВИБІР → ДІЯ.',
    cta: 'Почати безкоштовно',
    note: 'Без карти · Відразу',
  },
  {
    eyebrow: 'Колесо балансу · 8 сфер',
    h1a: 'Знайди куди',
    h1b: 'зникає енергія.',
    h1c: 'Аналіз покаже точно.',
    sub: 'Оціни 8 сфер за 5 хвилин. Ми проаналізуємо дисбаланс і сформуємо персональний план дій.',
    cta: 'Пройти колесо балансу',
    note: 'Безкоштовно · 1 колесо',
  },
  {
    eyebrow: 'Аналітика прогресу · Стрік',
    h1a: 'Кожен крок',
    h1b: 'залишає слід.',
    h1c: 'Нічого не губиться.',
    sub: 'Streak, стабільність, зливи — все в одному дашборді. Тижневий звіт.',
    cta: 'Спробувати 7 днів',
    note: '3 місяці — середній результат',
  },
] as const

const PROOF = [
  { val: '2,400+', label: 'пройшли шлях' },
  { val: '89%',    label: 'бачать зміни за 21 день' },
  { val: '4.9/5',  label: 'рейтинг' },
] as const

interface HeroSectionProps {
  onGetStarted: () => void
  onLearnMore:  () => void
}

export function HeroSection({ onGetStarted, onLearnMore }: HeroSectionProps) {
  const [active, setActive] = useState(0)
  const [fading, setFading] = useState(false)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  const stop  = () => { if (timer.current) clearInterval(timer.current) }
  const start = useCallback(() => {
    stop()
    timer.current = setInterval(() => go(1), 8000)
  }, []) // eslint-disable-line

  const go = useCallback((dir: 1 | -1) => {
    setFading(true)
    setTimeout(() => {
      setActive(p => (p + dir + SLIDES.length) % SLIDES.length)
      setFading(false)
    }, 260)
  }, [])

  const goTo = (i: number) => {
    if (i === active) return
    setFading(true)
    setTimeout(() => { setActive(i); setFading(false) }, 260)
    start()
  }

  useEffect(() => { start(); return stop }, [start])

  const s = SLIDES[active]

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[color:var(--bg-primary)] py-8 text-center">

      {/* ── Background ───────────────────────────────────────── */}
      <div className="hero-background" aria-hidden>
        <div className="hero-background__gradient" />
        <div className="hero-background__halo hero-background__halo--top" />
        <div className="hero-background__halo hero-background__halo--bottom" />
        <div className="hero-background__grid" />
        <div className="hero-background__beam" />
        <div className="hero-background__spot" />
      </div>

      {/* ── Контент ───────────────────────────────────────────── */}
      <div className="relative z-10 mx-auto flex w-full max-w-[1600px] flex-col items-center px-6">
        <div className={`w-full max-w-4xl transition-all duration-300 ${fading ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full border border-[rgba(var(--accent-rgb),0.3)] bg-[rgba(var(--accent-rgb),0.08)] text-[rgb(var(--accent-soft-rgb))] text-[11px] font-bold tracking-[.14em] uppercase">
          <span className="w-[6px] h-[6px] rounded-full bg-[rgb(var(--accent-soft-rgb))] shadow-[0_0_7px_rgb(var(--accent-soft-rgb))] animate-pulse" />
          <Sparkles className="w-3 h-3" />
          {s.eyebrow}
        </div>

        {/* H1 */}
        <h1 className="hero-h1 font-black leading-[1.05] tracking-tight text-[clamp(2.4rem,5.5vw,4rem)] mb-5">
          <span className="block text-white">{s.h1a}</span>
          <span className="block text-[rgb(var(--accent-soft-rgb))]">{s.h1b}</span>
          <span className="block italic text-[.9em] text-[color:var(--text-muted)]">{s.h1c}</span>
        </h1>

        {/* Sub */}
        <p className="text-[clamp(15px,2.2vw,19px)] leading-[1.68] text-[color:var(--text-secondary)] max-w-[540px] mx-auto mb-2">
          {s.sub}
        </p>
        <p className="text-[13px] text-[color:var(--text-muted)] mb-9">{s.note}</p>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
          <button
            onClick={onGetStarted}
            className="hero-cta-primary inline-flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4" />
            {s.cta}
          </button>

          <button
            onClick={onLearnMore}
            className="hero-cta-secondary inline-flex items-center justify-center gap-2"
          >
            Як це працює <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* <div className="mb-10 flex justify-center">
          <a
            href="https://tg.pulse.is/Starway_byNadya_Bot?start=69b937fefa457b8036094169&username=value1&telegram_id=value2"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-2xl border border-white/20 px-6 py-3 text-sm text-white/70 transition-colors hover:border-white/40 hover:text-white"
          >
            ← тест: перехід із соцмереж (лідмагніт)
          </a>
        </div> */}

        {/* Social proof */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-8">
          {PROOF.map((p, i) => (
            <span key={p.val} className="flex items-center gap-2 text-[13px] text-[color:var(--text-muted)]">
              {i > 0 && <span className="hidden sm:inline text-[rgba(255,255,255,0.1)]">·</span>}
              <strong className="text-[color:var(--text-secondary)] font-semibold">{p.val}</strong> {p.label}
            </span>
          ))}
        </div>
        </div>

        {/* Slider controls */}
        <div className="mt-14 flex items-center gap-5">
          <button
            onClick={() => { go(-1); start() }}
            aria-label="Попередній"
            className="hero-slider-control"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-[12px]">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Слайд ${i + 1}`}
                className={`hero-slider-dot ${i === active ? 'hero-slider-dot--active' : ''}`}
              />
            ))}
          </div>

          <button
            onClick={() => { go(1); start() }}
            aria-label="Наступний"
            className="hero-slider-control"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Progress bars */}
        <div className="mt-5 flex gap-[6px]">
          {SLIDES.map((_, i) => (
            <div
              key={i}
              className="h-px w-12 overflow-hidden rounded-full bg-[rgba(var(--accent-rgb),0.15)]"
            >
              {i === active && (
                <div
                  key={active}
                  className="hero-progress-bar h-full origin-left rounded-full bg-[rgb(var(--accent-soft-rgb))]"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
