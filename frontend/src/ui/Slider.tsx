// /ui/Slider.tsx
import { cn } from '@/lib/utils';
import { forwardRef, InputHTMLAttributes, useEffect, useState } from 'react';

interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: number;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  showValue?: boolean;
  onValueChange?: (value: number) => void;
  trackColor?: string; // для кастомізації активної частини (наприклад, градієнт)
  className?: string;
}

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
      trackColor = 'from-orange-500 to-pink-500',
      className,
      ...props
    },
    ref,
  ) => {
    const [localValue, setLocalValue] = useState(controlledValue);
    const value = controlledValue !== undefined ? controlledValue : localValue;

    // Синхронізація з пропсом value, якщо він контрольований
    useEffect(() => {
      setLocalValue(controlledValue);
    }, [controlledValue]);

    const percentage = ((value - min) / (max - min)) * 100;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = Number(e.target.value);
      setLocalValue(newValue);
      onValueChange?.(newValue);
    };

    return (
      <div className={cn('w-full space-y-2', className)}>
        {/* Лейбл (опціонально) */}
        {label && <label className="block text-sm text-white/80 mb-1.5">{label}</label>}

        <div className="relative">
          {/* Трек (фон) */}
          <div
            className={cn(
              'absolute inset-0 h-2 rounded-full bg-white/10 backdrop-blur-sm',
              'border border-white/5',
            )}
          />

          {/* Активна частина треку (градієнт) */}
          <div
            className={cn(
              'absolute inset-y-0 left-0 h-2 rounded-full bg-gradient-to-r',
              trackColor,
            )}
            style={{ width: `${percentage}%` }}
          />

          {/* Сам range input – прозорий, але з thumb */}
          <input
            ref={ref}
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={handleChange}
            className={cn(
              // Скидаємо дефолтний вигляд
              'relative w-full h-2 bg-transparent appearance-none cursor-pointer z-10',
              // Кастомний thumb (кружечок)
              '[&::-webkit-slider-thumb]:appearance-none',
              '[&::-webkit-slider-thumb]:w-5',
              '[&::-webkit-slider-thumb]:h-5',
              '[&::-webkit-slider-thumb]:rounded-full',
              '[&::-webkit-slider-thumb]:bg-gradient-to-br',
              '[&::-webkit-slider-thumb]:from-orange-400',
              '[&::-webkit-slider-thumb]:to-pink-500',
              '[&::-webkit-slider-thumb]:border-2',
              '[&::-webkit-slider-thumb]:border-white/30',
              '[&::-webkit-slider-thumb]:shadow-lg',
              '[&::-webkit-slider-thumb]:shadow-orange-500/30',
              '[&::-webkit-slider-thumb]:cursor-pointer',
              '[&::-webkit-slider-thumb]:transition-all',
              '[&::-webkit-slider-thumb]:duration-200',
              '[&::-webkit-slider-thumb]:hover:scale-125',
              // Для Firefox
              '[&::-moz-range-thumb]:w-5',
              '[&::-moz-range-thumb]:h-5',
              '[&::-moz-range-thumb]:rounded-full',
              '[&::-moz-range-thumb]:bg-gradient-to-br',
              '[&::-moz-range-thumb]:from-orange-400',
              '[&::-moz-range-thumb]:to-pink-500',
              '[&::-moz-range-thumb]:border-2',
              '[&::-moz-range-thumb]:border-white/30',
              '[&::-moz-range-thumb]:shadow-lg',
              '[&::-moz-range-thumb]:shadow-orange-500/30',
              '[&::-moz-range-thumb]:cursor-pointer',
              className,
            )}
            {...props}
          />
        </div>

        {/* Значення (опціонально) */}
        {showValue && (
          <div className="flex justify-between text-xs text-white/60 px-1">
            <span>{min}</span>
            <span className="text-base font-semibold text-orange-400">{value}</span>
            <span>{max}</span>
          </div>
        )}
      </div>
    );
  },
);

Slider.displayName = 'Slider';
