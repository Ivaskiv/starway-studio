// fix style $100k — premium theme selector with glass swatches
import { forwardRef } from 'react';
import { Button } from './Button';
import { cn } from '../lib/utils';

export type UserTheme = 'blue' | 'emerald' | 'rose' | 'amber' | 'violet';

interface ThemeSelectorProps {
  value: UserTheme;
  onChange: (theme: UserTheme) => void;
}

const colors: Record<UserTheme, { label: string; gradient: string }> = {
  blue: { label: 'Blue', gradient: 'linear-gradient(135deg, rgba(59,130,246,0.8), rgba(148,196,255,0.5))' },
  emerald: { label: 'Emerald', gradient: 'linear-gradient(135deg, rgba(16,185,129,0.8), rgba(110,231,183,0.5))' },
  rose: { label: 'Rose', gradient: 'linear-gradient(135deg, rgba(244,63,94,0.8), rgba(251,113,133,0.5))' },
  amber: { label: 'Amber', gradient: 'linear-gradient(135deg, rgba(251,191,36,0.8), rgba(253,224,71,0.5))' },
  violet: { label: 'Violet', gradient: 'linear-gradient(135deg, rgba(168,85,247,0.8), rgba(196,181,253,0.5))' },
};

export const ThemeSelector = forwardRef<HTMLDivElement, ThemeSelectorProps>(({ value, onChange }, ref) => (
  <div ref={ref} className="flex flex-wrap gap-4">
    {(Object.keys(colors) as UserTheme[]).map((theme) => (
      <Button
        key={theme}
        onClick={() => onChange(theme)}
        variant="ghost"
        color={value === theme ? 'accent' : 'white'}
        className={cn(
          'glass-button flex flex-col items-center gap-3 rounded-[18px] border-[var(--border-accent)] shadow-[0_25px_60px_rgba(var(--accent-rgb),0.25)]',
          value === theme ? 'scale-105' : 'opacity-90'
        )}
      >
        <div
          className="w-16 h-16 rounded-[16px] border border-[var(--glass-border)] shadow-[inset_0_0_25px_rgba(0,0,0,0.35)]"
          style={{ background: colors[theme].gradient }}
        />
        <span className="text-sm font-semibold text-[var(--text-primary)]">{colors[theme].label}</span>
      </Button>
    ))}
  </div>
));

ThemeSelector.displayName = 'ThemeSelector';
