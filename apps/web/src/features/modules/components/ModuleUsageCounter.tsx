// frontend/src/features/modules/components/ModuleUsageCounter.tsx
interface ModuleUsageCounterProps {
  label: string;
  used:  number;
  total: number;
}

export function ModuleUsageCounter({ label, used, total }: ModuleUsageCounterProps) {
  const ratio = total > 0 ? Math.min(100, Math.max(0, (used / total) * 100)) : 0;

  return (
    <div className="rounded-xl bg-[color:rgba(var(--ambient-rgb-2),0.28)] p-3">
      <div className="mb-2 flex items-center justify-between text-xs text-white/70">
        <span>{label}</span>
        <span className="text-white font-semibold">{used}/{total}</span>
      </div>
      <progress className="module-usage-progress h-2 w-full overflow-hidden rounded-full" value={ratio} max={100}>
        {ratio}%
      </progress>
    </div>
  );
}
