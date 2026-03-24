import type { ComponentType } from 'react'

import GameBadge from '@/components/miniapp/GameBadge'
import { ROUTES } from '@/config/routes'
import type { MentorContext } from '@/features/ai-mentor/types/mentor.types'
import {
  BookOpen,
  Bot,
  ChevronRight,
  Sparkles,
  Waypoints,
} from 'lucide-react'

type HomePageProps = {
  ctx?: MentorContext
  firstName: string
  levelTitle: string
  profileXp?: number
  trialDay: number | null
  latestWheelScore: number | null
  bitmind: number
  mindxp: number
  neurogems: number
  xpPercent: number
  onOpenMentor: () => void
  onOpenLibrary: () => void
  onOpenProgress: () => void
  onNavigate: (path: string) => void
}

const LIBRARY_PREVIEW = [
  'Щоденний цикл',
  'Колесо балансу',
  'Практика "Без ілюзій"',
] as const

export default function HomePage({
  ctx,
  firstName,
  levelTitle,
  profileXp,
  trialDay,
  latestWheelScore,
  bitmind,
  mindxp,
  neurogems,
  xpPercent,
  onOpenMentor,
  onOpenLibrary,
  onOpenProgress,
  onNavigate,
}: HomePageProps) {
  const currentDay = Math.min(Math.max(trialDay ?? 1, 1), 7)

  return (
    <div className="space-y-4">
      <GameBadge
        bitmind={bitmind}
        mindxp={mindxp}
        neurogems={neurogems}
        level={levelTitle}
        xpPercent={xpPercent}
      />

      <div className="ios-glass overflow-hidden">
        <div className="grid gap-0 md:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
          <div className="border-b border-[var(--glass-border)] px-4 py-4 md:border-b-0 md:border-r md:px-5 md:py-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[rgb(var(--accent-soft-rgb))]">
              Головна
            </p>
            <h2 className="mt-3 text-[26px] font-black leading-[1.08] text-[var(--text-primary)] md:text-[30px]">
              Вийди із застою.
              <br />
              <span className="text-[rgb(var(--accent-soft-rgb))]">Побудуй систему.</span>
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
              Привіт, {firstName}. Той самий кабінет, але зібраний під планшет і телефон: швидкий вхід у цикл,
              AI-ментора, бібліотеку й прогрес без втрати структури сайту.
            </p>
            <button
              type="button"
              onClick={() => onNavigate(ROUTES.CYCLE)}
              className="hero-cta-primary mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-semibold md:w-auto"
            >
              ▶ Почати сесію
            </button>
          </div>

          <div className="grid gap-3 px-4 py-4 md:px-5 md:py-5">
            <ActionCard
              title="AI Ментор"
              sub="Твій персональний AI для трансформації"
              icon={Bot}
              onClick={onOpenMentor}
            />
            <TrackerPreviewCard
              score={latestWheelScore}
              progress={xpPercent}
              onClick={onOpenProgress}
            />
            <LibraryPreviewCard onClick={onOpenLibrary} />
            <ActionCard
              title="Щоденний цикл"
              sub={trialDay ? `День ${trialDay} · ранкові та вечірні сесії` : 'Ранкова й вечірня рефлексія'}
              icon={Sparkles}
              onClick={() => onNavigate(ROUTES.CYCLE)}
            />
          </div>
        </div>
      </div>

      <div className="ios-glass px-4 py-4 md:px-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-[var(--text-primary)]">Streak календар</p>
            <p className="text-xs text-[var(--text-secondary)]">
              7 днів фокусу. Поточний ритм: {mindxp} дн.
            </p>
          </div>
          <span className="text-xs font-semibold text-[rgb(var(--accent-soft-rgb))]">
            XP left {profileXp ?? '—'}
          </span>
        </div>

        <div className="grid grid-cols-7 gap-2 md:gap-3">
          {Array.from({ length: 7 }).map((_, index) => {
            const day = index + 1
            const isCurrent = day === currentDay
            const isDone = day < currentDay

            return (
              <div
                key={day}
                className={[
                  'rounded-2xl border px-2 py-3 text-center transition-all',
                  isCurrent
                    ? 'border-[rgba(var(--accent-soft-rgb),0.36)] bg-[rgba(var(--accent-soft-rgb),0.12)] shadow-[0_10px_18px_rgba(var(--accent-rgb),0.12)]'
                    : isDone
                      ? 'border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.05)]'
                      : 'border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.025)] opacity-70'
                ].join(' ')}
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                  {day}
                </p>
                <p className="mt-1 text-xs font-bold text-[var(--text-primary)]">
                  {isCurrent ? 'зараз' : isDone ? 'done' : '—'}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function ActionCard({
  title,
  sub,
  icon: Icon,
  onClick,
}: {
  title: string
  sub: string
  icon: ComponentType<{ className?: string }>
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ios-glass text-left transition-all hover:-translate-y-0.5"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="btn-icon h-10 w-10 rounded-2xl">
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />
      </div>
      <p className="text-sm font-bold text-[var(--text-primary)]">{title}</p>
      <p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)]">{sub}</p>
    </button>
  )
}

function TrackerPreviewCard({
  score,
  progress,
  onClick,
}: {
  score: number | null
  progress: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ios-glass text-left transition-all hover:-translate-y-0.5"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="btn-icon h-10 w-10 rounded-2xl">
          <Waypoints className="h-[18px] w-[18px]" />
        </span>
        <span className="text-xs font-semibold text-[rgb(var(--accent-soft-rgb))]">0/100</span>
      </div>
      <p className="text-sm font-bold text-[var(--text-primary)]">Трекер Ювеліра</p>
      <p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)]">
        {score != null ? `Баланс ${score.toFixed(1)}/10 · мінібар прогресу` : 'Прогрес по гранях і щоденному фокусу'}
      </p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,rgba(var(--accent-soft-rgb),0.95),rgba(var(--accent-rgb),0.82))]"
          style={{ width: `${Math.max(6, progress)}%` }}
        />
      </div>
    </button>
  )
}

function LibraryPreviewCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ios-glass text-left transition-all hover:-translate-y-0.5"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="btn-icon h-10 w-10 rounded-2xl">
          <BookOpen className="h-[18px] w-[18px]" />
        </span>
        <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />
      </div>
      <p className="text-sm font-bold text-[var(--text-primary)]">Бібліотека</p>
      <div className="mt-2 space-y-1.5">
        {LIBRARY_PREVIEW.map(item => (
          <p key={item} className="text-xs leading-relaxed text-[var(--text-secondary)]">
            • {item}
          </p>
        ))}
      </div>
    </button>
  )
}
