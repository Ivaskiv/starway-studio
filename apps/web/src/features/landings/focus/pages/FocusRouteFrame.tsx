import type { ReactNode } from 'react'

import FocusLayout from './FocusLayout'
import styles from './focusRoute.module.css'

type FocusRouteFrameProps = {
  children: ReactNode
}

export default function FocusRouteFrame({ children }: FocusRouteFrameProps) {
  return (
    <FocusLayout>
      <div className={styles.content}>{children}</div>
    </FocusLayout>
  )
}
