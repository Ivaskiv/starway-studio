import type { MutableRefObject } from 'react'

import { WHEEL_TEXTS } from '@/features/wheel/constants/texts'
import type { WheelSphere } from '@/features/wheel/types/wheel.types'
import { Textarea } from '@/ui'

type Props = {
  isOpen: boolean
  onClose: () => void
  spheres: WheelSphere[]
  onActionChange: (sphereId: WheelSphere['id'], index: number, value: string) => void
  onAddAction: (sphereId: WheelSphere['id']) => void
  onRemoveAction: (sphereId: WheelSphere['id'], index: number) => void
  actionInputRefs?: MutableRefObject<Record<string, HTMLTextAreaElement | null>>
}

export default function WheelPlanModal({
  isOpen,
  onClose,
  spheres,
  onActionChange,
  onAddAction,
  onRemoveAction,
  actionInputRefs,
}: Props) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-[rgba(4,8,20,0.72)] p-4">
      <div className="card-surface flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-white/[0.08] px-6 py-5">
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[.2em] text-[var(--text-muted)]">
              {WHEEL_TEXTS.plan.title}
            </p>
            <h3 className="text-lg font-semibold text-white">
              {WHEEL_TEXTS.plan.subtitle}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-sm text-white/50 hover:text-white"
            aria-label={WHEEL_TEXTS.plan.closeAria}
          >
            ×
          </button>
        </div>

        <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto px-6 py-5">
          {spheres.map((sphere) => {
            const actions = Array.from({ length: 3 }, (_, index) => sphere.actions?.[index] ?? { text: '' })

            return (
              <section
                key={sphere.id}
                className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-4"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="truncate text-sm font-semibold text-white">
                      {sphere.name}
                    </h4>
                    <p className="text-xs text-white/50">
                      {WHEEL_TEXTS.plan.currentScore(sphere.score)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {actions.map((action, index) => {
                    const key = `${sphere.id}-${index}`
                    const isEmpty = !action.text

                    return (
                      <div
                        key={key}
                        className="group flex items-start gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            isEmpty
                              ? onAddAction(sphere.id)
                              : actionInputRefs?.current[key]?.focus()
                          }
                          className="mt-0.5 min-w-[16px] text-[11px] font-medium text-white/35"
                          aria-label={WHEEL_TEXTS.plan.addOrEditActionAria}
                        >
                          {isEmpty ? '+' : index + 1}
                        </button>

                        <Textarea
                          ref={(el: HTMLTextAreaElement | null) => {
                            if (actionInputRefs) {
                              actionInputRefs.current[key] = el
                            }
                          }}
                          value={action.text}
                          onChange={(event) => onActionChange(sphere.id, index, event.target.value)}
                          placeholder={WHEEL_TEXTS.sphere.addActionPlaceholder}
                          rows={1}
                          className="min-h-7 flex-1 resize-none overflow-hidden bg-transparent text-sm leading-relaxed text-white/80 outline-none placeholder:text-white/25"
                        />

                        {!!action.text ? (
                          <button
                            type="button"
                            onClick={() => onRemoveAction(sphere.id, index)}
                            className="text-xs text-[var(--text-muted)] opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                            aria-label={WHEEL_TEXTS.sphere.removeActionAria}
                          >
                            ×
                          </button>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}
