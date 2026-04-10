import type { ReactNode } from 'react'

interface SessionQuestion {
  id: string
  label: string
  hint?: string
  placeholder?: string
  metaLabel?: string
  type: 'text' | 'textarea'
}

interface QuestionCardProps {
  question: SessionQuestion
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  onSubmit?: () => void
  children?: ReactNode
}

export function QuestionCard({ question, value, onChange, onBlur, onSubmit, children }: QuestionCardProps) {
  return (
    <div className="glass-card p-4">
      {question.metaLabel ? (
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--accent-soft-rgb))]">
          {question.metaLabel}
        </p>
      ) : null}
      <p className="text-base font-semibold text-[var(--text-primary)]">{question.label}</p>
      {question.hint ? (
        <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">{question.hint}</p>
      ) : null}

      <div className="mt-3">
        {question.type === 'textarea' ? (
          <textarea
            rows={6}
            value={value}
            onChange={e => onChange(e.target.value)}
            onBlur={onBlur}
            onKeyDown={e => e.stopPropagation()}
            placeholder={question.placeholder}
            className="min-h-[140px] w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/35 focus:border-white/20 focus:outline-none"
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            onBlur={onBlur}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                onSubmit?.()
              }
            }}
            placeholder={question.placeholder}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/35 focus:border-white/20 focus:outline-none"
          />
        )}
      </div>

      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  )
}

export type { SessionQuestion }

export default QuestionCard
