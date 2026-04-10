import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { BadgeCheck, Clock3, ExternalLink, MessageCircle, PencilLine, Smartphone, Sparkles, Target, Trash2, X } from 'lucide-react'
import { useGenerateDeepLinkMutation } from '@/features/auth/services/deeplinks.api'
import type { MicroTask, MicroTaskStatus } from '../types/types'
import { getMicroTaskSphereMeta } from '../utils/sphereMeta'

const STATUS_CONFIG: Record<
  MicroTaskStatus,
  {
    label: string
    className: string
    dotClass: string
  }
> = {
  PENDING: {
    label: 'Виконати',
    className: 'bg-[rgba(255,173,74,0.18)] text-[rgb(255,173,74)]',
    dotClass: 'bg-[rgb(255,173,74)]',
  },
  COMPLETED: {
    label: '✓ Виконано',
    className: 'bg-[var(--color-success-bg)] text-[var(--color-success)]',
    dotClass: 'bg-[var(--color-success)]',
  },
  expired: {
    label: 'Прострочено',
    className: 'bg-[rgba(255,92,92,0.14)] text-[rgb(255,92,92)]',
    dotClass: 'bg-[rgb(255,92,92)]',
  },
  skipped: {
    label: 'Пропущено',
    className: 'bg-[rgba(255,92,92,0.14)] text-[rgb(255,92,92)]',
    dotClass: 'bg-[rgb(255,92,92)]',
  },
  manual: {
    label: 'Виконати',
    className: 'bg-[rgba(29,158,117,0.15)] text-[rgb(29,158,117)]',
    dotClass: 'bg-[rgb(29,158,117)]',
  },
}

const REASON_ICON: Record<string, { icon: typeof Sparkles; className: string }> = {
  low_score: { icon: Target, className: 'text-amber-400' },
  instability: { icon: Sparkles, className: 'text-amber-300' },
  growth: { icon: Sparkles, className: 'text-emerald-400' },
  wheel_gap: { icon: Target, className: 'text-sky-400' },
  stagnation: { icon: Sparkles, className: 'text-[rgb(255,173,74)]' },
  aiMentor: { icon: BadgeCheck, className: 'text-violet-400' },
  questionsScheduler: { icon: Target, className: 'text-cyan-400' },
  manual: { icon: PencilLine, className: 'text-sky-400' },
}

interface Props {
  task: MicroTask
  onComplete: () => void
  onSkip?: () => void
  onDelete?: () => void
  onSetProgress?: (progressPercent: number) => void
  onToggleStep?: (stepIndex: number, done: boolean) => void
}

function formatDaysLabel(days: number) {
  if (days === 1) return '1 день'
  if (days >= 2 && days <= 4) return `${days} дні`
  return `${days} днів`
}

function getTaskDraftKey(taskId: string) {
  return `starway_microtask_notes:${taskId}`
}

function loadStepNotes(taskId: string): Record<string, string> {
  if (typeof window === 'undefined') return {}

  try {
    const raw = window.localStorage.getItem(getTaskDraftKey(taskId))
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed as Record<string, string> : {}
  } catch {
    return {}
  }
}

function saveStepNotes(taskId: string, notes: Record<string, string>) {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(getTaskDraftKey(taskId), JSON.stringify(notes))
  } catch {
    // ignore
  }
}

function isCalendarStep(step: string) {
  return /календар|нагадув|15 хвилин|виділити.+час/i.test(step)
}

function needsWrittenAnswer(step: string) {
  return /записати|напиши|опиши|сформулюй|вкажи|обери|зафіксуй/i.test(step)
}

function getStepPrompt(step: string) {
  if (needsWrittenAnswer(step)) {
    return 'Тут можна записати відповідь, формулювання або коротку фіксацію'
  }

  return 'Коротко запиши, що саме зробиш або що вже зроблено'
}

function formatCalendarDate(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDisplayDate(date: Date) {
  return date.toLocaleDateString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatCalendarStamp(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hours = `${date.getHours()}`.padStart(2, '0')
  const minutes = `${date.getMinutes()}`.padStart(2, '0')
  return `${year}${month}${day}T${hours}${minutes}00`
}

function buildGoogleCalendarUrl(params: {
  title: string
  details: string
  start: Date
  end: Date
}) {
  const url = new URL('https://calendar.google.com/calendar/render')
  url.searchParams.set('action', 'TEMPLATE')
  url.searchParams.set('text', params.title)
  url.searchParams.set('details', params.details)
  url.searchParams.set('dates', `${formatCalendarStamp(params.start)}/${formatCalendarStamp(params.end)}`)
  return url.toString()
}

function stripTaskPrefix(title: string) {
  return title
    .replace(/^Виконано:\s*/u, '')
    .replace(/^Перенесено:\s*/u, '')
    .replace(/^Прострочено:\s*/u, '')
    .replace(/^Дедлайн:\s*/u, '')
    .trim()
}

function formatTaskDate(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const today = new Date()
  const isToday = date.toDateString() === today.toDateString()
  return isToday
    ? 'сьогодні'
    : date.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' })
}

function getCategoryTone(label: string) {
  const normalized = label.toLowerCase()
  if (normalized.includes('стан') || normalized.includes('внутріш')) {
    return 'border-[rgba(29,158,117,0.24)] bg-[rgba(29,158,117,0.12)] text-[#35C597]'
  }
  if (normalized.includes('ціль') || normalized.includes('фокус')) {
    return 'border-[rgba(239,159,39,0.24)] bg-[rgba(239,159,39,0.12)] text-[#F2B24B]'
  }
  return 'border-[rgba(55,138,221,0.24)] bg-[rgba(55,138,221,0.12)] text-[#73B6FF]'
}

export function MicroTaskCard({ task, onComplete, onSkip, onDelete, onSetProgress, onToggleStep }: Props) {
  const navigate = useNavigate()
  const [generateDeepLink, { isLoading: isGeneratingTelegramLink }] = useGenerateDeepLinkMutation()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [stepNotes, setStepNotes] = useState<Record<string, string>>(() => loadStepNotes(task.id))
  const normalizedProgressPercent = typeof task.progressPercent === 'number' && !Number.isNaN(task.progressPercent)
    ? Math.max(0, Math.min(100, Math.round(task.progressPercent)))
    : null
  const [progressInput, setProgressInput] = useState<string>(normalizedProgressPercent !== null ? String(normalizedProgressPercent) : '')
  const status = task.status ?? 'PENDING'
  const cfg = STATUS_CONFIG[status === 'manual' ? 'manual' : status]
  const reasonMeta = REASON_ICON[task.reason ?? task.source ?? ''] ?? { icon: Target, className: 'text-[rgb(var(--accent-soft-rgb))]' }
  const Icon = reasonMeta.icon
  const manualUiStatus = task.meta && typeof task.meta === 'object' && !Array.isArray(task.meta)
    ? (task.meta as Record<string, unknown>).uiStatus
    : null
  const isManualSkipped = status === 'manual' && manualUiStatus === 'skipped'
  const isManualDone = status === 'manual' && manualUiStatus === 'done'
  const isActive = (status === 'PENDING' || status === 'manual') && !isManualSkipped && !isManualDone
  const isCompleted = status === 'COMPLETED' || isManualDone
  const canMutate = isActive
  const hasSteps = Array.isArray(task.steps) && task.steps.length > 0
  const durationDays = Math.min(Math.max(task.daysToComplete ?? 1, 1), 3)
  const scheduleLabel = task.schedule?.isMultiDay ? (task.schedule.label ?? `День ${task.schedule.currentDay} з ${task.schedule.totalDays}`) : null
  const sphereMeta = getMicroTaskSphereMeta(task.sphere)
  const categoryTone = getCategoryTone(sphereMeta.label)
  const sourceLabel = task.status === 'manual' ? 'Вручну' : 'AI'
  const createdLabel = formatTaskDate(task.createdAt)
  const metaInsight = task.meta && typeof task.meta === 'object' && !Array.isArray(task.meta)
    ? (task.meta as Record<string, unknown>).insight
    : null
  const insight = typeof metaInsight === 'string' && metaInsight.trim().length > 0
    ? metaInsight.trim()
    : task.aiContext?.trim()
      ? task.aiContext.trim()
      : task.why?.trim()
        ? task.why.trim()
        : null

  const expiresAt = task.dueAt ? new Date(task.dueAt) : task.expiresAt ? new Date(task.expiresAt) : null
  const now = new Date()
  const isDueToday = Boolean(
    expiresAt
      && expiresAt.getFullYear() === now.getFullYear()
      && expiresAt.getMonth() === now.getMonth()
      && expiresAt.getDate() === now.getDate(),
  )
  const daysLeft = expiresAt
    ? Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : null
  const completedAt = task.completedAt ? new Date(task.completedAt) : null
  const progressBadgeValue = normalizedProgressPercent !== null && normalizedProgressPercent > 0 && normalizedProgressPercent < 100
    ? normalizedProgressPercent
    : null

  const isUrgent = daysLeft !== null && daysLeft <= 1 && isActive
  const noteCount = useMemo(
    () => Object.entries(stepNotes)
      .filter(([key, value]) => !key.startsWith('calendar:') && value.trim().length > 0)
      .length,
    [stepNotes],
  )

  useEffect(() => {
    saveStepNotes(task.id, stepNotes)
  }, [stepNotes, task.id])

  useEffect(() => {
    if (!isActive) return
    setProgressInput(normalizedProgressPercent !== null ? String(normalizedProgressPercent) : '')
  }, [isActive, normalizedProgressPercent, task.id])

  useEffect(() => {
    if (!isModalOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsModalOpen(false)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isModalOpen])

  const openModal = () => {
    if (!isActive) return
    setIsModalOpen(true)
  }

  const getCalendarValue = (index: number, field: 'start' | 'end') => {
    const fallback = field === 'start' ? '13:00' : '13:15'
    return stepNotes[`calendar:${index}:${field}`] ?? fallback
  }

  const setCalendarValue = (index: number, field: 'start' | 'end', value: string) => {
    setStepNotes(prev => ({
      ...prev,
      [`calendar:${index}:${field}`]: value,
    }))
  }

  const handleCreateCalendarReminder = (step: string, index: number) => {
    const today = new Date()
    const todayLabel = formatCalendarDate(today)
    const startValue = getCalendarValue(index, 'start')
    const endValue = getCalendarValue(index, 'end')
    const start = new Date(`${todayLabel}T${startValue}:00`)
    const end = new Date(`${todayLabel}T${endValue}:00`)
    const dayEnd = new Date(`${todayLabel}T21:00:00`)

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      toast.error('Оберіть коректний час для нагадування')
      return
    }

    if (end <= start) {
      toast.error('Час завершення має бути пізніше за початок')
      return
    }

    if (end > dayEnd) {
      toast.error('Нагадування для цього кроку має завершитися до 21:00')
      return
    }

    const calendarUrl = buildGoogleCalendarUrl({
      title: `Starway: ${taskTitle}`,
      details: `${step}\n\nМікрозавдання зі Starway Studio.`,
      start,
      end,
    })

    window.open(calendarUrl, '_blank', 'noopener,noreferrer')
  }

  const handleOpenAppCalendar = (index: number) => {
    const startValue = getCalendarValue(index, 'start')
    const endValue = getCalendarValue(index, 'end')
    navigate(`/dashboard/calendar?source=microtask&taskId=${encodeURIComponent(task.id)}&step=${index + 1}&start=${encodeURIComponent(startValue)}&end=${encodeURIComponent(endValue)}`)
  }

  const handleOpenTelegramCalendarFlow = async (step: string, index: number) => {
    try {
      const result = await generateDeepLink({
        action: 'open_miniapp',
        source: 'web',
        target: 'miniapp',
        path: '/miniapp/mentor?section=tasks',
        payload: {
          taskId: task.id,
          title: task.title,
          section: 'tasks',
          origin: 'calendar_step',
          calendarStep: step,
          calendarStart: getCalendarValue(index, 'start'),
          calendarEnd: getCalendarValue(index, 'end'),
        },
      }).unwrap()

      window.open(result.telegramUrl, '_blank', 'noopener,noreferrer')
    } catch (error) {
      console.error('microtask telegram calendar deeplink failed', error)
      toast.error('Не вдалося відкрити Telegram flow для цього нагадування')
    }
  }

  const handleOpenMiniAppInTelegram = async () => {
    try {
      const result = await generateDeepLink({
        action: 'open_miniapp',
        source: 'web',
        target: 'miniapp',
        path: '/miniapp/mentor?section=tasks',
        payload: {
          taskId: task.id,
          title: task.title,
          section: 'tasks',
          origin: 'microtask_modal',
        },
      }).unwrap()

      window.open(result.telegramUrl, '_blank', 'noopener,noreferrer')
    } catch (error) {
      console.error('microtask miniapp deeplink failed', error)
      toast.error('Не вдалося відкрити mini app у Telegram')
    }
  }

  const handleOpenTelegram = async () => {
    try {
      const result = await generateDeepLink({
        action: 'resume_task',
        source: 'web',
        target: 'telegram',
        path: '/miniapp/mentor?section=tasks',
        payload: {
          taskId: task.id,
          title: task.title,
          section: 'tasks',
        },
      }).unwrap()

      window.open(result.telegramUrl, '_blank', 'noopener,noreferrer')
    } catch (error) {
      console.error('microtask telegram deeplink failed', error)
      toast.error('Не вдалося відкрити Telegram для цього завдання')
    }
  }

  const handleSaveProgress = () => {
    const percent = Number(progressInput)
    if (!Number.isFinite(percent)) {
      toast.error('Вкажи відсоток від 0 до 100')
      return
    }

    const normalized = Math.max(0, Math.min(100, Math.round(percent)))
    if (normalized >= 100) {
      onComplete()
      return
    }

    if (!onSetProgress) {
      toast.error('Прогрес зараз недоступний')
      return
    }

    onSetProgress(normalized)
    toast.success(`Збережено ${normalized}%`)
  }

  const taskTitle = stripTaskPrefix(task.title)

  return (
    <>
      <div
        data-testid={`task-card-${task.id}`}
        className={[
          'relative overflow-hidden rounded-2xl border transition-all',
          'bg-[rgba(255,255,255,0.045)]',
          isActive
            ? 'cursor-pointer border-[rgba(255,255,255,0.09)] hover:border-[rgba(var(--accent-rgb),0.24)]'
            : isCompleted
              ? 'border-[rgba(29,158,117,0.25)] opacity-65'
              : 'border-transparent opacity-45',
        ].join(' ')}
        onClick={() => {
          if (isActive) setIsModalOpen(true)
        }}
      >
        {isUrgent && (
          <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,rgb(255,173,74),rgba(255,173,74,0.35))]" />
        )}

        {onDelete && canMutate ? (
          <button
            type="button"
            aria-label="Видалити"
            title="Видалити"
            className="absolute right-2 top-2 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-[var(--text-muted)] transition-colors hover:border-[rgba(255,92,92,0.28)] hover:bg-[rgba(255,92,92,0.12)] hover:text-[rgb(255,92,92)]"
            onClick={(event) => {
              event.stopPropagation()
              onDelete()
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        ) : null}

        <div className={[
          'p-3.5 sm:p-4',
          (isCompleted || isManualSkipped) ? 'opacity-60' : '',
        ].join(' ')}>
          <div className="flex items-start gap-3">
            <div className={[
              'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border',
              'border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.06)]',
              reasonMeta.className,
            ].join(' ')}>
              <Icon className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${categoryTone}`}>
                      {sphereMeta.label}
                    </span>
                    <span className="text-[11px] text-[var(--text-muted)]">
                      {createdLabel ? `${sourceLabel} · ${createdLabel}` : sourceLabel}
                    </span>
                  </div>

                  <p
                    className={[
                      'mt-3 line-clamp-2 text-[14px] font-semibold leading-[1.35]',
                      isCompleted ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-primary)]',
                    ].join(' ')}
                  >
                    {taskTitle}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span className="mt-0.5 flex h-2.5 w-2.5 flex-shrink-0 rounded-full" title={cfg.label}>
                    <span className={['h-2.5 w-2.5 rounded-full', cfg.dotClass].join(' ')} />
                  </span>
                  {durationDays > 1 ? (
                    <span className="rounded-full border border-[rgba(239,159,39,0.2)] bg-[rgba(239,159,39,0.1)] px-2.5 py-1 text-[11px] font-medium text-[#F2B24B]">
                      {formatDaysLabel(durationDays)}
                    </span>
                  ) : null}
                  {task.schedule?.isMultiDay ? (
                    <span className="text-[11px] text-[var(--text-muted)]">
                      день {task.schedule.currentDay}/{task.schedule.totalDays}
                    </span>
                  ) : null}
                </div>
              </div>

              {insight ? (
                <p className="mt-2 line-clamp-1 text-[12px] leading-5 text-[var(--text-muted)]">
                  {insight}
                </p>
              ) : null}

              {hasSteps ? (
                <div className="mt-3 space-y-1">
                  {task.steps!.slice(0, 3).map((step, index) => (
                    <p key={`${task.id}-step-${index}`} className="text-[11px] leading-5 text-[var(--text-secondary)]">
                      <span className="mr-1 text-[11px] text-[var(--text-muted)]">{index + 1}</span>
                      {step}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-3 border-t border-[rgba(255,255,255,0.08)] pt-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                {!task.schedule?.isMultiDay && daysLeft !== null && isActive ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-2.5 py-1 text-[var(--text-muted)]">
                    <Clock3 className="h-3.5 w-3.5" />
                    {isDueToday ? 'До 23:59' : daysLeft === 0 ? 'Сьогодні' : `${daysLeft} дн. залишилось`}
                  </span>
                ) : null}
                {task.schedule?.isMultiDay && isActive ? (
                  <span className="rounded-full border border-[rgba(var(--accent-rgb),0.16)] bg-[rgba(var(--accent-rgb),0.08)] px-2.5 py-1 text-[rgb(var(--accent-soft-rgb))]">
                    {task.schedule.label}
                  </span>
                ) : null}
                {noteCount > 0 ? (
                  <span className="rounded-full border border-[rgba(var(--accent-rgb),0.16)] bg-[rgba(var(--accent-rgb),0.08)] px-2.5 py-1 text-[rgb(var(--accent-soft-rgb))]">
                    {noteCount} нот.
                  </span>
                ) : null}
                {progressBadgeValue !== null ? (
                  <span className="rounded-full border border-[rgba(29,158,117,0.18)] bg-[rgba(29,158,117,0.08)] px-2.5 py-1 text-[rgb(29,158,117)]">
                    {progressBadgeValue}%
                  </span>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                {isCompleted ? (
                  <span className="text-[12px] font-medium text-[var(--color-success)]">
                    {completedAt ? `Виконано ${formatDisplayDate(completedAt)}` : 'Виконано'}
                  </span>
                ) : isManualSkipped ? (
                  <span className="text-[12px] font-medium text-[rgb(248,113,113)]">
                    Пропущено сьогодні
                  </span>
                ) : isActive ? (
                  <>
                    {onSkip ? (
                      <button
                        type="button"
                        data-testid={`skip-btn-${task.id}`}
                        onClick={(event) => {
                          event.stopPropagation()
                          onSkip()
                        }}
                        className="rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] px-3 py-1.5 text-[11px] font-medium text-[var(--text-muted)] transition-colors hover:bg-[rgba(255,255,255,0.05)]"
                      >
                        Пропустити
                      </button>
                    ) : null}
                    <button
                      type="button"
                      data-testid={`done-btn-${task.id}`}
                      onClick={(event) => {
                        event.stopPropagation()
                        onComplete()
                      }}
                      className="rounded-full bg-[rgb(29,158,117)] px-3 py-1.5 text-[11px] font-medium text-white transition-colors hover:brightness-105"
                    >
                      Виконано
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-[rgba(4,8,16,0.72)] p-3 sm:items-center sm:p-6">
          <div
            className="absolute inset-0"
            onClick={() => setIsModalOpen(false)}
            aria-hidden="true"
          />

          <div className="relative z-[1] flex max-h-[92vh] w-[min(100%,760px)] flex-col overflow-hidden rounded-[30px] border border-[rgba(255,255,255,0.1)] bg-[linear-gradient(180deg,rgba(18,24,36,0.96)_0%,rgba(10,14,24,0.98)_100%)] shadow-[0_30px_80px_rgba(0,0,0,0.42)]">
            <div className="flex items-start justify-between gap-4 border-b border-[rgba(255,255,255,0.08)] px-4 py-4 sm:px-6">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[rgb(var(--accent-soft-rgb))]">
                  Виконання завдання
                </p>
                <h3 className="mt-2 text-lg font-bold text-[var(--text-primary)] sm:text-xl">
                  {taskTitle}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  Тут можна коротко фіксувати відповіді по кроках і відкрити той самий фокус у зручному форматі: сайт, Telegram Mini App або бот.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] text-[var(--text-primary)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
              {task.why ? (
                <div className="rounded-2xl border border-[rgba(var(--accent-rgb),0.14)] bg-[rgba(255,255,255,0.05)] px-4 py-3 text-sm leading-6 text-[var(--text-secondary)]">
                  {task.why}
                </div>
              ) : null}

              <div className="mt-4 rounded-[24px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.025)] px-4 py-3 text-sm leading-6 text-[var(--text-secondary)]">
                Потік дня можна продовжити в різних модулях без втрати контексту. Обери, де зручніше відповісти саме зараз.
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard/microtasks')}
                  className="rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-left transition-colors hover:bg-[rgba(255,255,255,0.05)]"
                >
                  <div className="flex items-center gap-2 text-[rgb(var(--accent-soft-rgb))]">
                    <ExternalLink className="h-4 w-4" />
                    <span className="text-sm font-semibold">Сайт</span>
                  </div>
                  <p className="mt-2 text-xs leading-6 text-[var(--text-muted)]">
                    Залишитись у веб-кабінеті й завершити завдання тут.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => void handleOpenMiniAppInTelegram()}
                  className="rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-left transition-colors hover:bg-[rgba(255,255,255,0.05)]"
                >
                  <div className="flex items-center gap-2 text-[rgb(var(--accent-soft-rgb))]">
                    <Smartphone className="h-4 w-4" />
                    <span className="text-sm font-semibold">Mini App</span>
                  </div>
                  <p className="mt-2 text-xs leading-6 text-[var(--text-muted)]">
                    Відкрити блок завдань саме всередині Telegram Mini App.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => void handleOpenTelegram()}
                  disabled={isGeneratingTelegramLink}
                  className="rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-left transition-colors hover:bg-[rgba(255,255,255,0.05)] disabled:opacity-60"
                >
                  <div className="flex items-center gap-2 text-[rgb(var(--accent-soft-rgb))]">
                    <MessageCircle className="h-4 w-4" />
                    <span className="text-sm font-semibold">Telegram</span>
                  </div>
                  <p className="mt-2 text-xs leading-6 text-[var(--text-muted)]">
                    Відкрити бота з контекстом цього завдання і продовжити flow у повідомленнях.
                  </p>
                </button>
              </div>

              {hasSteps ? (
                <div className="mt-5 space-y-4">
                  {task.steps!.map((step, index) => {
                    const noteKey = String(index)
                    const done = Boolean(task.stepsCompleted?.[index])

                    return (
                      <div
                        key={`${task.id}-modal-step-${index}`}
                        className="rounded-[24px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] p-4"
                      >
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            disabled={!onToggleStep}
                            onClick={() => onToggleStep?.(index, !done)}
                            className={[
                              'mt-0.5 inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-xl border text-xs font-semibold transition-colors',
                              done
                                ? 'border-[rgba(87,214,104,0.35)] bg-[rgba(87,214,104,0.14)] text-[var(--color-success)]'
                                : 'border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.02)] text-[var(--text-primary)]',
                              onToggleStep ? 'hover:bg-[var(--glass-bg-hover)]' : 'cursor-default',
                            ].join(' ')}
                            aria-label={done ? 'Зняти виконання кроку' : 'Позначити крок виконаним'}
                          >
                            {done ? '✓' : ''}
                          </button>
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm font-medium leading-6 text-[var(--text-primary)] ${done ? 'line-through opacity-70' : ''}`}>
                              {step}
                            </p>

                            <label className="mt-3 block">
                              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                                {needsWrittenAnswer(step) ? 'Місце для запису' : 'Нотатка до кроку'}
                              </span>
                              <textarea
                                value={stepNotes[noteKey] ?? ''}
                                onChange={(event) => {
                                  setStepNotes((prev) => ({
                                    ...prev,
                                    [noteKey]: event.target.value,
                                  }))
                                }}
                                placeholder={getStepPrompt(step)}
                                className="mt-2 min-h-24 w-full rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.045)] px-3.5 py-3 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[rgba(var(--accent-rgb),0.3)]"
                              />
                            </label>

                            {isCalendarStep(step) ? (
                              <div className="mt-3 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.05)] p-3">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgb(var(--accent-soft-rgb))]">
                                  Час у календарі
                                </p>
                                <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                                  Обери слот для цього кроку. За замовчуванням стоїть 13:00–13:15, але час можна змінити. Завершення має бути до 21:00.
                                </p>
                                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                  <label className="block">
                                    <span className="text-[11px] font-medium text-[var(--text-muted)]">Початок</span>
                                    <input
                                      type="time"
                                      min="06:00"
                                      max="20:45"
                                      step={300}
                                      value={getCalendarValue(index, 'start')}
                                      onChange={(event) => setCalendarValue(index, 'start', event.target.value)}
                                      className="mt-1 w-full rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.07)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[rgba(var(--accent-rgb),0.3)]"
                                    />
                                  </label>
                                  <label className="block">
                                    <span className="text-[11px] font-medium text-[var(--text-muted)]">Завершення</span>
                                    <input
                                      type="time"
                                      min="06:15"
                                      max="21:00"
                                      step={300}
                                      value={getCalendarValue(index, 'end')}
                                      onChange={(event) => setCalendarValue(index, 'end', event.target.value)}
                                      className="mt-1 w-full rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.07)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[rgba(var(--accent-rgb),0.3)]"
                                    />
                                  </label>
                                </div>
                                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                                  <button
                                    type="button"
                                    onClick={() => handleCreateCalendarReminder(step, index)}
                                    className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-[rgba(var(--accent-rgb),0.22)] bg-[rgba(var(--accent-rgb),0.1)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[rgba(var(--accent-rgb),0.15)]"
                                  >
                                    Google Calendar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenAppCalendar(index)}
                                    className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.06)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[rgba(255,255,255,0.09)]"
                                  >
                                    Календар додатку
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void handleOpenTelegramCalendarFlow(step, index)}
                                    className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.06)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[rgba(255,255,255,0.09)]"
                                  >
                                    Telegram flow
                                  </button>
                                </div>
                              </div>
                            ) : null}

                            <p className="mt-3 text-xs text-[var(--text-muted)]">
                              {done ? 'Крок відмічено як виконаний' : 'Познач крок галочкою, коли завершиш його'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <label className="mt-5 block">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                    Місце для запису
                  </span>
                  <textarea
                    value={stepNotes.general ?? ''}
                    onChange={(event) => {
                      setStepNotes((prev) => ({
                        ...prev,
                        general: event.target.value,
                      }))
                    }}
                    placeholder="Запиши коротко, що саме зробиш, що помітила або який є результат"
                    className="mt-2 min-h-28 w-full rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.045)] px-3.5 py-3 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[rgba(var(--accent-rgb),0.3)]"
                  />
                </label>
              )}

              {canMutate ? (
                <div className="mt-5 rounded-[24px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[rgb(var(--accent-soft-rgb))]">
                      Часткове виконання
                    </p>
                    {progressBadgeValue !== null ? (
                      <span className="rounded-full border border-[rgba(29,158,117,0.18)] bg-[rgba(29,158,117,0.08)] px-2.5 py-1 text-[11px] font-medium text-[rgb(29,158,117)]">
                        {progressBadgeValue}%
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
                    Якщо задача виконана не повністю, збережи відсоток. Це піде в аналіз і допоможе наступного дня не починати з нуля.
                  </p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      inputMode="numeric"
                      value={progressInput}
                      onChange={(event) => setProgressInput(event.target.value)}
                      placeholder="0-100%"
                      className="min-h-11 w-full rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.045)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[rgba(var(--accent-rgb),0.3)] sm:max-w-[140px]"
                    />
                    <button
                      type="button"
                      onClick={handleSaveProgress}
                      className="min-h-11 rounded-2xl border border-[rgba(29,158,117,0.22)] bg-[rgba(29,158,117,0.14)] px-4 py-2.5 text-sm font-semibold text-[rgb(29,158,117)] transition-colors hover:bg-[rgba(29,158,117,0.2)]"
                    >
                      Зберегти %
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="border-t border-[rgba(255,255,255,0.08)] px-4 py-4 sm:px-6">
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    onComplete()
                    setIsModalOpen(false)
                  }}
                  className="min-h-11 flex-1 rounded-2xl bg-[rgb(255,173,74)] px-4 py-2.5 text-sm font-semibold text-[#231a08] transition-all hover:brightness-105"
                >
                  Позначити виконаним
                </button>
                {onSkip ? (
                  <button
                    type="button"
                    onClick={() => {
                      onSkip()
                      setIsModalOpen(false)
                    }}
                    className="min-h-11 rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.03)] px-4 py-2.5 text-sm text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-hover)]"
                  >
                    Пропустити
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

export default MicroTaskCard
