import type { ReactNode } from 'react'
import { useState } from 'react'

import { CrossChannelPreviewTabs } from './CrossChannelPreviewTabs'
import type { CrossChannelPreviewMode } from './CrossChannelPreviewTabs'

export function CrossChannelPreviewShowcase({
  title,
  description,
  topBadge,
  initialMode = 'miniapp',
  desktop,
  miniApp,
  telegram,
  className = '',
}: {
  title: string
  description: string
  topBadge?: ReactNode
  initialMode?: CrossChannelPreviewMode
  desktop: ReactNode
  miniApp: ReactNode
  telegram: ReactNode
  className?: string
}) {
  const [mode, setMode] = useState<CrossChannelPreviewMode>(initialMode)

  return (
    <div className={['dashboard-liquid-card overflow-hidden', className].join(' ')}>
      <div className="dashboard-liquid-edge--top border-b border-[var(--border)] px-5 py-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[rgb(var(--accent-soft-rgb))]">
              Cross-Channel Preview
            </p>
            <h4 className="mt-3 text-[1.6rem] font-semibold tracking-tight text-[var(--text-primary)]">{title}</h4>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{description}</p>
          </div>

          {topBadge ? (
            <div className="xl:pt-1">
              {topBadge}
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex justify-center">
          <CrossChannelPreviewTabs mode={mode} onChange={setMode} className="mx-auto" />
        </div>
      </div>

      <div className="px-5 py-5">
        {mode === 'desktop' ? desktop : null}
        {mode === 'miniapp' ? miniApp : null}
        {mode === 'telegram' ? telegram : null}
      </div>
    </div>
  )
}
