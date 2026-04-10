import { MoonStar, SunMedium } from 'lucide-react'

interface SessionHeaderProps {
  session: 'morning' | 'evening'
  dayNumber: number
  current: number
  total: number
  progress: number
  recoveryLabel?: string | null
}

const PROGRESS_WIDTH = [
  'w-0',
  'w-[10%]',
  'w-[20%]',
  'w-[30%]',
  'w-[40%]',
  'w-[50%]',
  'w-[60%]',
  'w-[70%]',
  'w-[80%]',
  'w-[90%]',
  'w-full',
] as const

export function SessionHeader({ session, dayNumber, current, total, progress, recoveryLabel }: SessionHeaderProps) {
  const widthClass = PROGRESS_WIDTH[Math.max(0, Math.min(10, Math.round(progress / 10)))]

  return (
    <div className="glass-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[rgb(var(--accent-soft-rgb))]">
            {session === 'morning' ? '🌅 Ранок' : '🌙 Вечір'} · День {dayNumber}
            {recoveryLabel ? ` · ${recoveryLabel}` : ''}
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">
            {session === 'morning' ? 'Почни день з ясного фокусу' : 'Підсумуй день спокійно'}
          </h2>
          <p className="mt-1.5 text-sm text-white/60">
            Питання {current} з {total}
          </p>
        </div>

        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-lg text-white/85">
          {session === 'morning' ? <SunMedium className="h-5 w-5" /> : <MoonStar className="h-5 w-5" />}
        </span>
      </div>

      <div className="mt-3.5 h-1.5 rounded-full bg-white/8">
        <div className={`h-full rounded-full bg-[rgb(var(--accent-soft-rgb))] transition-all duration-300 ${widthClass}`} />
      </div>
    </div>
  )
}

export default SessionHeader
