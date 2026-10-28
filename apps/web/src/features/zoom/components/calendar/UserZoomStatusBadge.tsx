import { getUserZoomCommercePresentation, type UserZoomCommercePresentationState } from '../../zoom.utils'

type Props = {
  state: UserZoomCommercePresentationState
  label: string
}

export function UserZoomStatusBadge({ state, label }: Props) {
  const { badgeClass } = getUserZoomCommercePresentation({ commerceStatus: state === 'AVAILABLE' ? undefined : state })

  return (
    <span
      data-zoom-commerce-state={state}
      className={[
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold',
        badgeClass,
      ].join(' ')}
    >
      {label}
    </span>
  )
}
