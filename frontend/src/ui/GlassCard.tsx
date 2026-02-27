// /Users/viravira/Documents/starway-studio/frontend/src/ui/GlassCard.tsx
// frontend/src/ui/GlassCard.tsx
import { forwardRef, HTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/utils';

type Blur = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  blur?: Blur;
  hover?: boolean;
  glow?: boolean;
}

const blurMap: Record<Blur, string> = {
  sm: 'backdrop-blur-sm',
  md: 'backdrop-blur-md',
  lg: 'backdrop-blur-lg',
  xl: 'backdrop-blur-xl',
  '2xl': 'backdrop-blur-2xl',
};

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ children, blur = 'lg', hover, glow, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'relative rounded-2xl border p-5',
        'bg-[color:rgba(var(--ambient-rgb-2),0.36)] border-[color:rgba(var(--glass-border-rgb),0.24)]',
        'shadow-[0_16px_40px_rgba(0,0,0,0.32),0_6px_24px_rgba(var(--glass-shadow-rgb),0.18)]',
        blurMap[blur],
        hover && 'transition-all duration-300 hover:bg-[color:rgba(var(--ambient-rgb-2),0.46)] hover:border-[color:rgba(var(--glass-border-rgb),0.42)] hover:-translate-y-0.5',
        glow && 'before:absolute before:inset-0 before:rounded-2xl before:bg-[radial-gradient(circle_at_25%_20%,rgba(var(--accent-soft-rgb),0.26),transparent_62%)] before:blur-xl before:-z-10 before:opacity-80',
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
  <div className={cn('mb-4 pb-4 border-b border-white/10', className)}>{children}</div>
);

export const GlassCardTitle = ({ children, className }: { children: ReactNode; className?: string }) => (
  <h2 className={cn('text-xl md:text-2xl font-bold text-white', className)}>{children}</h2>
);

// Виправлено: приймає children
export const GlassCardDescription = ({ children, className }: { children: ReactNode; className?: string }) => (
  <p className={cn('text-sm text-white/60 mt-1', className)}>{children}</p>
);

export const GlassCardContent = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={className}>{children}</div>
);

export default GlassCard;
