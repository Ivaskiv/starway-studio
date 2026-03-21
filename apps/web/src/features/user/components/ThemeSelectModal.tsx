// frontend/src/features/user/components/ThemeSelectModal.tsx
// ═══════════════════════════════════════════════════════════════
//  Модалка вибору теми при першому вході
//  ✗ backdrop-filter  ✗ inline style={{}}
//  ✓ gradient overlay замість blur
// ═══════════════════════════════════════════════════════════════

import { applyAccentColor, loadAccentColor } from '@/theme/accent.utils'
import { X } from 'lucide-react'
import { useEffect } from 'react'

interface ThemeSelectModalProps {
  open:    boolean
  onClose: () => void
}

type Theme = 'dark' | 'light'

const THEMES: { id: Theme; emoji: string; label: string }[] = [
  { id: 'dark',  emoji: '🌙', label: 'Темна'  },
  { id: 'light', emoji: '☀️', label: 'Світла' },
]

export default function ThemeSelectModal({ open, onClose }: ThemeSelectModalProps) {
  // Esc close
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])

  if (!open) return null

  const setTheme = (theme: Theme) => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('theme', theme)
    // Повторно застосувати акцент після зміни теми
    applyAccentColor(loadAccentColor(), theme as any)
    onClose()
  }

  return (
    // Overlay — gradient замість backdrop-filter
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Background overlay без backdrop-filter */}
      <div className="absolute inset-0 bg-black/70" aria-hidden />

      {/* Dialog */}
      <div className="relative z-10 w-[420px] rounded-2xl border border-[color:var(--border-primary)] bg-[color:var(--bg-secondary)] p-6 space-y-5 shadow-2xl">

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)] hover:bg-[rgba(255,255,255,.06)] transition-colors"
          aria-label="Закрити"
        >
          <X className="w-4 h-4" />
        </button>

        <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">
          Оберіть тему
        </h2>
        <p className="text-sm text-[color:var(--text-muted)]">
          Можна змінити пізніше у налаштуваннях
        </p>

        <div className="grid grid-cols-2 gap-3">
          {THEMES.map(t => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className="p-4 rounded-xl border border-[color:var(--border-primary)] bg-[color:var(--glass-bg)] hover:bg-[rgba(255,255,255,.06)] hover:border-[rgba(var(--accent-rgb),.3)] text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] transition-all text-sm font-medium"
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
