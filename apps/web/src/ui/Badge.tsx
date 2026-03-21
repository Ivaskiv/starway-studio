// fix style $100k — premium badges using glass lighting and glow accents
import { forwardRef, HTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/utils';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
}

const variantConfig: Record<Required<BadgeProps>['variant'], { text: string; border: string; glow?: boolean }> = {
  default: { text: 'text-[var(--text-primary)]', border: 'border-[var(--glass-border)]' },
  success: { text: 'text-[var(--accent)]', border: 'border-[var(--accent)]', glow: true },
  warning: { text: 'text-[var(--accent)]', border: 'border-[var(--accent)]', glow: true },
  error: { text: 'text-[var(--accent)]', border: 'border-[var(--accent)]', glow: true },
  info: { text: 'text-[var(--text-primary)]', border: 'border-[var(--glass-border)]' },
};

const sizeClasses: Record<Required<BadgeProps>['size'], string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
  lg: 'px-4 py-1.5 text-base',
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ children, variant = 'default', size = 'md', pulse = false, className, ...props }, ref) => {
    const config = variantConfig[variant];

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1 rounded-full font-semibold border transition-all duration-200 uppercase tracking-widest bg-[var(--glass-bg)] shadow-[0_18px_40px_rgba(0,0,0,0.3)] glass-noise',
          config.text,
          config.border,
          sizeClasses[size],
          pulse && 'animate-pulse',
          config.glow && 'glow-soft',
          className,
        )}
        {...props}
      >
        {children}
      </span>
    );
  },
);

Badge.displayName = 'Badge';
