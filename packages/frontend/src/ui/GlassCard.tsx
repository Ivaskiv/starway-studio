// /Users/viravira/Documents/starway-studio/packages/frontend/src/ui/GlassCard.tsx
import { forwardRef, ReactNode } from 'react';

 interface GlassCardProps
  extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  blur?: 'sm' | 'md' | 'lg' | 'xl';
  gradient?: boolean;
  glow?: boolean;
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  (
    {
      children,
      blur = 'md',
      gradient = false,
      glow = false,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        data-blur={blur}
        data-gradient={gradient || undefined}
        data-glow={glow || undefined}
        className="glass-card"
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassCard.displayName = 'GlassCard';

export default GlassCard;
