// frontend/src/features/landing/sections/HeroSection.tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Play, Sparkles, Star, Users } from 'lucide-react';

// ─── Slide data ───────────────────────────────────────────────────────────────

const SLIDES = [
  {
    id:       1,
    eyebrow:  'AI-екосистема для трансформації',
    h1a:      'Досягай цілей з',
    h1b:      'AI‑Ментором',
    sub:      'Автоматизована система: СТАН → ЦІЛЬ → ВИБІР → ДІЯ. Результат за 21 день.',
    cta:      'Спробувати безкоштовно',
    orb1:     'bg-orange-500/20',
    orb2:     'bg-rose-500/15',
    accent:   'from-orange-400 via-rose-400 to-pink-500',
  },
  {
    id:       2,
    eyebrow:  'Колесо балансу',
    h1a:      'Знайди куди',
    h1b:      'зникає енергія',
    sub:      'Оціни 8 сфер життя за 5 хвилин. AI проаналізує слабкі місця та напише персональний план.',
    cta:      'Пройти колесо балансу',
    orb1:     'bg-violet-500/20',
    orb2:     'bg-orange-500/15',
    accent:   'from-violet-400 via-purple-400 to-pink-400',
  },
  {
    id:       3,
    eyebrow:  'Аналітика прогресу',
    h1a:      'Відстежуй своє',
    h1b:      'зростання щодня',
    sub:      'Streak, стабільність, зливи — все в одному дашборді. Кожен крок залишає слід.',
    cta:      'Почати безкоштовно',
    orb1:     'bg-emerald-500/20',
    orb2:     'bg-blue-500/15',
    accent:   'from-emerald-400 via-cyan-400 to-blue-400',
  },
] as const;

const PROOF = [
  { icon: Users, label: '1,247+', sub: 'активних користувачів' },
  { icon: Star,  label: '4.9/5',  sub: 'рейтинг платформи',    fill: true },
] as const;

// ─── Props ────────────────────────────────────────────────────────────────────

interface HeroSectionProps {
  onGetStarted: () => void;
  onLearnMore:  () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function HeroSection({ onGetStarted, onLearnMore }: HeroSectionProps) {
  const [active,  setActive]  = useState(0);
  const [fading,  setFading]  = useState(false);
  const timerRef              = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── helpers ──────────────────────────────────────────────────────────────────
  const stopTimer  = () => { if (timerRef.current) clearInterval(timerRef.current); };
  const startTimer = useCallback(() => {
    stopTimer();
    timerRef.current = setInterval(() => slide(1), 5000);
  }, []);                                                   // eslint-disable-line

  const slide = useCallback((dir: 1 | -1) => {
    setFading(true);
    setTimeout(() => {
      setActive(prev => (prev + dir + SLIDES.length) % SLIDES.length);
      setFading(false);
    }, 280);
  }, []);

  const goTo = (idx: number) => {
    if (idx === active) return;
    setFading(true);
    setTimeout(() => { setActive(idx); setFading(false); }, 280);
    startTimer();
  };

  useEffect(() => { startTimer(); return stopTimer; }, [startTimer]);

  const s = SLIDES[active];

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-16">

      {/* ── Animated orbs ──────────────────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className={`
          absolute -top-[20%] -left-[10%]
          w-[min(700px,90vw)] h-[min(700px,90vw)]
          rounded-full blur-[120px] transition-all duration-1000
          ${s.orb1}
        `} />
        <div className={`
          absolute -bottom-[10%] -right-[10%]
          w-[min(600px,80vw)] h-[min(600px,80vw)]
          rounded-full blur-[100px] transition-all duration-1000
          ${s.orb2}
        `} />
        {/* grid texture */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.3) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div
        className={`
          relative z-10 w-full max-w-5xl mx-auto px-5 sm:px-8
          text-center
          transition-all duration-300
          ${fading ? 'opacity-0 translate-y-3' : 'opacity-100 translate-y-0'}
        `}
      >
        {/* Eyebrow badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm text-sm font-medium text-white/80">
          <Sparkles className="w-3.5 h-3.5 text-orange-400" />
          {s.eyebrow}
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl md:text-[78px] font-black leading-[1.08] tracking-tight mb-6 text-white">
          {s.h1a}
          <br />
          <span className={`bg-gradient-to-r ${s.accent} bg-clip-text text-transparent`}>
            {s.h1b}
          </span>
        </h1>

        {/* Sub */}
        <p className="text-lg sm:text-xl md:text-2xl text-white/55 mb-12 max-w-2xl mx-auto leading-relaxed">
          {s.sub}
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-14">
          <button
            onClick={onGetStarted}
            className="
              inline-flex items-center justify-center gap-2
              px-8 py-4 rounded-2xl
              bg-gradient-to-r from-orange-500 to-rose-500
              hover:from-orange-400 hover:to-rose-400
              text-white font-semibold text-base
              shadow-2xl shadow-orange-500/30
              hover:scale-105 hover:-translate-y-0.5
              transition-all duration-200
            "
          >
            <Play className="w-5 h-5" />
            {s.cta}
          </button>
          <button
            onClick={onLearnMore}
            className="
              inline-flex items-center justify-center gap-2
              px-8 py-4 rounded-2xl
              border border-white/12 bg-white/5 backdrop-blur-sm
              text-white/80 font-medium text-base
              hover:bg-white/10 hover:text-white
              hover:scale-105 hover:-translate-y-0.5
              transition-all duration-200
            "
          >
            Як це працює
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Social proof */}
        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
          {PROOF.map(p => (
            <div key={p.label} className="flex items-center gap-2 text-sm text-white/50">
              <p.icon
                className="w-4 h-4 text-orange-400"
                {...('fill' in p && p.fill ? { fill: 'currentColor' } : {})}
              />
              <strong className="text-white font-semibold">{p.label}</strong>
              {p.sub}
            </div>
          ))}
        </div>
      </div>

      {/* ── Slider controls ─────────────────────────────────────────────────── */}
      <div className="relative z-10 mt-16 flex items-center gap-5">
        {/* Prev */}
        <button
          onClick={() => { slide(-1); startTimer(); }}
          className="p-2.5 rounded-xl border border-white/10 bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-all hover:scale-110"
          aria-label="Попередній"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Dots */}
        <div className="flex items-center gap-2.5">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Слайд ${i + 1}`}
              className={`
                rounded-full transition-all duration-300
                ${i === active
                  ? 'w-8 h-2.5 bg-orange-500 shadow-md shadow-orange-500/40'
                  : 'w-2.5 h-2.5 bg-white/20 hover:bg-white/40'}
              `}
            />
          ))}
        </div>

        {/* Next */}
        <button
          onClick={() => { slide(1); startTimer(); }}
          className="p-2.5 rounded-xl border border-white/10 bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-all hover:scale-110"
          aria-label="Наступний"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* ── Progress bar ────────────────────────────────────────────────────── */}
      <div className="relative z-10 mt-6 flex gap-1.5">
        {SLIDES.map((_, i) => (
          <div key={i} className="h-0.5 w-12 rounded-full bg-white/10 overflow-hidden">
            <div
              className={`h-full bg-orange-500 origin-left transition-none ${i === active ? 'animate-progress-bar' : 'scale-x-0'}`}
              style={i === active ? { animation: 'progressBar 5s linear forwards' } : {}}
            />
          </div>
        ))}
      </div>

      {/* ── Scroll indicator ────────────────────────────────────────────────── */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 opacity-30 animate-bounce">
        <div className="w-px h-8 bg-white/40 rounded-full" />
        <div className="w-1.5 h-1.5 rounded-full bg-white/60" />
      </div>

      {/* ── CSS keyframe ────────────────────────────────────────────────────── */}
      <style>{`
        @keyframes progressBar {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
      `}</style>
    </section>
  );
}