import type { ReactNode } from 'react'

type WelcomeTestShellProps = {
  kicker?: string
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
  variant?: 'default' | 'loading' | 'error'
}

export function WelcomeTestShell({
  kicker = 'Welcome test',
  title,
  subtitle,
  children,
  footer,
  variant = 'default',
}: WelcomeTestShellProps) {
  return (
    <div className="ab-test-page">
      <div className="ab-test-page__frame">
        <div
          className={`ab-test-shell ${
            variant === 'loading' ? 'ab-test-shell--loading' : ''
          } ${variant === 'error' ? 'ab-test-shell--error' : ''}`}
        >
          <div className="ab-test-shell__header">
            <p className="ab-test-kicker">{kicker}</p>
            <h1 className="ab-test-title">{title}</h1>
            {subtitle ? <p className="ab-test-subtitle">{subtitle}</p> : null}
          </div>
          <div className="ab-test-shell__body">{children}</div>
          {footer ? <div className="ab-test-shell__footer">{footer}</div> : null}
        </div>
      </div>
    </div>
  )
}
