// fix style $100k — premium glass wrapper combining Card + GlassCard from ui
import { forwardRef, HTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/utils';

type Blur = 'sm' | 'md' | 'lg' | 'xl';
export type Variant =
  | 'default'
  | 'bordered'
  | 'gradient'
  | 'frosted'
  | 'accent'
  | 'success'
  | 'error'
  | 'warning'
  | 'muted';

const blurMap: Record<Blur, string> = {
  sm: 'backdrop-blur-sm',
  md: 'backdrop-blur-md',
  lg: 'backdrop-blur-lg',
  xl: 'backdrop-blur-xl',
};

const variantClasses: Record<Variant, string> = {
  default: 'border border-[var(--border-accent)] bg-[var(--glass-bg)]/80',
  bordered: 'border-2 border-[var(--border-accent)] bg-[var(--glass-bg)]/90 shadow-[0_30px_60px_rgba(var(--accent-rgb),0.25)]',
  gradient:
    'border border-[var(--border-accent)] bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(var(--accent-soft-rgb),0.15),rgba(var(--accent-rgb),0.08))]',
  frosted: 'border border-[var(--border-accent)] bg-[var(--glass-bg)]/70',
  accent:
    'border border-[var(--border-accent)] bg-[linear-gradient(180deg,rgba(var(--accent-soft-rgb),0.28),rgba(var(--accent-rgb),0.12))] text-[var(--accent)] shadow-[inset_0_0_0_1px_rgba(var(--accent-rgb),0.25),0_20px_45px_rgba(var(--accent-rgb),0.2)]',
  success:
    'border border-[color:rgba(16,185,129,0.45)] bg-[color:rgba(16,185,129,0.12)] text-[var(--text-primary)] shadow-[0_30px_60px_rgba(16,185,129,0.18)]',
  error:
    'border border-[color:rgba(239,68,68,0.5)] bg-[color:rgba(220,38,38,0.12)] text-[var(--text-primary)] shadow-[0_30px_60px_rgba(239,68,68,0.2)]',
  warning:
    'border border-[color:rgba(251,191,36,0.55)] bg-[color:rgba(245,158,11,0.12)] text-[var(--text-primary)] shadow-[0_30px_60px_rgba(245,158,11,0.22)]',
  muted:
    'border border-[color:rgba(var(--text-rgb),0.3)] bg-[rgba(var(--bg-card-rgb),0.45)] text-[var(--text-muted)] shadow-[0_20px_60px_rgba(var(--text-rgb),0.2)]',
};

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  blur?: Blur;
  variant?: Variant;
  hover?: boolean;
  glow?: boolean;
  animate?: boolean;
  clickable?: boolean;
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({
    children,
    blur = 'md',
    variant = 'default',
    hover = true,
    glow = false,
    animate = false,
    clickable = false,
    className,
    ...props
  }, ref) => (
    <div
      ref={ref}
      className={cn(
        'liquid-glass surface glass-noise shadow-[0_35px_80px_rgba(var(--accent-rgb),0.22)] text-[var(--text-primary)] transition-all duration-300',
        blurMap[blur],
        variantClasses[variant],
        hover && 'hover:-translate-y-0.5 hover:shadow-[0_0_40px_rgba(var(--accent-rgb),0.25)]',
        glow && 'glow-accent',
        animate && 'animate-in fade-in duration-500',
        clickable && 'cursor-pointer active:scale-[0.98]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);

GlassCard.displayName = 'GlassCard';

export const GlassCardHeader = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn('mb-4 text-[var(--text-primary)]', className)}>{children}</div>
);

export const GlassCardTitle = ({ children, className }: { children: ReactNode; className?: string }) => (
  <h2 className={cn('text-xl font-bold text-[var(--text-primary)]', className)}>{children}</h2>
);

export const GlassCardDescription = ({ children, className }: { children: ReactNode; className?: string }) => (
  <p
    className={cn(
      'w-full rounded-xl glass-field bg-[var(--glass-bg)] border border-[var(--glass-border)] text-sm text-[var(--text-muted)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[color:rgba(var(--accent-rgb),0.25)] mt-1',
      className
    )}
  >
    {children}
  </p>
);

export const GlassCardContent = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn('text-[var(--text-muted)]', className)}>{children}</div>
);

export const GlassCardFooter = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn('mt-4 pt-4 border-t border-[var(--glass-border)] text-[var(--text-primary)]', className)}>{children}</div>
);

export const CardHeader = GlassCardHeader;
export const CardTitle = GlassCardTitle;
export const CardContent = GlassCardContent;
export const CardFooter = GlassCardFooter;

export default GlassCard;
