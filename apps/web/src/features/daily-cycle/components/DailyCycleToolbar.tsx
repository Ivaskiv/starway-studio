import { X } from 'lucide-react'

type DailyCycleToolbarProps = {
  embedded: boolean
  session: 'morning' | 'evening'
  onSessionChange: (session: 'morning' | 'evening') => void
  onOpenMicroTasks?: () => void
  onBackToDashboard: () => void
  onOpenTelegram: () => void
  onClose?: () => void
  isGeneratingTelegramResume: boolean
  isSendingSessionHandoff: boolean
  telegramBotActive: boolean
  isTelegramLinkLoading: boolean
}

export function DailyCycleToolbar({
  embedded,
  session,
  onSessionChange,
  onOpenMicroTasks,
  onBackToDashboard,
  onOpenTelegram,
  onClose,
  isGeneratingTelegramResume,
  isSendingSessionHandoff,
  telegramBotActive,
  isTelegramLinkLoading,
}: DailyCycleToolbarProps) {
  return (
    <div className="flex items-center gap-3">
      {!embedded ? (
        <button
          type="button"
          onClick={onBackToDashboard}
          className="hero-cta-secondary px-3 py-1.5 text-xs"
        >
          ← Кабінет
        </button>
      ) : (
        <div className="ml-auto" />
      )}

      <div className="flex flex-wrap items-center gap-2">
        {(['morning', 'evening'] as const).map(value => (
          <button
            key={value}
            type="button"
            onClick={() => onSessionChange(value)}
            className={[
              'rounded-xl px-3 py-1.5 text-xs font-semibold tracking-[0.04em] transition-all',
              session === value
                ? 'border border-[rgba(var(--accent-soft-rgb),0.58)] bg-[linear-gradient(180deg,rgba(var(--accent-rgb),0.16),rgba(var(--accent-rgb),0.08))] text-[rgb(var(--accent-soft-rgb))] shadow-[0_0_18px_rgba(var(--accent-soft-rgb),0.14),inset_0_1px_0_rgba(255,255,255,0.08)]'
                : 'border border-[rgba(var(--accent-rgb),0.26)] bg-[rgba(var(--accent-rgb),0.05)] text-[var(--text-secondary)] hover:border-[rgba(var(--accent-soft-rgb),0.34)] hover:bg-[rgba(var(--accent-rgb),0.12)] hover:text-[var(--text-primary)]',
            ].join(' ')}
          >
            {value === 'morning' ? '🌞 Ранок' : '🌙 Вечір'}
          </button>
        ))}

        <button
          type="button"
          onClick={() => onOpenMicroTasks?.()}
          className="rounded-xl border border-[rgba(var(--accent-rgb),0.26)] bg-[rgba(var(--accent-rgb),0.05)] px-3 py-1.5 text-xs font-semibold tracking-[0.04em] text-[var(--text-secondary)] transition-all hover:border-[rgba(var(--accent-soft-rgb),0.34)] hover:bg-[rgba(var(--accent-rgb),0.12)] hover:text-[var(--text-primary)]"
        >
           Мікрозавдання
        </button>

        {!embedded ? (
          <button
            type="button"
            onClick={onOpenTelegram}
            disabled={isGeneratingTelegramResume || isSendingSessionHandoff}
            className={[
              'rounded-xl border px-3 py-1.5 text-xs font-semibold tracking-[0.04em] transition-all',
              'border-[rgba(var(--accent-soft-rgb),0.34)] bg-[rgba(var(--accent-rgb),0.08)] text-[rgb(var(--accent-soft-rgb))]',
              (isGeneratingTelegramResume || isSendingSessionHandoff)
                ? 'opacity-70'
                : 'hover:border-[rgba(var(--accent-soft-rgb),0.46)] hover:bg-[rgba(var(--accent-rgb),0.14)]',
            ].join(' ')}
          >
            {telegramBotActive
              ? (isGeneratingTelegramResume ? 'Відкриваємо Telegram...' : '💬 Відповідати в Telegram')
              : (isTelegramLinkLoading ? 'Генеруємо Telegram...' : 'Підключити Telegram')}
          </button>
        ) : null}
      </div>

      {embedded ? (
        <button
          type="button"
          onClick={() => onClose?.()}
          aria-label="Закрити сесію"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-[var(--text-secondary)] transition-colors hover:bg-[rgba(255,255,255,0.08)] hover:text-[var(--text-primary)]"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  )
}
