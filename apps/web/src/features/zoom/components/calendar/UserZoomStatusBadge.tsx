import type { UserZoomCommercePresentationState } from '../../zoom.utils'

type Props = {
  state: UserZoomCommercePresentationState
  label: string
}

const STATUS_CLASS: Record<UserZoomCommercePresentationState, string> = {
  AVAILABLE: 'border-emerald-300/20 bg-emerald-500/15 text-emerald-200',
  REQUESTED: 'border-sky-300/20 bg-sky-500/15 text-sky-100',
  APPROVED_PENDING_PAYMENT: 'border-amber-300/25 bg-amber-500/15 text-amber-100',
  PAID: 'border-emerald-300/25 bg-emerald-500/15 text-emerald-100',
  EXPIRED: 'border-white/10 bg-white/[0.05] text-white/55',
  CANCELLED: 'border-red-300/20 bg-red-500/10 text-red-200',
  REJECTED: 'border-red-300/20 bg-red-500/10 text-red-200',
}

export function UserZoomStatusBadge({ state, label }: Props) {
  return (
    <span
      data-zoom-commerce-state={state}
      className={[
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold',
        STATUS_CLASS[state],
      ].join(' ')}
    >
      {label}
    </span>
  )
}
