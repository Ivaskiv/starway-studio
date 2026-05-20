import FocusRouteFrame from '@/features/landings/focus/pages/FocusRouteFrame'
import type { ReactNode } from 'react'

type FocusRouteLayoutProps = {
  children: ReactNode
}

export default function FocusRouteLayout({ children }: FocusRouteLayoutProps) {
  return <FocusRouteFrame>{children}</FocusRouteFrame>
}
