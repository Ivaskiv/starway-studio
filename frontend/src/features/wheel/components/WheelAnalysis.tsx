import { GlassCard } from '@/ui';

// fix code_x: provide concrete export used by "@/features/wheel/index.ts" to avoid runtime blank page.
export function WheelAnalysis() {
  return (
    <GlassCard className="p-5">
      <p className="text-sm text-white/70">
        Аналітика колеса буде доступна після щонайменше однієї завершеної оцінки.
      </p>
    </GlassCard>
  );
}

export default WheelAnalysis;
