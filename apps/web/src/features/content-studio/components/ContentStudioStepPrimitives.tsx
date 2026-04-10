import { useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'

import { InfoHint } from '@/ui'

const CM_TEXTAREA_CLASS = 'w-full rounded-[18px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm leading-6 text-[var(--text-field)] placeholder:text-[var(--text-field-placeholder)] outline-none transition-colors focus:border-[rgba(var(--accent-rgb),0.2)]'
const CM_CHECKBOX_PANEL_CLASS = 'space-y-1.5'

export function StepBadge({ step }: { step: number }) {
  return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[rgba(var(--accent-rgb),0.18)] bg-[rgba(var(--accent-rgb),0.08)] text-xs font-semibold text-[rgb(var(--accent-soft-rgb))]">
      {step}
    </span>
  )
}

export function MetricBadgeHint({
  value,
  label,
  description,
  instruction,
  className = '',
}: {
  value: string
  label: string
  description: string
  instruction: string
  className?: string
}) {
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      <span className="text-[11px] font-semibold text-emerald-300">{value}</span>
      <InfoHint label={label} description={description} instruction={instruction} />
    </div>
  )
}

export function EditableLinesTextarea({
  lines,
  onCommit,
  placeholder,
  minHeightClass = 'min-h-[140px]',
}: {
  lines: string[]
  onCommit: (value: string) => void
  placeholder?: string
  minHeightClass?: string
}) {
  const serializedLines = lines.join('\n')
  const [draft, setDraft] = useState(serializedLines)

  useEffect(() => {
    setDraft(serializedLines)
  }, [serializedLines])

  return (
    <textarea
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => onCommit(draft)}
      onKeyDown={(event) => event.stopPropagation()}
      placeholder={placeholder}
      className={`mt-3 ${minHeightClass} resize-y ${CM_TEXTAREA_CLASS}`}
    />
  )
}

export function ModeToggle({
  value,
  onChange,
  warning = false,
}: {
  value: 'saved' | 'manual'
  onChange: (value: 'saved' | 'manual') => void
  warning?: boolean
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange('saved')}
          className={[
            'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
            value === 'saved'
              ? warning
                ? 'border-[rgba(255,113,124,0.34)] bg-[rgba(255,113,124,0.14)] text-[rgb(255,113,124)] shadow-[0_0_0_1px_rgba(255,113,124,0.1)]'
                : 'border-[rgba(var(--accent-rgb),0.22)] bg-[rgba(var(--accent-rgb),0.12)] text-[rgb(var(--accent-soft-rgb))]'
              : 'border-[rgba(var(--accent-rgb),0.1)] bg-[rgba(255,255,255,0.025)] text-[var(--text-secondary)] hover:border-[rgba(var(--accent-rgb),0.16)]',
          ].join(' ')}
        >
          Використати збережений
        </button>
        <button
          type="button"
          onClick={() => onChange('manual')}
          className={[
            'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
            value === 'manual'
              ? 'border-[rgba(var(--accent-rgb),0.22)] bg-[rgba(var(--accent-rgb),0.12)] text-[rgb(var(--accent-soft-rgb))]'
              : 'border-[rgba(var(--accent-rgb),0.1)] bg-[rgba(255,255,255,0.025)] text-[var(--text-secondary)] hover:border-[rgba(var(--accent-rgb),0.16)]',
          ].join(' ')}
        >
          Ввести вручну
        </button>
      </div>
    </div>
  )
}

export function FormatChecklist({
  selectedFormats,
  onToggle,
  options,
  emptyStateLabel = 'Використати збережений — Instagram Reels',
  instruction = 'Познач формат, якщо хочеш бачити його в пакеті та в preview. Якщо всі вимкнені, система повертається до збереженого базового формату.',
}: {
  selectedFormats: string[]
  onToggle: (value: string) => void
  options: ReadonlyArray<{ value: string; label: string; hint: string }>
  emptyStateLabel?: string
  instruction?: string
}) {
  const availableOptions = options.filter((option) => !selectedFormats.includes(option.value))

  return (
    <div className="mt-3 space-y-2.5">
      <div className="flex flex-wrap gap-1.5">
        {selectedFormats.length > 0 ? selectedFormats.map((value) => {
          const option = options.find((item) => item.value === value)
          if (!option) return null
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onToggle(option.value)}
              className="inline-flex items-center gap-2 rounded-full border border-[rgba(var(--accent-rgb),0.18)] bg-[rgba(var(--accent-rgb),0.09)] px-3 py-1.5 text-xs font-medium text-[rgb(var(--accent-soft-rgb))] transition-colors hover:border-[rgba(var(--accent-rgb),0.28)]"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--accent-soft-rgb))]" />
              {option.label}
              <X className="h-3.5 w-3.5" />
            </button>
          )
        }) : (
          <span className="inline-flex items-center rounded-full border border-[rgba(var(--accent-rgb),0.14)] bg-[rgba(var(--accent-rgb),0.06)] px-3 py-1.5 text-xs text-[var(--text-secondary)]">
            {emptyStateLabel}
          </span>
        )}
      </div>
      <div className={CM_CHECKBOX_PANEL_CLASS}>
        {availableOptions.length > 0 ? availableOptions.map((option) => {
          const isActive = selectedFormats.includes(option.value)
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onToggle(option.value)}
              className={[
                'flex w-full items-center gap-2 rounded-[16px] px-2.5 py-2 text-left transition-colors',
                isActive ? 'bg-[rgba(var(--accent-rgb),0.04)]' : 'hover:bg-[rgba(255,255,255,0.02)]',
              ].join(' ')}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={[
                    'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[7px] border transition-all duration-200',
                    isActive
                      ? 'border-[rgba(var(--accent-rgb),0.34)] bg-[rgba(var(--accent-rgb),0.85)]'
                      : 'border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.04)]',
                  ].join(' ')}
                  aria-hidden="true"
                >
                  <Check className={['h-3.5 w-3.5 stroke-[2.8] text-white transition-opacity duration-150', isActive ? 'opacity-100' : 'opacity-0'].join(' ')} />
                </span>
                <InfoHint
                  label={option.label}
                  description={option.hint}
                  instruction={instruction}
                />
                <span className="text-sm font-medium text-[var(--text-primary)]">{option.label}</span>
              </div>
            </button>
          )
        }) : (
          <div className="px-1 py-1 text-sm text-[var(--text-muted)]">Усі вибрані формати вже винесені зверху.</div>
        )}
      </div>
    </div>
  )
}

export function SingleChoiceChecklist({
  value,
  options,
  onSelect,
  emptyLabel,
  checkboxShape = 'round',
}: {
  value: string
  options: ReadonlyArray<{ value: string; label: string; hint: string }>
  onSelect: (value: string) => void
  emptyLabel: string
  checkboxShape?: 'round' | 'square'
}) {
  const activeOption = options.find((option) => option.value === value)
  const availableOptions = options.filter((option) => option.value !== value)

  return (
    <div className="mt-3 space-y-3">
      <div className="flex flex-wrap gap-2">
        {activeOption ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(var(--accent-rgb),0.18)] bg-[rgba(var(--accent-rgb),0.09)] px-3 py-1.5 text-xs font-medium text-[rgb(var(--accent-soft-rgb))]">
            <span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--accent-soft-rgb))]" />
            {activeOption.label}
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full border border-[rgba(var(--accent-rgb),0.14)] bg-[rgba(var(--accent-rgb),0.06)] px-3 py-1.5 text-xs text-[var(--text-secondary)]">
            {emptyLabel}
          </span>
        )}
      </div>
      <div className={CM_CHECKBOX_PANEL_CLASS}>
        {availableOptions.length > 0 ? availableOptions.map((option) => {
          const isActive = option.value === value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onSelect(option.value)}
              className={[
                'flex w-full items-center gap-3 rounded-[16px] px-3 py-2.5 text-left transition-colors',
                isActive ? 'bg-[rgba(var(--accent-rgb),0.04)]' : 'hover:bg-[rgba(255,255,255,0.02)]',
              ].join(' ')}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={[
                    'inline-flex h-5 w-5 shrink-0 items-center justify-center border transition-all duration-200',
                    checkboxShape === 'square' ? 'rounded-[7px]' : 'rounded-full',
                    isActive
                      ? 'border-[rgba(var(--accent-rgb),0.34)] bg-[rgba(var(--accent-rgb),0.85)]'
                      : 'border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.04)]',
                  ].join(' ')}
                >
                  <Check className={['h-3.5 w-3.5 stroke-[2.8] text-white transition-opacity duration-150', isActive ? 'opacity-100' : 'opacity-0'].join(' ')} />
                </span>
                <InfoHint
                  label={option.label}
                  description={option.hint}
                  instruction="Обери один базовий варіант. Саме він задає головний кут для генерації цього кроку."
                />
                <span className="text-sm font-medium text-[var(--text-primary)]">{option.label}</span>
              </div>
            </button>
          )
        }) : (
          <div className="px-3 py-2 text-sm text-[var(--text-muted)]">
            Активний вибір уже винесений зверху. Обери інший варіант, коли захочеш змінити напрям.
          </div>
        )}
      </div>
    </div>
  )
}
