// packages/frontend/src/ui/Progress.tsx
import { forwardRef } from 'react';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  color?: 'green' | 'olive' | 'red' | 'yellow' | 'orange' | 'purple' | 'blue';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  label?: string;
}

export const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  ({ value, color = 'orange', size = 'md', showLabel = false, label, className, ...props }, ref) => {
    // Clamp value between 0 and 100
    const clampedValue = Math.min(100, Math.max(0, value));

    return (
      <div className={`w-full ${className || ''}`} ref={ref} {...props}>
        {(showLabel || label) && (
          <div className="flex justify-between text-xs text-white/60 mb-1">
            <span>{label || 'Прогрес'}</span>
            <span>{Math.round(clampedValue)}%</span>
          </div>
        )}
        <div
          className="progress"
          data-color={color}
          data-size={size}
        >
          <div
            className="progress-bar"
            style={{ width: `${clampedValue}%` }}
          />
        </div>
      </div>
    );
  }
);

Progress.displayName = 'Progress';

export default Progress;