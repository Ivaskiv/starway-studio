import { ArrowRight, Globe, MessageCircle, Sparkles } from 'lucide-react'

import type { MiniAppChatMessage } from '@/features/social/types/miniapp'

interface MiniAppMentorSectionProps {
  context?: string | null
  chatInput: string
  chatMessages: MiniAppChatMessage[]
  isSending: boolean
  isSyncing?: boolean
  onChatInputChange: (value: string) => void
  onSendMessage: () => void | Promise<void>
  onOpenTelegram?: () => void | Promise<void>
  onOpenWebsite?: () => void | Promise<void>
}

export default function MiniAppMentorSection({
  context,
  chatInput,
  chatMessages,
  isSending,
  isSyncing = false,
  onChatInputChange,
  onSendMessage,
  onOpenTelegram,
  onOpenWebsite,
}: MiniAppMentorSectionProps) {
  const isSessionContext = context === 'morning' || context === 'evening'

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[var(--border)] px-4 pt-4 pb-2">
        <div className="flex items-center gap-3">
          <div className="btn-icon flex h-10 w-10 items-center justify-center rounded-full text-[rgb(var(--accent-soft-rgb))]">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">ABsystem</p>
            <p className="flex items-center gap-1 text-xs text-[var(--color-success)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-success)]" />
              Готовий до діалогу
            </p>
          </div>
        </div>
        {isSessionContext && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (isSyncing) return
                void onOpenTelegram?.()
              }}
              aria-busy={isSyncing}
              className="inline-flex items-center justify-center rounded-xl border border-[rgba(var(--accent-soft-rgb),0.34)] bg-[rgba(var(--accent-rgb),0.08)] px-3 py-2 text-xs font-semibold tracking-[0.04em] text-[rgb(var(--accent-soft-rgb))] transition-all hover:border-[rgba(var(--accent-soft-rgb),0.46)] hover:bg-[rgba(var(--accent-rgb),0.14)] disabled:opacity-70"
            >
              <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
              Telegram
            </button>
            <button
              type="button"
              onClick={() => {
                if (isSyncing) return
                void onOpenWebsite?.()
              }}
              aria-busy={isSyncing}
              className="inline-flex items-center justify-center rounded-xl border border-[rgba(var(--accent-rgb),0.26)] bg-[rgba(var(--accent-rgb),0.05)] px-3 py-2 text-xs font-semibold tracking-[0.04em] text-[var(--text-secondary)] transition-all hover:border-[rgba(var(--accent-soft-rgb),0.34)] hover:bg-[rgba(var(--accent-rgb),0.12)] hover:text-[var(--text-primary)] disabled:opacity-70"
            >
              <Globe className="mr-1.5 h-3.5 w-3.5" />
              На сайт
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {chatMessages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
          >
            <div
              className={[
                'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                message.role === 'user'
                  ? 'rounded-br-sm bg-[var(--accent)] text-white'
                  : 'rounded-bl-sm border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)]',
              ].join(' ')}
            >
              {message.text}
            </div>
            {message.role === 'ai' && (
              <div className="btn-icon ml-2 flex h-8 w-8 flex-shrink-0 items-center justify-center self-end rounded-full text-[rgb(var(--accent-soft-rgb))]">
                <Sparkles className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}
        {isSending && (
          <div className="flex justify-start">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-2.5 text-sm text-[var(--text-muted)]">
              ···
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(event) => onChatInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                void onSendMessage()
              }
            }}
            placeholder="Напиши думку, питання або відповідь…"
            className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
          />
          <button
            type="button"
            onClick={() => void onSendMessage()}
            disabled={!chatInput.trim() || isSending}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)] text-white disabled:opacity-50"
            aria-label="Надіслати повідомлення"
            title="Надіслати повідомлення"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
