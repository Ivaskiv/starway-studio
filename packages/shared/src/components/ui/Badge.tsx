// packages/shared/src/components/ui/Badge.tsx

import { forwardRef } from 'react';
import { cn } from '../../utils/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg';
}

export const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          // Base
          'inline-flex items-center justify-center font-medium transition-all duration-300',
          
          // Variants
          variant === 'primary' && [
            'bg-primary/10 text-primary border border-primary/20',
          ],
          
          variant === 'secondary' && [
            'bg-bg-tertiary/40 text-text-secondary border border-border',
          ],
          
          variant === 'success' && [
            'bg-success/10 text-success border border-success/20',
          ],
          
          variant === 'warning' && [
            'bg-warning/10 text-warning border border-warning/20',
          ],
          
          variant === 'danger' && [
            'bg-danger/10 text-danger border border-danger/20',
          ],
          
          variant === 'info' && [
            'bg-accent/10 text-accent border border-accent/20',
          ],
          
          // Sizes
          size === 'sm' && 'px-2 py-0.5 text-xs rounded-md',
          size === 'md' && 'px-3 py-1 text-sm rounded-lg',
          size === 'lg' && 'px-4 py-1.5 text-base rounded-xl',
          
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Badge.displayName = 'Badge';