import { cn } from '@/lib/utils';
import { forwardRef, InputHTMLAttributes, useEffect, useMemo, useRef, useState } from 'react';

interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: number;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  showValue?: boolean;
  onValueChange?: (value: number) => void;
  className?: string;
}

const thumbBase = {
  width: 20,
  height: 20,
};

export const Slider = forwardRef<HTMLInputElement, SliderProps>(
  (
    {
      value: controlledValue = 5,
      min = 1,
      max = 10,
      step = 1,
      label,
      showValue = true,
      onValueChange,
      className,
      ...props
    },
    ref
  ) => {
    const [localValue, setLocalValue] = useState(controlledValue);
    const value = controlledValue !== undefined ? controlledValue : localValue;

    useEffect(() => {
      setLocalValue(controlledValue);
    }, [controlledValue]);

    const percentage = useMemo(
      () => ((value - min) / (max - min)) * 100,
      [value, min, max],
    );

    const progressRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (progressRef.current) {
        progressRef.current.style.setProperty('--slider-progress', `${percentage}%`);
      }
    }, [percentage]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = Number(e.target.value);
      setLocalValue(newValue);
      onValueChange?.(newValue);
    };

    return (
      <div className={cn('w-full space-y-2', className)}>
        {label && <label className="text-sm font-semibold text-[var(--text-primary)]">{label}</label>}
        <div className="relative h-2">
          <div className="absolute inset-0 rounded-full bg-[var(--glass-bg)] border border-[var(--glass-border)]" />
          <div
            ref={progressRef}
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[var(--accent-soft)] to-[var(--accent)] slider-progress-bar"
          />
          <input
            ref={ref}
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={handleChange}
            className={cn(
              'relative w-full h-2 bg-transparent appearance-none cursor-pointer z-10',
              className
            )}
            {...props}
          />
        </div>
        {showValue && (
          <div className="flex justify-between text-xs text-[var(--text-muted)]">
            <span>{min}</span>
            <span className="font-semibold text-[var(--accent)]">{value}</span>
            <span>{max}</span>
          </div>
        )}
      </div>
    );
  }
);

Slider.displayName = 'Slider';
