interface ModuleUsageCounterProps {
  label: string;
  used: number;
  total: number;
}

export function ModuleUsageCounter({ label, used, total }: ModuleUsageCounterProps) {
  const ratio = total > 0 ? Math.min(100, Math.max(0, (used / total) * 100)) : 0;

  return (
    <div className="rounded-xl border border-[color:rgba(var(--glass-border-rgb),0.22)] bg-[color:rgba(var(--ambient-rgb-2),0.28)] p-3">
      <div className="mb-2 flex items-center justify-between text-xs text-white/70">
        <span>{label}</span>
        <span className="text-white font-semibold">
          {used}/{total}
        </span>
      </div>
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full bg-[image:var(--accent-gradient)] transition-[width] duration-500 ease-out"
          style={{ width: `${ratio}%` }}
        />
      </div>
    </div>
  );
}
