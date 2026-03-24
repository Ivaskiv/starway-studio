import { ArrowRight, Sparkles } from 'lucide-react'

import type { MiniAppChatMessage } from '@/features/social/types/miniapp'

interface MiniAppMentorSectionProps {
  chatInput: string
  chatMessages: MiniAppChatMessage[]
  isSending: boolean
  onChatInputChange: (value: string) => void
  onSendMessage: () => void | Promise<void>
}

export default function MiniAppMentorSection({
  chatInput,
  chatMessages,
  isSending,
  onChatInputChange,
  onSendMessage,
}: MiniAppMentorSectionProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[var(--border)] px-4 pt-4 pb-2">
        <div className="flex items-center gap-3">
          <div className="btn-icon flex h-10 w-10 items-center justify-center rounded-full text-[rgb(var(--accent-soft-rgb))]">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">Асистент Starway</p>
            <p className="flex items-center gap-1 text-xs text-[var(--color-success)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-success)]" />
              Активний
            </p>
          </div>
        </div>
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
            placeholder="Напиши повідомлення..."
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
