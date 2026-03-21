// fix style $100k — premium progress bars with gradient fills
import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  label?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const heights: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'h-2 rounded-full',
  md: 'h-3 rounded-full',
  lg: 'h-4 rounded-full',
};

export const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  ({ value, label, showLabel = false, size = 'md', className, ...props }, ref) => {
    const clampedValue = Math.min(100, Math.max(0, value));

    return (
      <div className={cn('w-full space-y-1', className)} ref={ref} {...props}>
        {(showLabel || label) && (
          <div className="flex justify-between text-xs font-semibold text-[var(--text-muted)]">
            <span>{label || 'Progress'}</span>
            <span>{Math.round(clampedValue)}%</span>
          </div>
        )}
        <div className={cn('bg-[var(--glass-border)]/40 rounded-full overflow-hidden', heights[size])}>
          <div
            className="h-full bg-gradient-to-r from-[var(--accent-soft)] to-[var(--accent)] transition-all duration-300"
            style={{ width: `${clampedValue}%` }}
          />
        </div>
      </div>
    );
  }
);

Progress.displayName = 'Progress';
export default Progress;
