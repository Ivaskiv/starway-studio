import FocusShellLayout from '@/features/landings/focus/pages/FoсusLayout'
import type { ReactNode } from 'react'
import styles from './styles/focus.module.scss'

type FocusRouteLayoutProps = {
  children: ReactNode
}

export default function FocusRouteLayout({ children }: FocusRouteLayoutProps) {
  return <FocusShellLayout><div className={styles.content}>{children}</div></FocusShellLayout>
}
