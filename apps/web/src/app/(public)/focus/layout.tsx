import FocusShellLayout from '@/features/landings/focus/pages/FocusLayout'
import type { ReactNode } from 'react'
import styles from './styles/focus.module.css'

type FocusRouteLayoutProps = {
  children: ReactNode
}

export default function FocusRouteLayout({ children }: FocusRouteLayoutProps) {
  return <FocusShellLayout><div className={styles.content}>{children}</div></FocusShellLayout>
}
