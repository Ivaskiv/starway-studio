// frontend/src/components/LoadingFallback.tsx
import { Loader } from 'lucide-react';
import { GlassCard } from '@/ui';

export default function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <GlassCard className="p-10 flex flex-col items-center gap-4">
        <Loader className="w-10 h-10 animate-spin text-orange-500" />
        <p className="text-white/60">Завантаження…</p>
      </GlassCard>
    </div>
  );
}
