// packages/shared/src/ui/GlassCard.tsx

import { forwardRef, ReactNode } from 'react';
import { cn } from '../utils/cn.js';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  blur?: 'sm' | 'md' | 'lg' | 'xl';
  gradient?: boolean;
  glow?: boolean;
  onClick?: () => void;
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ children, className, blur = 'md', gradient = false, glow = false, onClick }, ref) => {
    return (
      <div
        ref={ref}
        onClick={onClick}
        className={cn(
          'glass-card',
          blur === 'sm' && 'backdrop-blur-sm',
          blur === 'md' && 'backdrop-blur-md',
          blur === 'lg' && 'backdrop-blur-lg',
          blur === 'xl' && 'backdrop-blur-xl',
          gradient && 'bg-gradient-to-br from-white/10 to-white/5',
          glow && 'animate-glow-pulse',
          onClick && 'cursor-pointer active:scale-[0.98]',
          className
        )}
      >
        {children}
      </div>
    );
  }
);

GlassCard.displayName = 'GlassCard';