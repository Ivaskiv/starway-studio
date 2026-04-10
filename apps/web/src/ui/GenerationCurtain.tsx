import { Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

type GenerationCurtainProps = {
  open: boolean
  title?: string
  subtitle?: string
  compact?: boolean
  className?: string
}

export function useGenerationCurtain(
  active: boolean,
  options?: { enterDelay?: number; minVisibleMs?: number },
) {
  const enterDelay = options?.enterDelay ?? 140
  const minVisibleMs = options?.minVisibleMs ?? 1100
  const [visible, setVisible] = useState(false)
  const shownAtRef = useRef<number | null>(null)

  useEffect(() => {
    let enterTimer: number | undefined
    let hideTimer: number | undefined

    if (active) {
      enterTimer = window.setTimeout(() => {
        shownAtRef.current = Date.now()
        setVisible(true)
      }, enterDelay)
    } else if (visible) {
      const elapsed = shownAtRef.current ? Date.now() - shownAtRef.current : minVisibleMs
      const remaining = Math.max(minVisibleMs - elapsed, 0)

      hideTimer = window.setTimeout(() => {
        shownAtRef.current = null
        setVisible(false)
      }, remaining)
    } else {
      shownAtRef.current = null
      setVisible(false)
    }

    return () => {
      if (enterTimer) window.clearTimeout(enterTimer)
      if (hideTimer) window.clearTimeout(hideTimer)
    }
  }, [active, enterDelay, minVisibleMs, visible])

  return visible
}

export async function withMinimumDelay<T>(task: Promise<T>, minDelayMs = 950): Promise<T> {
  const [result] = await Promise.all([
    task,
    new Promise(resolve => window.setTimeout(resolve, minDelayMs)),
  ])

  return result
}

export function GenerationCurtain({
  open,
  title = 'Збираємо результат',
  subtitle = 'Система аналізує дані, формує підсумок і готує наступний крок.',
  compact = false,
  className = '',
}: GenerationCurtainProps) {
  if (!open) return null

  return (
    <div
      className={[
        'absolute inset-0 z-[6] flex items-center justify-center rounded-[inherit]',
        'bg-[linear-gradient(180deg,rgba(5,8,16,0.78),rgba(5,8,16,0.9))]',
        className,
      ].join(' ')}
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className={[
          'mx-4 w-full max-w-[26rem] rounded-[24px] border border-[rgba(var(--accent-rgb),0.16)]',
          'bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))]',
          'px-5 py-5 text-center shadow-[0_22px_50px_rgba(0,0,0,0.34)]',
          compact ? 'max-w-[22rem] px-4 py-4' : '',
        ].join(' ')}
      >
        <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-[rgba(var(--accent-rgb),0.18)] bg-[rgba(var(--accent-rgb),0.08)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-[rgb(var(--accent-soft-rgb))]">
          <Sparkles className="h-3.5 w-3.5 animate-pulse" />
          Starway Mentor
        </div>

        <div className="mt-4 flex items-center justify-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[rgb(var(--accent-soft-rgb))] animate-pulse" />
          <span className="h-2.5 w-2.5 rounded-full bg-[rgba(var(--accent-rgb),0.82)] [animation-delay:160ms] animate-pulse" />
          <span className="h-2.5 w-2.5 rounded-full bg-[rgba(255,255,255,0.55)] [animation-delay:320ms] animate-pulse" />
        </div>

        <p className="mt-4 text-lg font-semibold text-[var(--text-primary)]">{title}</p>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{subtitle}</p>

        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
          <div className="generation-curtain__bar h-full rounded-full bg-[linear-gradient(90deg,rgba(var(--accent-rgb),0.3),rgba(var(--accent-soft-rgb),0.92),rgba(255,255,255,0.9))]" />
        </div>
      </div>
    </div>
  )
}
