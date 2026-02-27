type RgbTuple = [number, number, number];

function clamp(value: number, min = 0, max = 255): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function normalizeHex(hex: string): string {
  const cleaned = hex.trim().replace('#', '');
  if (cleaned.length === 3) return cleaned.split('').map((char) => char + char).join('');
  return cleaned;
}

export function hexToRgb(hex: string): RgbTuple | null {
  const normalized = normalizeHex(hex);
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;
  const value = parseInt(normalized, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (value: number) => clamp(value).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  const lightness = (max + min) / 2;

  if (delta === 0) return [0, 0, lightness * 100];

  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue = 0;

  if (max === rn) hue = (gn - bn) / delta;
  else if (max === gn) hue = (bn - rn) / delta + 2;
  else hue = (rn - gn) / delta + 4;

  return [((hue * 60) + 360) % 360, saturation * 100, lightness * 100];
}

function hslToRgb(h: number, s: number, l: number): RgbTuple {
  const saturation = clamp(s, 0, 100) / 100;
  const lightness = clamp(l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lightness - c / 2;

  let rp = 0;
  let gp = 0;
  let bp = 0;

  if (h >= 0 && h < 60) [rp, gp, bp] = [c, x, 0];
  else if (h >= 60 && h < 120) [rp, gp, bp] = [x, c, 0];
  else if (h >= 120 && h < 180) [rp, gp, bp] = [0, c, x];
  else if (h >= 180 && h < 240) [rp, gp, bp] = [0, x, c];
  else if (h >= 240 && h < 300) [rp, gp, bp] = [x, 0, c];
  else [rp, gp, bp] = [c, 0, x];

  return [clamp((rp + m) * 255), clamp((gp + m) * 255), clamp((bp + m) * 255)];
}

export function lightenColor(hex: string, amount = 10): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const [h, s, l] = rgbToHsl(...rgb);
  const adjusted = Math.min(100, l + amount);
  return rgbToHex(...hslToRgb(h, s, adjusted));
}

export function darkenColor(hex: string, amount = 10): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const [h, s, l] = rgbToHsl(...rgb);
  const adjusted = Math.max(0, l - amount);
  return rgbToHex(...hslToRgb(h, s, adjusted));
}

export function colorToRgba(hex: string, alpha = 1): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(255,255,255,${alpha})`;
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

export function generateShades(hex: string): { name: string; label: string; hex: string }[] {
  const offsets = [
    { name: 'accent-950', label: 'Accent 950', amount: -45 },
    { name: 'accent-900', label: 'Accent 900', amount: -36 },
    { name: 'accent-800', label: 'Accent 800', amount: -28 },
    { name: 'accent-700', label: 'Accent 700', amount: -20 },
    { name: 'accent-600', label: 'Accent 600', amount: -12 },
    { name: 'accent-500', label: 'Accent 500', amount: 0 },
    { name: 'accent-400', label: 'Accent 400', amount: 10 },
    { name: 'accent-300', label: 'Accent 300', amount: 18 },
    { name: 'accent-200', label: 'Accent 200', amount: 28 },
    { name: 'accent-100', label: 'Accent 100', amount: 40 },
  ];

  return offsets.map((offset) => ({
    name: offset.name,
    label: offset.label,
    hex: offset.amount >= 0 ? lightenColor(hex, offset.amount) : darkenColor(hex, Math.abs(offset.amount)),
  }));
}

// export function getContrastColor(hex: string): '#000000' | '#ffffff' {
//   const rgb = hexToRgb(hex);
//   if (!rgb) return '#ffffff';
//   const luminance = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
//   return luminance > 0.55 ? '#000000' : '#ffffff';
// }
export function getContrastColor(hex: string): '#000000' | '#ffffff' {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#ffffff';
  const luminance = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
  return luminance > 0.55 ? '#000000' : '#ffffff';
}

export type ThemeMode = 'dark' | 'light';

const DEFAULT_THEME = {
  dark: {
    bg: '#030712',
    bgSoft: '#0f172a',
    text: '#f8fafc',
    textSecondary: '#94a3b8',
    glass: 'rgba(15, 23, 42, 0.55)',
  },
  light: {
    bg: '#f8fafc',
    bgSoft: '#e2e8f0',
    text: '#0f172a',
    textSecondary: '#475569',
    glass: 'rgba(240, 249, 255, 0.75)',
  },
};

export interface ThemePalette {
  accent: string;
  accentSoft: string;
  accentStrong: string;
  accentLight: string;
  accentDark: string;
  shades: ReturnType<typeof generateShades>;
  background: string;
  backgroundSoft: string;
  text: string;
  textSecondary: string;
  glass: string;
  glassBorder: string;
  glassGlow: string;
  glassAccentGlow: string;
}

export function buildThemePalette(accentColor: string, mode: ThemeMode): ThemePalette {
  const shades = generateShades(accentColor);
  const accentSoft = lightenColor(accentColor, 12);
  const accentStrong = darkenColor(accentColor, 18);
  const accentLight = lightenColor(accentColor, 28);
  const accentDark = darkenColor(accentColor, 30);
  const background = DEFAULT_THEME[mode].bg;
  const backgroundSoft = DEFAULT_THEME[mode].bgSoft;
  const text = DEFAULT_THEME[mode].text;
  const textSecondary = DEFAULT_THEME[mode].textSecondary;
  const glass = DEFAULT_THEME[mode].glass;

  return {
    accent: accentColor,
    accentSoft,
    accentStrong,
    accentLight,
    accentDark,
    shades,
    background,
    backgroundSoft,
    text,
    textSecondary,
    glass,
    glassBorder: accentSoft,
    glassGlow: colorToRgba(accentColor, 0.15),
    glassAccentGlow: colorToRgba(accentColor, 0.25),
  };
}

function tupleToString(tuple: RgbTuple | null): string {
  if (!tuple) return '0, 0, 0';
  return `${tuple[0]}, ${tuple[1]}, ${tuple[2]}`;
}

export function applyPalette(palette: ThemePalette) {
  document.documentElement.style.setProperty('--accent', palette.accent);
  document.documentElement.style.setProperty('--accent-soft', palette.accentSoft);
  document.documentElement.style.setProperty('--accent-strong', palette.accentStrong);
  document.documentElement.style.setProperty('--accent-light', palette.accentLight);
  document.documentElement.style.setProperty('--accent-dark', palette.accentDark);
  document.documentElement.style.setProperty(
    '--accent-rgb',
    tupleToString(hexToRgb(palette.accent)),
  );
  document.documentElement.style.setProperty('--bg', palette.background);
  document.documentElement.style.setProperty('--bg-soft', palette.backgroundSoft);
  document.documentElement.style.setProperty('--bg-rgb', tupleToString(hexToRgb(palette.background)));
  document.documentElement.style.setProperty('--bg-soft-rgb', tupleToString(hexToRgb(palette.backgroundSoft)));
  document.documentElement.style.setProperty('--text', palette.text);
  document.documentElement.style.setProperty('--text-rgb', tupleToString(hexToRgb(palette.text)));
  document.documentElement.style.setProperty('--text-secondary', palette.textSecondary);
  document.documentElement.style.setProperty('--text-secondary-rgb', tupleToString(hexToRgb(palette.textSecondary)));
  document.documentElement.style.setProperty('--glass', palette.glass);
  document.documentElement.style.setProperty('--glass-rgb', tupleToString(hexToRgb(palette.glass)));
  document.documentElement.style.setProperty('--glass-border', palette.glassBorder);
  document.documentElement.style.setProperty('--glass-glow', palette.glassGlow);
  document.documentElement.style.setProperty('--glass-accent-glow', palette.glassAccentGlow);

}