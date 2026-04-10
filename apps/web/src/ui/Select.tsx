// fix style $100k — premium select using glass surfaces and accent outlines
import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  options?: SelectOption[];
  label?: string;
  error?: string;
  size?: 'sm' | 'md' | 'lg';
}

const heights = {
  sm: 'h-9',
  md: 'h-11',
  lg: 'h-12',
} as const;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ options, size = 'md', disabled, label, className, error, ...props }, ref) => (
  <div className={cn('w-full space-y-2', className)}>
    {label && <label className="text-sm font-semibold text-[var(--text-muted)]">{label}</label>}
    <select
      ref={ref}
      disabled={disabled}
      className={cn(
        'glass-field w-full rounded-[16px] border border-[var(--border-primary)] bg-[var(--glass-bg)] px-3 py-2 text-[var(--text-field)] shadow-[0_10px_30px_rgba(var(--accent-rgb),0.2)] transition duration-200',
        heights[size],
        error ? 'border-[var(--accent)]' : '',
        disabled && 'opacity-60 cursor-not-allowed',
      )}
      {...props}
    >
      {options?.map((option) => (
        <option key={option.value} value={option.value} className="bg-[var(--glass-bg)] text-[var(--text-field)]">
          {option.label}
        </option>
      ))}
    </select>
    {error && <p className="text-xs text-[var(--accent)]">{error}</p>}
  </div>
));

Select.displayName = 'Select';
export default Select;
