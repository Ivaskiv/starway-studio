// frontend/src/ui/Card.tsx
import { forwardRef, HTMLAttributes, ReactNode } from 'react'
import { cn } from '../lib/utils'

type Blur = 'sm' | 'md' | 'lg' | 'xl'
type Variant = 'default' | 'bordered' | 'gradient' | 'frosted'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  blur?: Blur
  variant?: Variant
  hover?: boolean      // Додає hover:scale-102
  glow?: boolean       // Додає glow ефект
  animate?: boolean    // Fade in при монтуванні
  clickable?: boolean  // Курсор pointer + scale on click
}

const blurs: Record<Blur, string> = {
  sm: 'backdrop-blur-sm',
  md: 'backdrop-blur-md',
  lg: 'backdrop-blur-lg',
  xl: 'backdrop-blur-xl'
}

const variants: Record<Variant, string> = {
  default: 'bg-white/5 border border-white/10',
  bordered: 'bg-white/5 border-2 border-white/20',
  gradient: 'bg-gradient-to-br from-white/10 to-white/5 border border-white/10',
  frosted: 'bg-white/10 backdrop-blur-2xl border border-white/20'
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ 
    children, 
    blur = 'md',
    variant = 'default',
    hover = false,
    glow = false,
    animate = false,
    clickable = false,
    className,
    ...props 
  }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-2xl p-6 transition-all duration-300',
        blurs[blur],
        variants[variant],
        hover && 'hover:scale-[1.02] hover:shadow-lg',
        glow && 'shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30',
        animate && 'animate-in fade-in duration-500',
        clickable && 'cursor-pointer active:scale-[0.98]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
)

Card.displayName = 'Card'

// Card Header
interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('mb-4', className)}
      {...props}
    >
      {children}
    </div>
  )
)

CardHeader.displayName = 'CardHeader'

// Card Title
interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  children: ReactNode
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
}

export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ children, as: Component = 'h3', className, ...props }, ref) => (
    <Component
      ref={ref as any}
      className={cn('text-xl font-bold text-white', className)}
      {...props}
    >
      {children}
    </Component>
  )
)

CardTitle.displayName = 'CardTitle'

// Card Content
interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('text-white/80', className)}
      {...props}
    >
      {children}
    </div>
  )
)

CardContent.displayName = 'CardContent'

// Card Footer
interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('mt-4 pt-4 border-t border-white/10', className)}
      {...props}
    >
      {children}
    </div>
  )
)

CardFooter.displayName = 'CardFooter'

export default Card