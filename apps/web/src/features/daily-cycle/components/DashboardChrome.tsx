import { useAppSelector } from '@/app/hooks'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useSystemState } from '@/features/auth/hooks/useSystemState'
import { selectUserRole } from '@/features/auth/services/auth.slice'
import { useGetTrialStatusQuery } from '@/features/trial/services/trial.api'
import { useGetLatestWheelAssessmentQuery } from '@/features/wheel/services/wheel.api'
import { WHEEL_CATEGORIES, isWheelSphereId } from '@/features/wheel/types/wheel.types'
import { WheelChart } from '@/features/wheel/components/WheelChart'
import { WheelForm } from '@/features/wheel/components/WheelForm'
import { GlassCard } from '@/ui'
import { Download, RefreshCcw, X } from 'lucide-react'

import {
  FUNNEL_SEGMENTS,
  formatWheelDate,
  toDateKey,
  WHEEL_EMOJI_MAP,
  WHEEL_LABEL_MAP,
} from '@/features/daily-cycle/utils/dashboard.utils'
import { getMentorLifecycleState } from '@/features/trial/utils/mentorLifecycle'

export function Greeting({
  name,
  isExpert,
  isSuperAdmin,
  mode = 'default',
}: {
  name: string
  isExpert: boolean
  isSuperAdmin: boolean
  mode?: 'default' | 'cycle'
}) {
  if (!isExpert && !isSuperAdmin && mode === 'cycle') return null

  if (!isExpert && !isSuperAdmin) {
    return (
      <div className="flex items-start justify-between gap-5 rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(21,32,54,0.82),rgba(10,18,36,0.9))] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl">
        <div>
          <p className="text-2xl font-semibold text-white">
            Твій особистий простір зростання
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/55">
          🌱 Учень
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-start justify-between gap-5 rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(21,32,54,0.82),rgba(10,18,36,0.9))] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-[rgb(var(--accent-soft-rgb))]">
          {isSuperAdmin ? 'SuperAdmin' : 'Кабінет коуча'}
        </p>
        <h1 className="text-3xl font-semibold tracking-[-0.02em] text-white">
          {isSuperAdmin
            ? `SuperAdmin · ${name}`
            : isExpert
              ? `Starway by Nadya · ${name}`
              : `Кабінет · ${name}`}
        </h1>
        <p className="mt-2 text-sm text-white/50">
          {isSuperAdmin
            ? 'Повний доступ — всі коучі, учні, аналітика'
            : isExpert
              ? 'Панель коуча — учні, продукти, система'
              : 'Твій особистий простір зростання'}
        </p>
      </div>
      <span
        className={[
          'mt-1 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium',
          isSuperAdmin
            ? 'border-amber-300/30 bg-amber-300/10 text-amber-200'
            : 'border-white/10 bg-white/5 text-white/60',
        ].join(' ')}
      >
        {isSuperAdmin ? '⭐ SuperAdmin' : '🎓 Коуч'}
      </span>
    </div>
  )
}

export function ExpertStatsSection({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: isSuperAdmin ? 'Всіх учнів (всі коучі)' : 'Активних учнів', value: '—', icon: '👥', sub: 'підключається' },
          { label: 'Завершують день', value: '—', icon: '📊', sub: 'підключається' },
          { label: 'Потреб уваги', value: '—', icon: '⚠️', sub: 'підключається' },
          { label: 'Дохід місяця', value: '—', icon: '💰', sub: 'підключається' },
        ].map(s => (
          <div key={s.label} className="rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(21,32,54,0.88),rgba(10,18,36,0.94))] px-5 py-5 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            <div className="mb-2 text-2xl">{s.icon}</div>
            <p className="text-2xl font-semibold text-white">{s.value}</p>
            <p className="mt-1 text-sm text-white/55">{s.label}</p>
            <p className="mt-2 text-xs text-white/35">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(21,32,54,0.88),rgba(10,18,36,0.94))] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl">
        <h2 className="mb-5 text-sm font-semibold text-white">
          {isSuperAdmin ? 'Загальна воронка — всі коучі' : 'Воронка — конверсія'}
        </h2>
        {FUNNEL_SEGMENTS.map(f => (
          <div key={f.label} className="mb-4 flex items-center gap-4 last:mb-0">
            <span className="w-24 flex-shrink-0 text-xs text-white/45">{f.label}</span>
            <div className="h-2 flex-1 rounded-full bg-white/10">
              <div
                className={['h-full rounded-full transition-all duration-500', f.widthClass, f.colorClass].join(' ')}
              />
            </div>
            <span className="w-6 text-right text-xs font-medium text-[#8CB8FF]">{f.value}</span>
          </div>
        ))}
      </div>

      <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(21,32,54,0.88),rgba(10,18,36,0.94))] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl">
        <h2 className="mb-5 text-sm font-semibold text-white">
          Аналітика — рекомендації
        </h2>
        {[
          { icon: '🎯', text: 'Підключіть аналітику щоб побачити рекомендації' },
          { icon: '📣', text: 'Дані з\'являться після першого запуску навчального сценарію' },
          { icon: '🔍', text: 'SEO аналіз стане доступний після налаштування' },
        ].map((r, index) => (
          <div key={index} className="flex items-start gap-3 border-b border-white/10 py-3 last:border-0">
            <span className="flex-shrink-0 text-base">{r.icon}</span>
            <span className="text-xs leading-relaxed text-white/50">{r.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function WheelStatusNotice({ onOpenInline }: { onOpenInline: () => void }) {
  const { user } = useAuth()
  const { accessControl, subscription } = useSystemState()
  const { data: trial } = useGetTrialStatusQuery()
  const userId = user?.id
  const hasWheelAccess = Boolean(
    (trial?.isActive ?? false)
    || subscription?.isActive
    || accessControl?.hasSubscription
  )
  const { data: latestWheel } = useGetLatestWheelAssessmentQuery(userId ?? '', {
    skip: !userId || !hasWheelAccess,
  })

  if (!hasWheelAccess) return null

  const now = new Date()
  const lastWheelDate = latestWheel
    ? new Date(latestWheel.completedAt ?? latestWheel.createdAt)
    : null
  const nextWheelDate = lastWheelDate
    ? new Date(lastWheelDate.getTime() + 30 * 24 * 60 * 60 * 1000)
    : null

  const needsWheel = !lastWheelDate || (nextWheelDate ? nextWheelDate <= now : false)

  if (!needsWheel) return null

  return (
    <div className="dashboard-liquid-card--soft">
      <div className="p-6">
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-[rgb(var(--accent-soft-rgb))]">
            КОЛЕСО БАЛАНСУ
          </p>
          <p className="text-base font-semibold text-white">
            {!lastWheelDate ? 'Пройти колесо балансу' : 'Час оновити колесо балансу'}
          </p>
          <p className="mt-2 text-sm leading-6 text-white/50">
            {!lastWheelDate
              ? 'Ще не було жодного проходження. Заповни 8 сфер і отримай новий зріз стану.'
              : `Було ${formatWheelDate(lastWheelDate)} · наступне було заплановане на ${nextWheelDate ? formatWheelDate(nextWheelDate) : '—'}`}
          </p>
        </div>
      </div>
      <div>
        <button
          type="button"
          onClick={onOpenInline}
          className="btn-liquid-dashboard btn-liquid-dashboard--primary"
        >
          Відкрити колесо →
        </button>
      </div>
    </div>
  )
}

export function WheelInlineFrame({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const { user } = useAuth()
  const accessToken = useAppSelector(state => state.auth.accessToken)
  const userId = user?.id

  const {
    data: latestWheel,
    isLoading,
    refetch,
  } = useGetLatestWheelAssessmentQuery(userId ?? '', {
    skip: !userId || !isOpen,
    refetchOnFocus: true,
    pollingInterval: isOpen ? 30_000 : 0,
  })

  if (!isOpen || !userId) return null

  const lastWheelDate = latestWheel
    ? new Date(latestWheel.completedAt ?? latestWheel.createdAt)
    : null
  const nextWheelDate = lastWheelDate
    ? new Date(lastWheelDate.getTime() + 30 * 24 * 60 * 60 * 1000)
    : null
  const weakestId = latestWheel?.gaps?.[0]
  const strongestId = latestWheel?.strengths?.[0]
  const weakestLabel = weakestId && isWheelSphereId(weakestId) ? (WHEEL_LABEL_MAP.get(weakestId) ?? weakestId) : weakestId ?? '—'
  const strongestLabel = strongestId && isWheelSphereId(strongestId) ? (WHEEL_LABEL_MAP.get(strongestId) ?? strongestId) : strongestId ?? '—'
  const weakestEmoji = weakestId && isWheelSphereId(weakestId) ? (WHEEL_EMOJI_MAP.get(weakestId) ?? '⚖️') : '⚖️'
  const strongestEmoji = strongestId && isWheelSphereId(strongestId) ? (WHEEL_EMOJI_MAP.get(strongestId) ?? '✨') : '✨'
  const summaryText = latestWheel?.notes?.trim()
    ? latestWheel.notes
    : `Зараз найбільше уваги просить сфера "${weakestLabel}". Найсильніша опора — "${strongestLabel}".`

  const handleDownloadPdf = async () => {
    if (!latestWheel?.id) return
    try {
      const headers: Record<string, string> = {}
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`
      const response = await fetch(`/api/wheel/${latestWheel.id}/pdf`, {
        headers,
        credentials: 'include',
      })
      if (!response.ok) throw new Error('pdf_failed')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `wheel-report-${toDateKey(new Date())}.pdf`
      anchor.click()
      setTimeout(() => URL.revokeObjectURL(url), 5000)
    } catch (error) {
      console.error('[Dashboard] wheel pdf failed:', error)
    }
  }

  return (
    <div className="dashboard-liquid-card relative">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(255,255,255,0.12)] bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] text-[var(--text-muted)] shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_10px_24px_rgba(0,0,0,0.18)] transition-all hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.05))] hover:text-[var(--text-primary)]"
        aria-label="Закрити колесо"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="dashboard-liquid-edge--top flex flex-wrap items-start justify-between gap-3 p-5 pr-16 sm:pr-20">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)]">
            КОЛЕСО БАЛАНСУ
          </p>
          <h2 className="text-lg font-bold text-[var(--text-primary)]">
            {!latestWheel ? 'Заповни колесо прямо тут' : 'Твій зріз стану по 8 сферах'}
          </h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {!latestWheel
              ? 'Форма відкривається в кабінеті. Якщо пройдеш колесо в Telegram або miniapp, цей блок оновиться автоматично.'
              : `Було ${lastWheelDate ? formatWheelDate(lastWheelDate) : '—'} · наступне ${nextWheelDate ? formatWheelDate(nextWheelDate) : '—'}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 pr-2 sm:pr-4">
          {latestWheel && (
            <>
              <button
                type="button"
                onClick={() => void refetch()}
                className="inline-flex items-center gap-2 rounded-t-[14px] rounded-b-[18px] border-x border-b border-t-0 border-x-[rgba(var(--accent-rgb),0.12)] border-b-[rgba(255,255,255,0.10)] bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.025))] px-3 py-2 text-xs text-[var(--text-muted)] shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_10px_22px_rgba(0,0,0,0.14)] transition-all hover:text-[var(--text-primary)]"
              >
                <RefreshCcw className="h-3.5 w-3.5" />
                Оновити
              </button>
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="inline-flex items-center gap-2 rounded-t-[14px] rounded-b-[18px] border-x border-b border-t-0 border-x-[rgba(var(--accent-rgb),0.18)] border-b-[rgba(255,255,255,0.12)] bg-[linear-gradient(180deg,rgba(var(--accent-rgb),0.88),rgba(var(--accent-rgb),0.72))] px-3 py-2 text-xs font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_12px_26px_rgba(0,0,0,0.16)] transition-all hover:brightness-110"
              >
                <Download className="h-3.5 w-3.5" />
                PDF звіт
              </button>
            </>
          )}
        </div>
      </div>

      <div className="p-5">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-[var(--text-muted)]">
            Завантажуємо колесо балансу...
          </div>
        ) : latestWheel ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(320px,1.1fr)_minmax(280px,0.9fr)]">
            <div className="p-2">
              <WheelChart scores={latestWheel.scores} size={340} />
            </div>

            <div className="space-y-4">
              <div className="border-b border-[rgba(255,255,255,0.06)] pb-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)]">
                  Короткий звіт
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                  {summaryText}
                </p>
              </div>

              <div className="space-y-3">
                <div className="border-b border-[rgba(16,185,129,0.18)] pb-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-success)]">
                    Сильна сфера
                  </p>
                  <p className="mt-2 flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
                    <span>{strongestEmoji}</span>
                    <span>{strongestLabel}</span>
                  </p>
                </div>
                <div className="border-b border-[rgba(245,158,11,0.18)] pb-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)]">
                    Сфера фокусу
                  </p>
                  <p className="mt-2 flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
                    <span>{weakestEmoji}</span>
                    <span>{weakestLabel}</span>
                  </p>
                </div>
              </div>

              <div className="pt-1">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)]">
                  Легенда
                </p>
                <div className="space-y-2">
                  {latestWheel.scores.map(score => {
                    const label = WHEEL_LABEL_MAP.get(score.categoryId) ?? score.categoryId
                    const emoji = WHEEL_EMOJI_MAP.get(score.categoryId) ?? '•'
                    return (
                      <div key={score.categoryId} className="flex items-center justify-between gap-3 border-b border-[rgba(255,255,255,0.06)] py-2 text-xs last:border-b-0">
                        <span className="inline-flex min-w-0 items-center gap-2 text-[var(--text-secondary)]">
                          <span>{emoji}</span>
                          <span className="truncate">{label}</span>
                        </span>
                        <span className="rounded-full bg-[var(--bg-tertiary)] px-2 py-1 font-medium text-[var(--text-primary)]">
                          {score.score}/10
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <WheelForm
            userId={userId}
            onComplete={() => void refetch()}
            onCancel={onClose}
          />
        )}
      </div>

      <div className="dashboard-liquid-edge">
        <button
          type="button"
          onClick={onClose}
          className="btn-liquid-dashboard btn-liquid-dashboard--ice"
        >
          ↑ Згорнути вгору
        </button>
      </div>
    </div>
  )
}
