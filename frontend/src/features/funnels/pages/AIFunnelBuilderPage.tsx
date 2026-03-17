// frontend/src/features/funnels/pages/AIFunnelBuilderPage.tsx
// 11-крокова AI-воронка з ProducerIcon підказками

import { useEffect, useRef, useState } from 'react'
import { ProducerIcon }          from '@/features/ai-generator/components/ProducerIcon'
import { useGenerateFunnelMutation } from '../services/funnels.api'
import { cn } from '@/lib/utils'

const STEPS = [
  { id: 1,  key: 'targetAudience',  label: 'Цільова аудиторія',  tip: 'Опиши свою ЦА: хто вони, яка головна біль, що шукають?' },
  { id: 2,  key: 'mainProblem',     label: 'Головна проблема',   tip: 'Яку одну конкретну проблему вирішує твій продукт?' },
  { id: 3,  key: 'solution',        label: 'Рішення',             tip: 'Як твій продукт вирішує цю проблему? Конкретно, без маркетингу.' },
  { id: 4,  key: 'uniqueness',      label: 'Унікальність',        tip: 'Чому саме ти? Що є тільки у тебе?' },
  { id: 5,  key: 'socialProof',     label: 'Докази',              tip: 'Результати клієнтів, кейси, цифри — що є?' },
  { id: 6,  key: 'offer',           label: 'Оффер',               tip: 'Що саме продаєш, за яку ціну, що входить?' },
  { id: 7,  key: 'leadMagnet',      label: 'Лід-магніт',          tip: 'Що безкоштовне даєш на вході воронки?' },
  { id: 8,  key: 'tripwire',        label: 'Трипвайр',            tip: 'Недорогий продукт для першого кроку — є? Яка ціна?' },
  { id: 9,  key: 'mainProduct',     label: 'Основний продукт',    tip: 'Назва, формат, ціна, тривалість основного продукту.' },
  { id: 10, key: 'upsell',          label: 'Апсейл',              tip: 'Що пропонуєш після покупки? VIP, індивідуальне, наставництво?' },
  { id: 11, key: 'traffic',         label: 'Трафік',              tip: 'Звідки приводиш людей: Instagram, Telegram, YouTube, SEO?' },
] as const

type StepKey = typeof STEPS[number]['key']
type FormData = Partial<Record<StepKey, string>>

export default function AIFunnelBuilderPage() {
  const [step,     setStep]     = useState<number>(0)   // 0 = intro, 1-11 = кроки, 12 = результат
  const [formData, setFormData] = useState<FormData>({})
  const [result,   setResult]   = useState<string>('')

  const [generate, { isLoading }] = useGenerateFunnelMutation()

  const current = STEPS[step - 1]

  const handleNext = async () => {
    if (step < 11) {
      setStep(s => s + 1)
    } else {
      // Генеруємо воронку
      const res = await generate({ answers: formData }).unwrap()
      setResult(res.funnel)
      setStep(12)
    }
  }

  const progress = step === 0 ? 0 : Math.round((step / 11) * 100)
  const progressFillRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (progressFillRef.current) {
      progressFillRef.current.style.setProperty('--progress', `${progress}%`)
    }
  }, [progress])

  // ── Intro ──
  if (step === 0) return (
    <div className="max-w-lg mx-auto px-5 py-12 space-y-6 animate-fade-up">
      <div className="flex items-start gap-3">
        <div>
          <h1 className="text-2xl font-bold gradient-text mb-2">AI-Воронка</h1>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            11 питань — і AI збудує тобі повну маркетингову воронку:
            лід-магніт → трипвайр → основний продукт → апсейл.
          </p>
        </div>
        <ProducerIcon tip="Я проведу тебе через 11 кроків. Відповідай чесно і конкретно — без маркетингових кліше." />
      </div>

      <div className="liquid-glass p-4 rounded-2xl flex flex-wrap gap-2">
        {STEPS.map(s => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStep(s.id)}
            title={s.tip}
            aria-label={s.label}
            className={cn(
              'nav-tab-responsive',
              'producer-tab',
            )}
          >
            <span className="btn-icon" aria-hidden="true">
              <span className="text-[0.75rem] font-mono leading-none">{s.id}</span>
            </span>
            <span className="nav-tab-label">{s.label}</span>
          </button>
        ))}
      </div>

      <button className="btn-primary w-full py-3 rounded-xl" onClick={() => setStep(1)}>
        Починаємо →
      </button>
    </div>
  )

  // ── Result ──
  if (step === 12) return (
    <div className="max-w-2xl mx-auto px-5 py-8 space-y-5 animate-fade-up">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold gradient-text">Твоя воронка готова</h2>
        <ProducerIcon tip="Це структура воронки. Реалізуй крок за кроком — не все одразу." side="left" />
      </div>
      <div className="liquid-glass p-5">
        <pre className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed font-sans">
          {result}
        </pre>
      </div>
      <div className="flex gap-3">
        <button className="theme-btn-secondary flex-1 py-2.5 rounded-xl text-sm"
          onClick={() => { setStep(0); setFormData({}); setResult('') }}>
          Почати знову
        </button>
        <button className="btn-primary flex-1 py-2.5 rounded-xl text-sm"
          onClick={() => navigator.clipboard.writeText(result)}>
          Скопіювати
        </button>
      </div>
    </div>
  )

  // ── Step ──
  return (
    <div className="max-w-lg mx-auto px-5 py-8 space-y-6 animate-fade-up">

      {/* Progress */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-[var(--text-muted)]">
          <span>Крок {step} з 11</span>
          <span>{progress}%</span>
        </div>
          <div className="h-1.5 rounded-full bg-[var(--glass-bg)] overflow-hidden">
            <div
              ref={progressFillRef}
              className="h-full rounded-full transition-all duration-500 bg-[var(--accent)] w-[var(--progress,0%)]"
            />
          </div>
        </div>

      {/* Question */}
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest mb-1">
            Крок {step}
          </p>
          <h2 className="text-lg font-bold text-[var(--text-primary)]">
            {current.label}
          </h2>
        </div>
        <ProducerIcon tip={current.tip} side="left" />
      </div>

      {/* Textarea */}
      <textarea
        className="
          w-full min-h-[120px] p-4 rounded-xl text-sm
          bg-[var(--glass-bg)] border border-[var(--border-glass)]
          text-[var(--text-primary)] placeholder:text-[var(--text-muted)]
          focus:outline-none focus:border-[var(--border-accent)]
          resize-none transition-colors
        "
        placeholder={`${current.tip}`}
        value={formData[current.key] ?? ''}
        onChange={e => setFormData(prev => ({ ...prev, [current.key]: e.target.value }))}
      />

      {/* Nav */}
      <div className="flex gap-3">
        {step > 1 && (
          <button
            className="theme-btn-secondary flex-1 py-2.5 rounded-xl text-sm"
            onClick={() => setStep(s => s - 1)}
          >
            ← Назад
          </button>
        )}
        <button
          className="btn-primary flex-1 py-2.5 rounded-xl text-sm disabled:opacity-50"
          onClick={handleNext}
          disabled={isLoading || !formData[current.key]?.trim()}
        >
          {step === 11 ? (isLoading ? 'Генерую...' : '✨ Згенерувати воронку') : 'Далі →'}
        </button>
      </div>
    </div>
  )
}

// import { useEffect } from 'react';
// import { useSearchParams } from 'react-router-dom';

// import AIGeneratorPage from '@/features/ai-generator/pages/AIGeneratorPage';

// export default function AIFunnelBuilderPage() {
//   const [searchParams, setSearchParams] = useSearchParams();

//   useEffect(() => {
//     if (searchParams.get('tab') === 'funnel') return;
//     const next = new URLSearchParams(searchParams);
//     next.set('tab', 'funnel');
//     setSearchParams(next, { replace: true });
//   }, [searchParams, setSearchParams]);

//   return <AIGeneratorPage />;
// }
