import type { ProductRoomCard } from '@/features/subscription/services/billing.api'

type ProductRoomCardProps = {
  productId: ProductRoomCard['key']
  room: ProductRoomCard
  productProgress?: {
    onboardingStage: string | null
  } | null
  isBusy?: boolean
  onPrimaryAction: () => void
  onSecondaryAction?: () => void
}

function resolvePrimaryLabel(room: ProductRoomCard) {
  switch (String(room.behaviorPolicy.primaryCta)) {
    case 'activateGift':
      return '🎁 Активувати бонус'
    case 'continueLesson':
      return '▶️ Продовжити практику'
    case 'restore':
      return '🔄 Відновити доступ'
    case 'reopen':
      return '📘 Відкрити повторно'
    case 'continueOnboarding':
      return '🚀 Продовжити'
    case 'buy':
    case '💳 Оплатити':
    default:
      return String(room.behaviorPolicy.primaryCta || '💳 Оплатити')
  }
}

function resolveSecondaryLabel(room: ProductRoomCard) {
  if (room.state === 'inactive') {
    return '🎁 Активувати доступ'
  }

  if (room.progressUrl) {
    return '📊 Переглянути прогрес'
  }

  return null
}

function resolveLifecycleLabel(room: ProductRoomCard) {
  switch (room.state) {
    case 'active':
      return 'Активний room'
    case 'trial':
      return 'Trial room'
    case 'paused':
      return 'Пауза'
    case 'onboarding-started':
      return 'Онбординг'
    default:
      return 'Неактивний'
  }
}

function resolveReminderLabel(room: ProductRoomCard) {
  if (!room.reminderState.enabled) return 'off'
  return `${room.behaviorPolicy.reminderCadence} · ${room.behaviorPolicy.reminderTone}`
}

function resolveMentorLabel(room: ProductRoomCard) {
  return `${room.mentorMode} support`
}

function resolveGamificationLabel(room: ProductRoomCard) {
  if (room.gamificationState.streak > 0) {
    return `🔥 ${room.gamificationState.streak} day streak`
  }

  if (room.gamificationState.completedLessons > 0) {
    return `🏁 ${room.gamificationState.completedLessons} completed`
  }

  return '🌱 momentum ready'
}

export function ProductRoomCard({
  productId,
  room,
  productProgress,
  isBusy = false,
  onPrimaryAction,
  onSecondaryAction,
}: ProductRoomCardProps) {
  const primaryLabel = resolvePrimaryLabel(room)
  const secondaryLabel = resolveSecondaryLabel(room)
  const stageLabel = productProgress?.onboardingStage ?? null
  const isTelegramFirst = productId === 'STANKEY'

  return (
    <section className="glass-card rounded-[26px] border border-[rgba(245,190,55,0.22)] bg-[linear-gradient(180deg,rgba(33,42,66,0.94),rgba(13,18,31,0.96))] p-5 shadow-[0_22px_56px_rgba(8,15,32,0.36)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[rgb(var(--accent-soft-rgb))]">
              Product room
            </p>
            {isTelegramFirst ? (
              <span className="rounded-full border border-[#f5be37]/20 bg-[#f5be37]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f5be37]">
                Telegram-first
              </span>
            ) : null}
          </div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">{room.title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">
            Практика, нагадування, mentor support і room switching живуть в одному shared orchestrator без окремого бота.
          </p>
        </div>

        <div className="rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3 text-right">
          <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Lifecycle</div>
          <div className="mt-1 text-sm font-semibold text-white">{resolveLifecycleLabel(room)}</div>
          <div className="mt-1 text-xs text-white/45">{room.selectedFlow}</div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-[18px] border border-white/8 bg-white/[0.03] p-4">
          <div className="text-[11px] uppercase tracking-[0.2em] text-white/40">Progress</div>
          <div className="mt-2 text-lg font-semibold text-white">
            {room.progressState.completedLessons} уроків
          </div>
          <div className="mt-1 text-sm text-white/60">
            {room.progressState.currentLesson ? `Зараз: ${room.progressState.currentLesson}` : 'Room готовий до наступного кроку'}
          </div>
        </div>

        <div className="rounded-[18px] border border-white/8 bg-white/[0.03] p-4">
          <div className="text-[11px] uppercase tracking-[0.2em] text-white/40">Streak</div>
          <div className="mt-2 text-lg font-semibold text-white">{room.progressState.streak}</div>
          <div className="mt-1 text-sm text-white/60">{resolveGamificationLabel(room)}</div>
        </div>

        <div className="rounded-[18px] border border-white/8 bg-white/[0.03] p-4">
          <div className="text-[11px] uppercase tracking-[0.2em] text-white/40">Mentor + reminders</div>
          <div className="mt-2 text-lg font-semibold text-white">{resolveMentorLabel(room)}</div>
          <div className="mt-1 text-sm text-white/60">{resolveReminderLabel(room)}</div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <div className="rounded-[16px] border border-white/8 bg-white/[0.03] px-3 py-3 text-sm text-white/70">
          <span className="text-white/42">Доступ:</span> <span className="font-medium text-white">{room.accessSource}</span>
        </div>
        <div className="rounded-[16px] border border-white/8 bg-white/[0.03] px-3 py-3 text-sm text-white/70">
          <span className="text-white/42">Reminder:</span> <span className="font-medium text-white">{room.reminderState.enabled ? 'active' : 'off'}</span>
        </div>
        <div className="rounded-[16px] border border-white/8 bg-white/[0.03] px-3 py-3 text-sm text-white/70">
          <span className="text-white/42">Gamification:</span> <span className="font-medium text-white">{resolveGamificationLabel(room)}</span>
        </div>
        <div className="rounded-[16px] border border-white/8 bg-white/[0.03] px-3 py-3 text-sm text-white/70">
          <span className="text-white/42">Stage:</span> <span className="font-medium text-white">{stageLabel ?? 'room ready'}</span>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onPrimaryAction}
          disabled={isBusy}
          className="rounded-[16px] bg-[#1C2B4A] px-4 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#24365F] disabled:cursor-wait disabled:opacity-60"
        >
          {isBusy ? 'Працюємо…' : primaryLabel}
        </button>

        {secondaryLabel && onSecondaryAction ? (
          <button
            type="button"
            onClick={onSecondaryAction}
            disabled={isBusy}
            className="rounded-[16px] border border-white/10 bg-white/6 px-4 py-3 text-sm font-semibold text-white/78 transition-colors duration-150 hover:bg-white/10 disabled:cursor-wait disabled:opacity-60"
          >
            {secondaryLabel}
          </button>
        ) : null}
      </div>
    </section>
  )
}

export const StankeyRoomCard = ProductRoomCard
