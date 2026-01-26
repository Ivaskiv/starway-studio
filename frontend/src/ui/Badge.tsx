// /Users/viravira/Documents/starway-studio/frontend/src/ui/Badge.tsx
import { forwardRef, HTMLAttributes, ReactNode } from 'react'
import { cn } from '../lib/utils'

// ===========================
// BADGE - Значки
// ===========================
interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  size?: 'sm' | 'md' | 'lg'
  pulse?: boolean
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ children, variant = 'default', size = 'md', pulse = false, className, ...props }, ref) => {
    const variants = {
      default: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
      success: 'bg-green-500/20 text-green-400 border-green-500/30',
      warning: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      error: 'bg-red-500/20 text-red-400 border-red-500/30',
      info: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    }

    const sizes = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-3 py-1 text-sm',
      lg: 'px-4 py-1.5 text-base'
    }

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1 rounded-full font-medium border transition-all',
          variants[variant],
          sizes[size],
          pulse && 'animate-pulse',
          className
        )}
        {...props}
      >
        {children}
      </span>
    )
  }
)

Badge.displayName = 'Badge'