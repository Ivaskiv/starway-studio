// frontend/src/features/settings/components/ThemeSettingsPanel.tsx

import { cn } from '@/lib/utils'
import { GlassCard, Input } from '@/ui'
import { Check, GitBranch, Palette, Pipette } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  colorToRgba,
  darkenColor,
  generateShades,
  getContrastColor,
  lightenColor,
} from '@/shared/utils/color.utils'

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

function ColorPreview({ color, contrast }: { color: string; contrast: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    ref.current.style.background = color
    ref.current.style.color = contrast
  }, [color, contrast])

  return <div ref={ref} className="mt-3 h-14 rounded-xl border border-[var(--border-primary)]" />
}

function PaletteShadeCard({ shade }: { shade: { name: string; hex: string } }) {
  const ref = useRef<HTMLDivElement>(null)
  const contrast = getContrastColor(shade.hex)

  useEffect(() => {
    if (!ref.current) return
    ref.current.style.background = shade.hex
    ref.current.style.color = contrast
    ref.current.style.boxShadow = `0 10px 20px ${colorToRgba(shade.hex, 0.4)}`
  }, [shade.hex, contrast])

  return (
    <div ref={ref} className="theme-color-card">
      {shade.name}
    </div>
  )
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
    <GlassCard className="p-0 overflow-hidden">

      {/* header */}

      <div className="flex items-center justify-between px-6 py-4 border-b">

        <div className="flex items-center gap-3">
          <Palette size={18} />
          <div>
            <p className="font-bold">Колірна система</p>
            <p className="text-xs opacity-70">
              Accent + tokens + palette engine
            </p>
          </div>
        </div>

        {/* mode switch */}

        <div className="flex gap-2">

          {(['dark', 'light'] as UiMode[]).map(m => (
            <button
              key={m}
              onClick={() => onModeChange(m)}
              className={cn(
                'theme-toggle',
                mode === m && 'theme-toggle-active'
              )}
            >
              {m}
            </button>
          ))}

        </div>

      </div>

      {/* accent presets */}

      <div className="flex gap-2 px-6 py-3 border-b flex-wrap">

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

      <div className="flex border-b">

        {['tokens', 'palette', 'preview'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t as any)}
            className={cn(
              'theme-tab',
              tab === t && 'theme-tab-active'
            )}
          >
            {t}
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
              const contrast = getContrastColor(raw)
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

                  <ColorPreview color={raw} contrast={contrast} />

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

          <div className="grid grid-cols-4 gap-3">

            {palette.shades.map((shade) => (
              <PaletteShadeCard key={shade.name} shade={shade} />
            ))}

          </div>

        )}

        {/* PREVIEW */}

        {tab === 'preview' && (

          <div className="space-y-4">

            <button className="theme-btn-primary">
              Primary Button
            </button>

            <div className="theme-glass-card p-4 rounded-xl">
              Glass Card Preview
            </div>

            <input
              className="theme-input"
              placeholder="Input preview"
            />

          </div>

        )}

      </div>

      {/* footer */}

      <div className="px-6 py-3 border-t text-xs opacity-70 flex items-center gap-2">

        <GitBranch size={12} />

        Theme engine synced · {accent}

      </div>

    </GlassCard>
  )
}
