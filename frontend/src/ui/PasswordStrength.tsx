// /Users/viravira/Documents/starway-studio/frontend/src/ui/PasswordStrength.tsx
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
  { label: '', color: 'text-white/40', bar: 'bg-white/10' },
  { label: 'Слабкий', color: 'text-red-400', bar: 'bg-red-500' },
  { label: 'Середній', color: 'text-amber-400', bar: 'bg-amber-500' },
  { label: 'Хороший', color: 'text-emerald-400', bar: 'bg-emerald-500' },
  { label: 'Відмінний', color: 'text-emerald-400', bar: 'bg-emerald-500' },
];

export function PasswordStrength({ password }: { password: string }) {
  const { strength, checked } = useMemo(() => {
    const passed = REQS.filter((r) => r.test(password)).length;
    return { strength: !password ? 0 : passed <= 1 ? 1 : passed <= 2 ? 2 : passed <= 3 ? 3 : 4, checked: REQS.map((r) => ({ ...r, ok: r.test(password) })) };
  }, [password]);

  if (!password) return null;
  const lvl = LEVELS[strength];

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs"><span className="text-white/50">Надійність</span><span className={lvl.color}>{lvl.label}</span></div>
        <div className="flex gap-1">{[1,2,3,4].map((l) => <div key={l} className={cn('h-1.5 flex-1 rounded-full transition-all', l <= strength ? lvl.bar : 'bg-white/10')} />)}</div>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {checked.map((r, i) => (
          <div key={i} className={cn('flex items-center gap-1.5 text-xs', r.ok ? 'text-emerald-400' : 'text-white/40')}>
            {r.ok ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}<span>{r.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}