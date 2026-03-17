import React, { useEffect, useRef } from 'react';

interface Props {
  value: number;
  onChange: (value: number) => void;
  color?: string;
}

export const ScoreSlider = React.memo(({ value, onChange, color }: Props) => {
  const safeValue = Math.min(10, Math.max(1, value));
  const pct = ((safeValue - 1) / 9) * 100;
  const sliderColor = color ?? 'rgba(var(--accent-rgb),0.94)';
  const fillRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!fillRef.current) return
    fillRef.current.style.width = `${pct}%`
    fillRef.current.style.background = `linear-gradient(90deg, rgba(var(--accent-soft-rgb),0.88) 0%, ${sliderColor} 72%, rgba(var(--on-accent-rgb),0.9) 100%)`
    fillRef.current.style.boxShadow = '0 0 16px rgba(var(--accent-rgb),0.42)'
  }, [pct, sliderColor])

  useEffect(() => {
    if (!inputRef.current) return
    inputRef.current.style.setProperty('--thumb-color', sliderColor)
  }, [sliderColor])

  return (
    <div className="relative mt-2">
      <div className="pointer-events-none absolute inset-0 flex items-center">
        <div className="h-2.5 w-full rounded-full bg-white/10 border border-white/15 overflow-hidden">
          {/* fix code_x: custom fill layer removes native white track tail and keeps glassmorphism transparency. */}
        <div ref={fillRef} className="h-full rounded-full transition-[width] duration-300 ease-out relative">
          <span className="absolute inset-0 wheel-slider-shimmer" />
        </div>
      </div>
      </div>

      <input
        type="range"
        min={1}
        max={10}
        value={safeValue}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Оцінка сфери від 1 до 10"
        ref={inputRef}
        className="wheel-score-slider relative z-10 w-full cursor-pointer"
      />
    </div>
  );
});

ScoreSlider.displayName = 'ScoreSlider';
