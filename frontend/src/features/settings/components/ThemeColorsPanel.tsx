import { GlassCard, Input } from '@/ui';
import {
  colorToRgba,
  darkenColor,
  generateShades,
  getContrastColor,
  lightenColor,
} from '@/shared/utils/color.utils';
import { useEffect, useMemo, useState, useCallback } from 'react';

type ThemeMode = 'dark' | 'light';

interface PaletteItem {
  varName: string;
  label: string;
  description: string;
  hex: string;
  alpha?: number;
  editable?: boolean;
}

interface ThemeColorsPanelProps {
  accentColor: string;
  onAccentChange: (hex: string) => void;
  themeMode?: ThemeMode;
}

const baseBackgrounds: Record<ThemeMode, { bg: string; secondary: string }> = {
  dark: { bg: '#030712', secondary: '#0f172a' },
  light: { bg: '#f8fafc', secondary: '#e2e8f0' },
};

function buildPalette(accentColor: string, theme: ThemeMode): PaletteItem[] {
  const shades = generateShades(accentColor);

  const accentSoft = lightenColor(accentColor, 12);
  const accentStrong = darkenColor(accentColor, 18);
  const accentLight = lightenColor(accentColor, 28);
  const accentDark = darkenColor(accentColor, 28);

  const neutral = baseBackgrounds[theme];

  return [
    {
      varName: 'accent',
      label: 'accent',
      description: 'Основний акцент — CTA, активні кнопки, лінки.',
      hex: accentColor,
      editable: true,
    },
    {
      varName: 'accent-soft',
      label: 'accent-soft',
      description: 'Hover та soft glow для кнопок і стеків.',
      hex: accentSoft,
      editable: true,
    },
    {
      varName: 'accent-strong',
      label: 'accent-strong',
      description: 'Темний шейд акценту для paddings/gradients.',
      hex: accentStrong,
      editable: true,
    },
    {
      varName: 'accent-light',
      label: 'accent-light',
      description: 'Світліший акцент для фонових смуг.',
      hex: accentLight,
      editable: true,
    },
    {
      varName: 'accent-dark',
      label: 'accent-dark',
      description: 'Глибокий акцент для текстів на light-темі.',
      hex: accentDark,
      editable: true,
    },
    ...shades.map((shade) => ({
      varName: shade.name,
      label: shade.name,
      description: 'Містить градації accent для системних токенів.',
      hex: shade.hex,
      editable: true,
    })),
    {
      varName: 'bg',
      label: 'bg',
      description: 'Головний фон сторінки.',
      hex: neutral.bg,
    },
    {
      varName: 'bg-secondary',
      label: 'bg-secondary',
      description: 'Фон карток та морфізму.',
      hex: neutral.secondary,
    },
    {
      varName: 'glass-bg',
      label: 'glass-bg',
      description: 'Напівпрозорий glass шар (заливка).',
      hex: neutral.secondary,
      alpha: theme === 'dark' ? 0.55 : 0.8,
    },
    {
      varName: 'glass-border',
      label: 'glass-border',
      description: 'Границя glass-елементів.',
      hex: accentColor,
      alpha: 0.3,
    },
    {
      varName: 'glass-glow',
      label: 'glass-glow',
      description: 'Glow для карток/кнопок.',
      hex: lightenColor(accentColor, 40),
      alpha: 0.3,
    },
  ];
}

export function ThemeColorsPanel({ accentColor, onAccentChange, themeMode = 'dark' }: ThemeColorsPanelProps) {
  const [mode, setMode] = useState<ThemeMode>(themeMode);
  const palette = useMemo(() => buildPalette(accentColor, mode), [accentColor, mode]);
  const [colors, setColors] = useState<PaletteItem[]>(palette);

  useEffect(() => {
    setMode(themeMode);
  }, [themeMode]);

  useEffect(() => {
    setColors(palette);
  }, [palette]);

  useEffect(() => {
    colors.forEach((color) => {
      const cssValue = color.alpha ? colorToRgba(color.hex, color.alpha) : color.hex;
      document.documentElement.style.setProperty(`--${color.varName}`, cssValue);
    });
  }, [colors]);

  const handleChange = (index: number, hex: string) => {
    const next = [...colors];
    next[index] = { ...next[index], hex };
    setColors(next);
    if (next[index].varName === 'accent') {
      onAccentChange(hex);
    }
  };

  return (
    <GlassCard
      className="p-6 space-y-5 border border-white/10 bg-[color:var(--glass-bg)] backdrop-blur-3xl transition-all duration-400"
      style={{
        boxShadow: `0 20px 45px ${colorToRgba(accentColor, 0.25)}`,
        backgroundImage: `linear-gradient(135deg, var(--glass-bg), var(--bg-secondary))`,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-white">Тема та кольори Liquid Glass</h2>
          <p className="text-xs text-white/60">
            Оберіть акцент, побудуйте палітру і отримайте сразу нове оформлення.
          </p>
        </div>
        <div className="inline-flex rounded-full border border-white/15 bg-black/20 px-1 py-1 text-xs text-white/70">
          {(['dark', 'light'] as ThemeMode[]).map((theme) => (
            <button
              key={theme}
              type="button"
              onClick={() => setMode(theme)}
              className={`px-3 rounded-full transition-all duration-200 ${
                mode === theme ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'
              }`}
            >
              {theme === 'dark' ? 'Темна' : 'Світла'}
            </button>
          ))}
        </div>
      </div>

      <div className="theme-colors-grid">
        {colors.map((color, index) => {
          const cssValue = color.alpha ? colorToRgba(color.hex, color.alpha) : color.hex;
          const contrast = getContrastColor(color.hex);
          const gradient = `linear-gradient(135deg, ${cssValue}, ${colorToRgba(color.hex, 0.65)})`;
          const setCardVars = useCallback(
            (el: HTMLDivElement | null) => {
              if (!el) return;
              el.style.setProperty('--card-gradient', gradient);
              el.style.setProperty('--swatch-bg', cssValue);
              el.style.setProperty('--swatch-shadow', `0 10px 25px ${colorToRgba(color.hex, 0.4)}`);
              el.style.setProperty('--swatch-text', contrast);
            },
            [gradient, cssValue, contrast, color.hex],
          );
          return (
            <div ref={setCardVars} key={color.varName} className="theme-color-card">
              <div className="theme-color-swatch">
                <span className="theme-color-name">{color.varName}</span>
              </div>
              <div className="theme-color-body">
                <p className="text-sm font-semibold text-white">{color.label}</p>
                <p className="text-[11px] text-white/60">{color.description}</p>
              </div>
              <Input
                type="color"
                value={color.hex}
                onChange={(event) => handleChange(index, event.target.value)}
                className="theme-color-input"
              />
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
