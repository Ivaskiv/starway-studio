const ACCENT_STORAGE_KEY = 'starway_accent_color'
const DEFAULT_ACCENT = '#f97316'

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

function shiftRgb(
  [r, g, b]: [number, number, number],
  amount: number,
): [number, number, number] {
  return [clamp(r + amount), clamp(g + amount), clamp(b + amount)]
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

  let rp = 0
  let gp = 0
  let bp = 0

  if (h < 60) [rp, gp, bp] = [c, x, 0]
  else if (h < 120) [rp, gp, bp] = [x, c, 0]
  else if (h < 180) [rp, gp, bp] = [0, c, x]
  else if (h < 240) [rp, gp, bp] = [0, x, c]
  else if (h < 300) [rp, gp, bp] = [x, 0, c]
  else [rp, gp, bp] = [c, 0, x]

  return [clamp((rp + m) * 255), clamp((gp + m) * 255), clamp((bp + m) * 255)]
}

export function applyAccentColor(accentHex?: string | null) {
  const hex = accentHex || DEFAULT_ACCENT
  const rgb = hexToRgb(hex)
  const [r, g, b] = rgb
  const [h, s, l] = rgbToHsl(r, g, b)

  // fix code_x: normalize accent palette for ergonomic glass UI (less harsh saturation, balanced contrast).
  const softRgb = hslToRgb(h, clamp(s * 0.82, 40, 76), clamp(l + 12, 46, 68))
  const strongRgb = hslToRgb(h, clamp(s * 0.9, 46, 86), clamp(l - 14, 28, 50))
  const glowRgb = hslToRgb(h, clamp(s * 0.72, 26, 64), clamp(l + 8, 34, 56))
  // fix code_x: keep ambient background in premium olive-night direction (Sila Voli style),
  // while preserving selected accent for CTA/active controls.
  const oliveHue = 96
  const ambientHue = ((h * 0.2) + (oliveHue * 0.8)) % 360
  const ambient1 = hslToRgb(ambientHue, 36, 7)
  const ambient2 = hslToRgb((ambientHue + 8) % 360, 30, 11)

  const darkerHex = rgbToHex(...strongRgb)
  const lighterHex = rgbToHex(...softRgb)

  // fix code_x: expose a full dynamic color system so accent integrates into layout/background/buttons.
  document.documentElement.style.setProperty('--color-accent', hex)
  document.documentElement.style.setProperty('--color-primary', hex)
  document.documentElement.style.setProperty('--color-accent-strong', darkerHex)
  document.documentElement.style.setProperty('--color-accent-soft', lighterHex)
  document.documentElement.style.setProperty('--accent-rgb', `${r}, ${g}, ${b}`)
  document.documentElement.style.setProperty('--accent-soft-rgb', `${softRgb[0]}, ${softRgb[1]}, ${softRgb[2]}`)
  document.documentElement.style.setProperty('--accent-strong-rgb', `${strongRgb[0]}, ${strongRgb[1]}, ${strongRgb[2]}`)
  document.documentElement.style.setProperty('--accent-glow-rgb', `${glowRgb[0]}, ${glowRgb[1]}, ${glowRgb[2]}`)
  document.documentElement.style.setProperty('--ambient-rgb', `${ambient1[0]}, ${ambient1[1]}, ${ambient1[2]}`)
  document.documentElement.style.setProperty('--ambient-rgb-2', `${ambient2[0]}, ${ambient2[1]}, ${ambient2[2]}`)
  document.documentElement.style.setProperty('--accent-gradient', `linear-gradient(135deg, ${lighterHex} 0%, ${hex} 50%, ${darkerHex} 100%)`)
  // fix code_x: centralized liquid-funnel token system derived from selected accent.
  document.documentElement.style.setProperty('--funnel-accent-rgb', `${r}, ${g}, ${b}`)
  document.documentElement.style.setProperty('--funnel-accent-soft-rgb', `${softRgb[0]}, ${softRgb[1]}, ${softRgb[2]}`)
  document.documentElement.style.setProperty('--funnel-accent-strong-rgb', `${strongRgb[0]}, ${strongRgb[1]}, ${strongRgb[2]}`)
  document.documentElement.style.setProperty('--funnel-glow-rgb', `${glowRgb[0]}, ${glowRgb[1]}, ${glowRgb[2]}`)
}

export function saveAccentColor(accentHex: string) {
  localStorage.setItem(ACCENT_STORAGE_KEY, accentHex)
  applyAccentColor(accentHex)
}

export function loadAccentColor(): string {
  return localStorage.getItem(ACCENT_STORAGE_KEY) || DEFAULT_ACCENT
}

export function hasSavedAccentColor(): boolean {
  return Boolean(localStorage.getItem(ACCENT_STORAGE_KEY))
}
