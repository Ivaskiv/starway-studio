import type { ReactNode } from 'react'
import { Monitor, Send, Smartphone } from 'lucide-react'

export type CrossChannelPreviewMode = 'desktop' | 'miniapp' | 'telegram'

const MODE_META: Record<
  CrossChannelPreviewMode,
  {
    label: string
    icon: ReactNode
  }
> = {
  desktop: {
    label: 'Desktop',
    icon: <Monitor className="h-4 w-4" />,
  },
  miniapp: {
    label: 'Mini App',
    icon: <Smartphone className="h-4 w-4" />,
  },
  telegram: {
    label: 'Telegram',
    icon: <Send className="h-4 w-4" />,
  },
}

export function CrossChannelPreviewTabs({
  mode,
  onChange,
  className = '',
}: {
  mode: CrossChannelPreviewMode
  onChange: (value: CrossChannelPreviewMode) => void
  className?: string
}) {
  return (
    <div
      className={[
        'inline-flex flex-wrap items-center justify-center gap-2 rounded-[24px] border border-[rgba(72,94,160,0.35)] bg-[rgba(14,18,29,0.86)] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_12px_30px_rgba(0,0,0,0.22)] backdrop-blur-xl',
        className,
      ].join(' ')}
    >
      {Object.entries(MODE_META).map(([value, meta]) => {
        const isActive = mode === value

        return (
          <button
            key={value}
            type="button"
            onClick={() => onChange(value as CrossChannelPreviewMode)}
            className={[
              'inline-flex items-center gap-2 rounded-[18px] px-4 py-3 text-sm font-semibold transition-all',
              isActive
                ? 'border border-[rgba(111,140,224,0.5)] bg-[linear-gradient(180deg,rgba(71,96,175,0.98),rgba(42,58,111,0.96))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_16px_30px_rgba(0,0,0,0.24)]'
                : 'border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.035)] text-[var(--text-secondary)] hover:border-[rgba(111,140,224,0.22)] hover:text-[var(--text-primary)]',
            ].join(' ')}
            aria-pressed={isActive}
          >
            {meta.icon}
            {meta.label}
          </button>
        )
      })}
    </div>
  )
}
