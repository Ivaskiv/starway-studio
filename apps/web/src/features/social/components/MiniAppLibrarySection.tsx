import { ArrowRight, BookOpen, Lock } from 'lucide-react'

import type { MiniAppLibraryItem } from '@/features/social/types/miniapp'

interface MiniAppLibrarySectionProps {
  items: MiniAppLibraryItem[]
}

export default function MiniAppLibrarySection({ items }: MiniAppLibrarySectionProps) {
  return (
    <div className="space-y-4 px-4 pt-6">
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-[var(--text-primary)]">Матеріали</h2>
        <p className="text-sm text-[var(--text-secondary)]">Тут усе, що вже доступно тобі зараз у Starway.</p>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.title}
            className={[
              'flex items-center gap-3 rounded-2xl border p-4',
              item.locked
                ? 'border-[var(--border)] bg-[var(--bg-secondary)] opacity-60'
                : 'border-[rgba(var(--accent-rgb),0.3)] bg-[rgba(var(--accent-rgb),0.06)]',
            ].join(' ')}
          >
            <span className="btn-icon h-11 w-11 text-[rgb(var(--accent-soft-rgb))]" aria-hidden="true">
              <BookOpen className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-[var(--text-primary)]">{item.title}</p>
              <p className="text-xs text-[var(--text-muted)]">{item.sub}</p>
            </div>
            {item.locked ? (
              <Lock className="h-4 w-4 text-[var(--text-muted)]" />
            ) : (
              <ArrowRight className="h-4 w-4 text-[rgb(var(--accent-soft-rgb))]" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
