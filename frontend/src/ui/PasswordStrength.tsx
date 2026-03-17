// fix style $100k — glassy password strength indicator
import { useMemo } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '../lib/utils';

const REQS = [
  { label: 'Мін. 8 символів', test: (p: string) => p.length >= 8 },
  { label: 'Мала літера', test: (p: string) => /[a-z]/.test(p) },
  { label: 'Велика літера', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Цифра', test: (p: string) => /[0-9]/.test(p) },
];

const LEVELS = [
  { label: '', color: 'text-[var(--text-muted)]', bar: 'bg-[var(--glass-border)]' },
  { label: 'Слабкий', color: 'text-[var(--accent)]', bar: 'bg-[var(--accent)]/60' },
  { label: 'Середній', color: 'text-[var(--accent)]', bar: 'bg-[var(--accent)]/70' },
  { label: 'Хороший', color: 'text-[var(--accent)]', bar: 'bg-[var(--accent)]/80' },
  { label: 'Відмінний', color: 'text-[var(--accent)]', bar: 'bg-[var(--accent)]' },
];

export function PasswordStrength({ password }: { password: string }) {
  const { strength, checked } = useMemo(() => {
    const passed = REQS.filter((r) => r.test(password)).length;
    return {
      strength: !password ? 0 : passed <= 1 ? 1 : passed <= 2 ? 2 : passed <= 3 ? 3 : 4,
      checked: REQS.map((r) => ({ ...r, ok: r.test(password) })),
    };
  }, [password]);

  if (!password) return null;
  const lvl = LEVELS[strength];

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-semibold text-[var(--text-muted)]">
          <span>Надійність</span>
          <span className={lvl.color}>{lvl.label}</span>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4].map((l) => (
            <div
              key={l}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-all',
                l <= strength ? lvl.bar : 'bg-[var(--glass-border)]'
              )}
            />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {checked.map((r, i) => (
          <div
            key={i}
            className={cn('flex items-center gap-1.5 text-xs font-medium', r.ok ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]')}
          >
            {r.ok ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
            <span>{r.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
