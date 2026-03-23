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
  sm: 'backdrop-blur-[10px]',
  md: 'backdrop-blur-[14px]',
  lg: 'backdrop-blur-[18px]',
  xl: 'backdrop-blur-[24px]',
};

const variantClasses: Record<Variant, string> = {
  default: 'ios-glass',
  bordered: 'ios-glass ring-1 ring-white/10',
  gradient: 'ios-glass bg-[linear-gradient(160deg,hsl(0_0%_100%_/_0.14),hsl(var(--accent-h)_82%_60%_/_0.10)_38%,hsl(220_28%_10%_/_0.54)_100%)]',
  frosted: 'ios-glass-soft',
  accent: 'ios-glass border-[hsl(var(--accent-h)_82%_60%_/_0.22)] bg-[linear-gradient(180deg,hsl(var(--accent-h)_82%_60%_/_0.14),hsl(0_0%_100%_/_0.03))]',
  success: 'ios-glass border-[rgba(16,185,129,0.24)] bg-[linear-gradient(180deg,rgba(16,185,129,0.18),rgba(255,255,255,0.03))]',
  error: 'ios-glass border-[rgba(239,68,68,0.24)] bg-[linear-gradient(180deg,rgba(239,68,68,0.18),rgba(255,255,255,0.03))]',
  warning: 'ios-glass border-[rgba(245,158,11,0.24)] bg-[linear-gradient(180deg,rgba(245,158,11,0.18),rgba(255,255,255,0.03))]',
  muted: 'ios-glass-soft opacity-95',
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
        'surface glass-noise text-[var(--text-primary)] transition-all duration-300',
        blurMap[blur],
        variantClasses[variant],
        hover && 'hover:-translate-y-0.5 hover:shadow-[0_22px_52px_rgba(0,0,0,0.24),0_12px_30px_var(--glass-shadow)]',
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
      'mt-1 text-sm text-[var(--text-muted)]',
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
