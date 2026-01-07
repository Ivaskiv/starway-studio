// packages/frontend/src/ui/ThemeSelector.tsx
import Button from "./Button";

export type UserTheme = 'blue' | 'emerald' | 'rose' | 'amber' | 'violet';

export interface ThemeSelectorProps {
  value: UserTheme;
  onChange: (theme: UserTheme) => void;
}

const THEMES: { value: UserTheme; label: string; colors: string[] }[] = [
  { value: 'blue', label: 'Blue', colors: ['#3b82f6', '#60a5fa'] },
  { value: 'emerald', label: 'Emerald', colors: ['#10b981', '#34d399'] },
  { value: 'rose', label: 'Rose', colors: ['#f43f5e', '#fb7185'] },
  { value: 'amber', label: 'Amber', colors: ['#f59e0b', '#fbbf24'] },
  { value: 'violet', label: 'Violet', colors: ['#a855f7', '#c084fc'] },
];

export function ThemeSelector({ value, onChange }: ThemeSelectorProps) {
  return (
    <div className="flex gap-4 flex-wrap">
      {THEMES.map(theme => (
        <Button
          key={theme.value}
          onClick={() => onChange(theme.value)}
          className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all ${
            value === theme.value 
              ? 'bg-white/20 ring-2 ring-white/50 scale-105' 
              : 'bg-white/5 hover:bg-white/10'
          }`}
        >
          <div 
            className="w-16 h-16 rounded-xl"
            style={{
              background: `linear-gradient(135deg, ${theme.colors[0]}, ${theme.colors[1]})`
            }}
          />
          <span className="text-sm font-semibold text-white">{theme.label}</span>
        </Button>
      ))}
    </div>
  );
}