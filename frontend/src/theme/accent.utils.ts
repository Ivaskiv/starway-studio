// frontend/src/theme/colors/accent.utils.ts
const ACCENT_STORAGE_KEY = 'starway_accent_color'
export const DEFAULT_ACCENT = '#0c1d32'   // ← яскравий синій як star-way.pro
const MODE_STORAGE_KEY = 'starway_ui_theme'

export const ACCENT_PRESETS = [
  { name: 'Starway Blue',  hex: '#4d7fe8' },  // default — matches the hero CTA gradient from star-way.pro
  { name: 'Deep Navy',     hex: '#07122b' },  // very dark base with icy glow contrast
  { name: 'Icy Indigo',    hex: '#5c78a5' },  // frosty highlight for text-on-cold-bg
  { name: 'Electric Blue', hex: '#cd122f' },  // sharp neon rim
  { name: 'Midnight',      hex: '#0d1b3e' },
  { name: 'Violet',        hex: '#20104c' },
  { name: 'Aurora Purple', hex: '#3c0d4c' },
  { name: 'Crimson',       hex: '#3a0f2c' },
  { name: 'Forest',        hex: '#0a2e1a' },
  { name: 'Teal',          hex: '#0b2f34' },
  { name: 'Amber',         hex: '#3c240f' },
] as const

export type UiMode = 'dark' | 'light'
export const DEFAULT_MODE: UiMode = 'dark'

export function normalizeUiMode(value?: string | null): UiMode {
  return value === 'light' ? 'light' : DEFAULT_MODE
}

export function loadUiMode(): UiMode {
  if (typeof window === 'undefined') return DEFAULT_MODE
  return normalizeUiMode(localStorage.getItem(MODE_STORAGE_KEY))
}

export function applyUiMode(mode: UiMode) {
  if (typeof document === 'undefined') return
  document.documentElement.style.setProperty('color-scheme', mode)
  document.documentElement.setAttribute('data-ui-theme', mode)
}

export function saveUiMode(mode: UiMode) {
  if (typeof window === 'undefined') return
  localStorage.setItem(MODE_STORAGE_KEY, mode)
  applyUiMode(mode)
}

export function initTheme() {
  const accent = loadAccentColor()
  const mode = loadUiMode()
  applyAccentColor(accent)
  applyUiMode(mode)
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace('#', '').trim()
  const safe = normalized.length === 3
    ? normalized.split('').map((c) => c + c).join('')
    : normalized
  const int = parseInt(safe, 16)
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255]
}

function clamp(value: number, min = 0, max = 255): number {
  return Math.max(min, Math.min(max, Math.round(value)))
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => clamp(v).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const normalize = (channel: number) => {
    const value = channel / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * normalize(r) + 0.7152 * normalize(g) + 0.0722 * normalize(b)
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const d = max - min
  const l = (max + min) / 2

  if (d === 0) return [0, 0, l * 100]

  const s = d / (1 - Math.abs(2 * l - 1))
  let h = 0

  if (max === rn) h = ((gn - bn) / d) % 6
  else if (max === gn) h = (bn - rn) / d + 2
  else h = (rn - gn) / d + 4

  return [((h * 60) + 360) % 360, s * 100, l * 100]
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const sat = clamp(s, 0, 100) / 100
  const lig = clamp(l, 0, 100) / 100

  const c = (1 - Math.abs(2 * lig - 1)) * sat
  const x = c * (1 - Math.abs((h / 60) % 2 - 1))
  const m = lig - c / 2

  let rp = 0, gp = 0, bp = 0

  if (h < 60)       [rp, gp, bp] = [c, x, 0]
  else if (h < 120) [rp, gp, bp] = [x, c, 0]
  else if (h < 180) [rp, gp, bp] = [0, c, x]
  else if (h < 240) [rp, gp, bp] = [0, x, c]
  else if (h < 300) [rp, gp, bp] = [x, 0, c]
  else              [rp, gp, bp] = [c, 0, x]

  return [clamp((rp + m) * 255), clamp((gp + m) * 255), clamp((bp + m) * 255)]
}

export function applyAccentColor(accentHex?: string | null, mode?: UiMode) {
  const hex = accentHex || DEFAULT_ACCENT
  const rgb = hexToRgb(hex)
  const [r, g, b] = rgb
  const [h, s, l] = rgbToHsl(r, g, b)

  // Похідні кольори — м'якший soft, глибший strong
  const softRgb   = hslToRgb(h, clamp(s * 0.78, 38, 72), clamp(l + 16, 52, 72))
  const strongRgb = hslToRgb(h, clamp(s * 0.92, 50, 90), clamp(l - 16, 22, 44))
  const glowRgb   = hslToRgb(h, clamp(s * 0.68, 24, 60), clamp(l + 10, 36, 58))

  // Ambient — синій напрямок (не olive)
  const ambientHue = (h + 10) % 360
  const ambient1   = hslToRgb(ambientHue, 40, 6)
  const ambient2   = hslToRgb((ambientHue + 6) % 360, 34, 10)

  const darkerHex  = rgbToHex(...strongRgb)
  const lighterHex = rgbToHex(...softRgb)

  const accentLuminance = relativeLuminance(rgb)
  const onAccentHex = accentLuminance > 0.35 ? '#071018' : '#f0f6ff'
  const onAccentRgb = hexToRgb(onAccentHex)

  const set = (k: string, v: string) =>
    document.documentElement.style.setProperty(k, v)

  // ── Акцент ────────────────────────────────────────────────────────────────
  set('--accent',               hex)
  set('--color-accent',         hex)
  set('--color-primary',        hex)
  set('--color-accent-strong',  darkerHex)
  set('--color-accent-soft',    lighterHex)
  set('--accent-rgb',           `${r}, ${g}, ${b}`)
  set('--accent-soft-rgb',      `${softRgb[0]}, ${softRgb[1]}, ${softRgb[2]}`)
  set('--accent-strong-rgb',    `${strongRgb[0]}, ${strongRgb[1]}, ${strongRgb[2]}`)
  set('--accent-glow-rgb',      `${glowRgb[0]}, ${glowRgb[1]}, ${glowRgb[2]}`)
  set('--accent-gradient',      `linear-gradient(135deg, ${lighterHex} 0%, ${hex} 50%, ${darkerHex} 100%)`)
  set('--on-accent',            onAccentHex)
  set('--on-accent-rgb',        `${onAccentRgb[0]}, ${onAccentRgb[1]}, ${onAccentRgb[2]}`)

  // ── Ambient / фон ─────────────────────────────────────────────────────────
  set('--ambient-rgb',          `${ambient1[0]}, ${ambient1[1]}, ${ambient1[2]}`)
  set('--ambient-rgb-2',        `${ambient2[0]}, ${ambient2[1]}, ${ambient2[2]}`)

  // ── Glass ─────────────────────────────────────────────────────────────────
  set('--glass-border-rgb',     `${softRgb[0]}, ${softRgb[1]}, ${softRgb[2]}`)
  set('--glass-shadow-rgb',     `${glowRgb[0]}, ${glowRgb[1]}, ${glowRgb[2]}`)
  set('--glass-highlight-rgb',  `${onAccentRgb[0]}, ${onAccentRgb[1]}, ${onAccentRgb[2]}`)

  // ── Funnel (синхронізовано) ────────────────────────────────────────────────
  set('--funnel-accent-rgb',        `${r}, ${g}, ${b}`)
  set('--funnel-accent-soft-rgb',   `${softRgb[0]}, ${softRgb[1]}, ${softRgb[2]}`)
  set('--funnel-accent-strong-rgb', `${strongRgb[0]}, ${strongRgb[1]}, ${strongRgb[2]}`)
  set('--funnel-glow-rgb',          `${glowRgb[0]}, ${glowRgb[1]}, ${glowRgb[2]}`)

  if (mode) applyUiMode(mode)
}

export function saveAccentColor(accentHex: string, mode?: UiMode) {
  localStorage.setItem(ACCENT_STORAGE_KEY, accentHex)
  if (mode) saveUiMode(mode)
  applyAccentColor(accentHex, mode)
}

export function loadAccentColor(): string {
  return localStorage.getItem(ACCENT_STORAGE_KEY) || DEFAULT_ACCENT
}

export function hasSavedAccentColor(): boolean {
  return Boolean(localStorage.getItem(ACCENT_STORAGE_KEY))
}
