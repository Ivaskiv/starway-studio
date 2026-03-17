// fix style $100k — premium loading fallback using liquid-glass overlay
import { Loader } from 'lucide-react';
import { GlassCard } from '@/ui';

export default function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
      <GlassCard className="glass-noise flex flex-col items-center gap-4 rounded-[22px] p-10 shadow-[0_35px_90px_rgba(var(--accent-rgb),0.3)]">
        <Loader className="w-10 h-10 animate-spin text-[var(--accent)]" />
        <p className="text-sm text-[var(--text-muted)]">Завантаження…</p>
      </GlassCard>
    </div>
  );
}
