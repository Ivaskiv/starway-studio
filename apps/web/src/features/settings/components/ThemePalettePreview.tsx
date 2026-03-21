import { useMemo } from 'react'
import { useThemeContext } from '@/theme/ThemeProvider'

const TOKENS = [
  { label: 'Accent', varName: '--accent', description: 'CTA, highlights' },
  { label: 'Soft', varName: '--accent-soft', description: 'Hover, badges' },
  { label: 'Strong', varName: '--accent-strong', description: 'Pressed, borders' },
  { label: 'Glass', varName: '--glass-bg', description: 'Panels, cards' },
  { label: 'Surface', varName: '--glass-border', description: 'Card borders' },
  { label: 'Text', varName: '--text-primary', description: 'Headlines' },
]

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

export function ThemePalettePreview() {
  const theme = useThemeContext()
  const palette = useMemo(() => {
    if (typeof window === 'undefined') return TOKENS.map((token) => ({ ...token, value: '' }))
    return TOKENS.map((token) => ({
      ...token,
      value: cssVar(token.varName),
    }))
  }, [theme.accent, theme.mode])

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {palette.map((token) => (
        <div
          key={token.label}
          className="p-4 rounded-2xl border border-[rgba(var(--accent-rgb),0.35)] bg-[rgba(var(--accent-rgb),0.08)] text-[var(--text-primary)] shadow-[0_20px_50px_rgba(var(--accent-rgb),0.2)]"
        >
          <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--text-muted)] mb-2">{token.label}</p>
          <div className={`h-12 rounded-xl border border-[rgba(255,255,255,0.2)] bg-[color:var(--glass-bg)] flex items-center justify-center mb-3 text-sm font-black ${token.label === 'Text' ? 'text-[var(--text-primary)]' : 'text-[var(--on-accent)]'}`}>
            {token.value || '—'}
          </div>
          <p className="text-[12px] text-[var(--text-muted)]">{token.description}</p>
        </div>
      ))}
    </div>
  )
}
