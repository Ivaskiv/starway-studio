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
        'relative rounded-2xl border p-5 shadow-xl shadow-black/10',
        'bg-white/5 border-white/10',
        blurMap[blur],
        hover && 'transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:-translate-y-0.5',
        glow && 'before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-r before:from-orange-500/20 before:via-purple-500/20 before:to-orange-500/20 before:blur-xl before:-z-10 before:opacity-50',
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