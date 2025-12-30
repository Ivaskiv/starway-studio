// packages/shared/src/ui/ThemeSelector.tsx

import { GlassCard } from './GlassCard';
import { Check } from 'lucide-react';
import { cn } from '../utils/cn';
import { Button } from './Button';

type ThemeType = 'nadya' | 'emerald' | 'rose' | 'amber' | 'violet';

interface ThemeSelectorProps {
  currentTheme: ThemeType;
  onThemeChange: (theme: ThemeType) => void;
}

const themes: Array<{ id: ThemeType; name: string; color: string }> = [
  { id: 'nadya', name: 'Синя', color: 'bg-blue-500' },
  { id: 'emerald', name: 'Зелена', color: 'bg-emerald-500' },
  { id: 'rose', name: 'Рожева', color: 'bg-rose-500' },
  { id: 'amber', name: 'Золота', color: 'bg-amber-500' },
  { id: 'violet', name: 'Фіолетова', color: 'bg-purple-500' },
];

export const ThemeSelector = ({ currentTheme, onThemeChange }: ThemeSelectorProps) => {
  return (
    <GlassCard className="p-6">
      <h3 className="text-lg font-semibold text-text-primary mb-4">
        Колірна схема
      </h3>
      <div className="grid grid-cols-5 gap-3">
        {themes.map((t) => (
          <Button
            key={t.id}
            onClick={() => onThemeChange(t.id)}
            className={cn(
              'relative aspect-square rounded-2xl transition-all duration-300',
              t.color,
              currentTheme === t.id ? 'ring-4 ring-white/50 scale-110' : 'hover:scale-105'
            )}
          >
            {currentTheme === t.id && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Check className="w-6 h-6 text-white" />
              </div>
            )}
            <span className="sr-only">{t.name}</span>
          </Button>
        ))}
      </div>
      <div className="mt-3 text-center">
        <p className="text-sm text-text-muted">
          {themes.find(t => t.id === currentTheme)?.name}
        </p>
      </div>
    </GlassCard>
  );
};