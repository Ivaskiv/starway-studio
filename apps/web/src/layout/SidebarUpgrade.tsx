import { ROUTES } from '@/config/routes'
import { useSmartNavigation } from '@/hooks/useSmartNavigation'

export default function SidebarUpgrade({
  collapsed,
  hasPremium,
}: {
  collapsed: boolean
  hasPremium: boolean
}) {
  const { navigateTo } = useSmartNavigation()

  return (
    <div className={[
      'rounded-xl border border-[rgba(var(--accent-rgb),0.22)] bg-[rgba(var(--accent-rgb),0.06)] p-3',
      collapsed ? 'mx-1' : '',
    ].join(' ')}>
      {!collapsed && (
        <>
          <p className="text-[11px] font-semibold text-[var(--text-secondary)]">ABsystem Premium</p>
          <p className="mt-1 text-[10px] leading-relaxed text-[var(--text-muted)]">
            {hasPremium ? 'Доступ активний' : 'Плани, Zoom і розширення доступні після апгрейду.'}
          </p>
        </>
      )}
      <button
        type="button"
        onClick={() => navigateTo(ROUTES.SUBSCRIPTION, { requiresAuth: true })}
        className={[
          'mt-2 w-full rounded-lg border border-[rgba(var(--accent-rgb),0.24)] bg-[rgba(var(--accent-rgb),0.12)] px-3 py-2 text-[11px] font-semibold text-[var(--text-primary)]',
          collapsed ? 'px-0 text-[10px]' : '',
        ].join(' ')}
      >
        {collapsed ? '★' : 'Переглянути плани'}
      </button>
    </div>
  )
}
