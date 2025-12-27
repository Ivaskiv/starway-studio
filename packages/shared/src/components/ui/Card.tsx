// packages/shared/src/components/ui/Card.tsx

import { cn } from '../../utils/cn';
import { forwardRef } from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  glow?: boolean;
  glass?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, hover, glow, glass = true, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          // Base
          'rounded-2xl border border-border transition-all duration-300',
          
          // Glass effect
          glass && 'bg-bg-secondary/40 backdrop-blur-glass',
          !glass && 'bg-bg-secondary',
          
          // Hover
          hover && 'hover:border-primary hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1',
          
          // Glow
          glow && 'shadow-2xl shadow-primary/20 animate-glow-pulse',
          
          // Shine effect on hover
          'relative overflow-hidden',
          'before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/5 before:to-transparent',
          'before:-translate-x-full before:transition-transform before:duration-700',
          hover && 'hover:before:translate-x-full',
          
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export const CardHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pb-4', className)} {...props} />
  )
);

CardHeader.displayName = 'CardHeader';

export const CardContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  )
);

CardContent.displayName = 'CardContent';

export const CardFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-4 border-t border-border', className)} {...props} />
  )
);

CardFooter.displayName = 'CardFooter';