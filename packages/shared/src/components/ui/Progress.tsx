// packages/shared/src/components/ui/Progress.tsx

import { forwardRef } from 'react';
import { cn } from '../../utils/cn';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0-100
  variant?: 'primary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  ({ 
    className, 
    value, 
    variant = 'primary', 
    size = 'md', 
    showLabel = false,
    ...props 
  }, ref) => {
    const clampedValue = Math.min(100, Math.max(0, value));
    
    return (
      <div ref={ref} className={cn('w-full', className)} {...props}>
        {showLabel && (
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-secondary font-medium">Прогрес</span>
            <span className="text-sm text-text-primary font-bold">{Math.round(clampedValue)}%</span>
          </div>
        )}
        
        <div
          className={cn(
            'w-full bg-bg-tertiary/40 rounded-full overflow-hidden',
            
            // Sizes
            size === 'sm' && 'h-1.5',
            size === 'md' && 'h-2.5',
            size === 'lg' && 'h-4',
          )}
        >
          <div
            className={cn(
              'h-full transition-all duration-500 ease-out rounded-full',
              
              // Variants
              variant === 'primary' && [
                'bg-gradient-to-r from-primary to-accent',
                'shadow-lg shadow-primary/30',
              ],
              
              variant === 'success' && [
                'bg-gradient-to-r from-success to-green-500',
                'shadow-lg shadow-success/30',
              ],
              
              variant === 'warning' && [
                'bg-gradient-to-r from-warning to-orange-500',
                'shadow-lg shadow-warning/30',
              ],
              
              variant === 'danger' && [
                'bg-gradient-to-r from-danger to-red-600',
                'shadow-lg shadow-danger/30',
              ],
            )}
            style={{ width: `${clampedValue}%` }}
          />
        </div>
      </div>
    );
  }
);

Progress.displayName = 'Progress';