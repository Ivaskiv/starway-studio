import { CheckCircle2 } from 'lucide-react'

import { Button } from '@/ui'

interface WheelOnboardingProps {
  completed?: boolean
  onStartDiagnosis: () => void
  onGoToMorning: () => void
  continueLabel?: string
}

export function WheelOnboarding({
  completed = false,
  onStartDiagnosis,
  onGoToMorning,
  continueLabel = 'Перейти до ранкової сесії',
}: WheelOnboardingProps) {
  if (completed) {
    return (
      <div className="glass-card mx-auto max-w-2xl border border-emerald-400/20 bg-emerald-500/10 p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-2xl font-semibold text-white">Відмінно! Аналізуємо твої результати...</h2>
        <p className="mt-2 text-sm leading-relaxed text-white/65">
          Твій план готовий. Наступний крок відкриє річний фокус або щоденний цикл.
        </p>
        <div className="mt-6 flex justify-center">
          <Button onClick={onGoToMorning} size="lg" variant="solid">
            {continueLabel}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card mx-auto max-w-2xl border border-[rgba(var(--accent-rgb),0.22)] bg-[rgba(var(--accent-rgb),0.08)] p-6">
      <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(var(--accent-rgb),0.18)] bg-[rgba(var(--accent-rgb),0.08)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[rgb(var(--accent-soft-rgb))]">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[rgba(var(--accent-rgb),0.22)] bg-[rgba(var(--accent-rgb),0.14)] text-[10px] leading-none text-white">1</span>
        <span>Крок 1 · Обов&apos;язково</span>
      </div>
      <h1 className="mt-3 text-3xl font-semibold text-white">Спочатку — діагностика твого стану</h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/68">
        Це 5-хвилинна діагностика. Без неї система не знає, куди тебе вести.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button onClick={onStartDiagnosis} size="lg" variant="solid" className="min-w-[240px]">
          <span className="inline-flex items-center gap-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-white/80" />
            Розпочати діагностику →
          </span>
        </Button>
      </div>
    </div>
  )
}

export default WheelOnboarding
