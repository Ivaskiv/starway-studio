// frontend/src/features/settings/components/ThemeSettingsPanel.tsx

import { cn } from '@/lib/utils'
import { GlassCard, Input } from '@/ui'
import { Check, GitBranch, Palette, Pipette } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'

import {
  darkenColor,
  lightenColor,
  generateShades,
} from '@/lib/theme/color.utils'

import { ACCENT_PRESETS, type UiMode } from '@/theme/accent.utils'

/* -------------------------------------------------- */
/* utils */
/* -------------------------------------------------- */

function cssVar(name: string) {
  if (typeof window === 'undefined') return '#888'
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function applyCssToken(token: string, hex: string) {
  document.documentElement.style.setProperty(token, hex)
}

/* -------------------------------------------------- */
/* palette engine */
/* -------------------------------------------------- */

function buildPalette(accent: string) {
  const shades = generateShades(accent)

  return {
    accentSoft: lightenColor(accent, 12),
    accentStrong: darkenColor(accent, 18),
    accentLight: lightenColor(accent, 28),
    accentDark: darkenColor(accent, 28),
    shades,
  }
}

/* -------------------------------------------------- */
/* TOKENS */
/* -------------------------------------------------- */

const TOKENS = [
  { token: '--accent', label: 'Accent', description: 'CTA • кнопки' },
  { token: '--accent-soft', label: 'Soft', description: 'Hover • badges' },
  { token: '--accent-strong', label: 'Strong', description: 'Pressed • тіні' },
  { token: '--bg-primary', label: 'BG', description: 'Фоновий шар' },
  { token: '--bg-secondary', label: 'Surface', description: 'Картки • панелі' },
  { token: '--bg-card', label: 'Card', description: 'Glass-карти' },
  { token: '--text-primary', label: 'Primary Text', description: 'Тексти заголовків' },
  { token: '--text-secondary', label: 'Secondary Text', description: 'Тексти мета' },
] as const

/* -------------------------------------------------- */
/* Swatch */
/* -------------------------------------------------- */

/* -------------------------------------------------- */
/* MAIN */
/* -------------------------------------------------- */

interface Props {
  accent: string
  mode: UiMode
  onAccentChange: (hex: string) => void
  onModeChange: (mode: UiMode) => void
}

export function ThemeSettingsPanel({
  accent,
  mode,
  onAccentChange,
  onModeChange,
}: Props) {

  const [tab, setTab] = useState<'tokens' | 'palette' | 'preview'>('tokens')

  const palette = useMemo(() => buildPalette(accent), [accent])

  /* ---------------- apply accent ---------------- */

  const applyAccent = useCallback((hex: string) => {

    onAccentChange(hex)

    const p = buildPalette(hex)

    applyCssToken('--accent', hex)
    applyCssToken('--accent-soft', p.accentSoft)
    applyCssToken('--accent-strong', p.accentStrong)
    applyCssToken('--accent-light', p.accentLight)
    applyCssToken('--accent-dark', p.accentDark)

  }, [onAccentChange])

  /* ---------------- token change ---------------- */

  const handleTokenPick = (token: string, hex: string) => {

    if (token === '--accent') {
      applyAccent(hex)
      return
    }

    applyCssToken(token, hex)
  }

  /* -------------------------------------------------- */

  return (
    <GlassCard className="ios-panel overflow-hidden p-0">

      {/* header */}

      <div className="flex items-center justify-between border-b border-[var(--border-primary)] px-6 py-5">

        <div className="flex items-center gap-3">
          <Palette size={18} />
          <div>
            <p className="font-bold text-[var(--text-primary)]">Колірна система</p>
            <p className="text-xs text-[var(--text-muted)]">
              Accent, палітра і preview в одному control center
            </p>
          </div>
        </div>

        {/* mode switch */}

        <div className="ios-segment-shell">

          {(['dark', 'light'] as UiMode[]).map(m => (
            <button
              key={m}
              onClick={() => onModeChange(m)}
              className={cn(
                mode === m ? 'ios-segment-btn--active' : 'ios-segment-btn--idle'
              )}
            >
              {m === 'dark' ? 'Темна' : 'Світла'}
            </button>
          ))}

        </div>

      </div>

      {/* accent presets */}

      <div className="flex flex-wrap gap-2 border-b border-[var(--border-primary)] px-6 py-4">

        {ACCENT_PRESETS.map((p, index) => (
          <button
            key={p.hex}
            onClick={() => applyAccent(p.hex)}
            className={cn(
              'theme-preset',
              `preset-${index}`,
              accent === p.hex ? 'theme-preset-active' : 'theme-preset-inactive',
            )}
          >
            {accent === p.hex && <Check size={12} />}
          </button>
        ))}

        <label className="theme-preset custom">

          <Pipette size={12} />

          <Input
            type="color"
            value={accent}
            onChange={(e) => applyAccent(e.target.value)}
          />

        </label>

      </div>

      {/* tabs */}

      <div className="flex border-b border-[var(--border-primary)] px-6 py-3">

        {['tokens', 'palette', 'preview'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t as any)}
            className={cn(
              tab === t ? 'ios-segment-btn--active' : 'ios-segment-btn--idle'
            )}
          >
            {t === 'tokens' ? 'Токени' : t === 'palette' ? 'Палітра' : 'Preview'}
          </button>
        ))}

      </div>

      {/* content */}

      <div className="p-6">

        {/* TOKENS */}

        {tab === 'tokens' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {TOKENS.map(t => {
              const raw = cssVar(t.token)
              return (
                <div
                  key={t.token}
                  className={cn(
                    'theme-token-card',
                    t.token === '--accent' && 'theme-token-active',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{t.label}</p>
                      <p className="text-xs text-[var(--text-muted)]">{t.description}</p>
                    </div>
                    {t.token === '--accent' && (
                      <div className="text-[var(--accent-soft)]">
                        <Check size={14} />
                      </div>
                    )}
                  </div>

                  <div className="mt-3 rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-3 shadow-[inset_0_1px_0_var(--glass-highlight)] backdrop-blur-[var(--blur-soft)]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--text-muted)]">
                      Поточне значення
                    </p>
                    <p className="mt-2 font-mono text-sm text-[var(--text-primary)]">
                      {raw}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs uppercase text-[var(--text-muted)]">
                    <span className="font-semibold tracking-widest">{raw}</span>
                    <label className="theme-token-edit">
                      <Pipette size={14} />
                      <Input
                        type="color"
                        value={raw}
                        onChange={(e) => handleTokenPick(t.token, e.target.value)}
                        className="pointer-events-none opacity-0 absolute inset-0"
                      />
                    </label>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* PALETTE */}

        {tab === 'palette' && (

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">

            {palette.shades.map((shade) => (
              <div key={shade.name} className="ios-glass-soft p-4">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{shade.name}</p>
                <p className="mt-1 font-mono text-xs text-[var(--text-muted)]">{shade.hex}</p>
              </div>
            ))}

          </div>

        )}

        {/* PREVIEW */}

        {tab === 'preview' && (

          <div className="space-y-4">
            <button className="ios-button">Primary Action</button>
            <div className="ios-glass-soft rounded-[20px] p-4">Glass Card Preview</div>
            <input className="ios-input" placeholder="Input preview" />
          </div>

        )}

      </div>

      {/* footer */}

      <div className="flex items-center gap-2 border-t border-[var(--border-primary)] px-6 py-4 text-xs text-[var(--text-muted)]">

        <GitBranch size={12} />

        Theme engine synced · {accent}

      </div>

    </GlassCard>
  )
}
