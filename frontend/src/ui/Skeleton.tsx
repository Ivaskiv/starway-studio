// fix style $100k — liquid glass skeleton states
import { forwardRef, HTMLAttributes } from 'react';
import { cn } from '../lib/utils';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  width?: string;
  height?: string;
  circle?: boolean;
}

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(({ width, height, circle = false, className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'bg-[var(--glass-border)]/60 animate-pulse transition-all duration-500',
      circle ? 'rounded-full' : 'rounded-[16px]',
      'shadow-[0_15px_40px_rgba(var(--accent-rgb),0.18)]',
      className
    )}
    style={{ width, height }}
    {...props}
  />
));

Skeleton.displayName = 'Skeleton';
