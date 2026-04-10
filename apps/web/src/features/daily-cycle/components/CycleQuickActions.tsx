import type { ReactNode } from 'react'

export interface CycleQuickAction {
  id: string
  icon: ReactNode
  label: string
  onClick: () => void
}

export default function CycleQuickActions({ actions }: { actions: CycleQuickAction[] }) {
  return (
    <section
      data-testid="quick-actions"
      className="dashboard-liquid-card--soft overflow-hidden p-4"
    >
      <h3 className="text-[1.05rem] font-semibold text-[var(--text-primary)]">Швидкі дії</h3>
      <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={action.onClick}
            className="flex min-h-[102px] flex-col items-center justify-center rounded-[18px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-3 py-3 text-center transition-all hover:border-[rgba(var(--accent-soft-rgb),0.24)] hover:bg-[rgba(255,255,255,0.05)]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] text-[var(--text-primary)]">
              {action.icon}
            </span>
            <span className="mt-2.5 whitespace-pre-line text-[11px] font-medium leading-4 text-[var(--text-secondary)]">
              {action.label}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
