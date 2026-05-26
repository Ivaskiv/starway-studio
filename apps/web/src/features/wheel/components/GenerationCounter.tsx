import React, { useEffect, useRef } from 'react'

interface GenerationCounterProps {
  used: number;
  max: number;
}

export const GenerationCounter = ({ used, max }: GenerationCounterProps) => {
  const ratio = Math.min(100, Math.max(0, (used / max) * 100));
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!barRef.current) return
    barRef.current.style.width = `${ratio}%`
  }, [ratio])

  return (
    <div className="space-y-2 rounded-xl border border-[color:rgba(var(--glass-border-rgb),0.24)] bg-[color:rgba(var(--ambient-2-rgb),0.34)] p-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-white/70">Генерації</span>
        <span className="font-semibold text-white">
          {used}/{max}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          ref={barRef}
          className="h-full rounded-full bg-[image:var(--accent-gradient)] transition-[width] duration-500 ease-out"
        />
      </div>
    </div>
  );
};
