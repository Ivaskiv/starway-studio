interface GenerationCounterProps {
  used: number;
  max: number;
}

export const GenerationCounter = ({ used, max }: GenerationCounterProps) => {
  const ratio = Math.min(100, Math.max(0, (used / max) * 100));

  return (
    <div className="space-y-2 rounded-xl border border-[color:rgba(var(--glass-border-rgb),0.24)] bg-[color:rgba(var(--ambient-rgb-2),0.34)] p-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-white/70">Генерації</span>
        <span className="font-semibold text-white">
          {used}/{max}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-[image:var(--accent-gradient)] transition-[width] duration-500 ease-out"
          style={{ width: `${ratio}%` }}
        />
      </div>
    </div>
  );
};
