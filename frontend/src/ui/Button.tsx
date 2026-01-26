import { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2, LucideIcon } from 'lucide-react'
import { cn } from '../lib/utils'

type Size = 'sm' | 'md' | 'lg'
type Variant = 'solid' | 'outline' | 'ghost' | 'glass'
type Color = 'orange' | 'purple' | 'white' | 'gray' | 'green' | 'blue' | 'red'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: Variant
  color?: Color
  size?: Size
  isLoading?: boolean
  loadingText?: string
  leftIcon?: LucideIcon
  rightIcon?: LucideIcon
  fullWidth?: boolean
  animate?: boolean
  pulse?: boolean
}

const sizes: Record<Size, string> = { 
  sm: 'h-8 px-3 text-sm gap-1.5', 
  md: 'h-10 px-4 text-sm gap-2', 
  lg: 'h-12 px-6 text-base gap-2.5' 
}

const iconSizes: Record<Size, string> = { 
  sm: 'w-3.5 h-3.5', 
  md: 'w-4 h-4', 
  lg: 'w-5 h-5' 
}

const colors: Record<Color, Record<Variant, string>> = {
  orange: {
    solid: 'bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40',
    outline: 'border-2 border-orange-500 text-orange-500 hover:bg-orange-500/10',
    ghost: 'text-orange-500 hover:bg-orange-500/10',
    glass: 'bg-orange-500/10 backdrop-blur-md border border-orange-500/20 text-orange-400 hover:bg-orange-500/20',
  },
  purple: {
    solid: 'bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40',
    outline: 'border-2 border-purple-500 text-purple-500 hover:bg-purple-500/10',
    ghost: 'text-purple-500 hover:bg-purple-500/10',
    glass: 'bg-purple-500/10 backdrop-blur-md border border-purple-500/20 text-purple-400 hover:bg-purple-500/20',
  },
  green: {
    solid: 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 shadow-lg shadow-green-500/25 hover:shadow-green-500/40',
    outline: 'border-2 border-green-500 text-green-500 hover:bg-green-500/10',
    ghost: 'text-green-500 hover:bg-green-500/10',
    glass: 'bg-green-500/10 backdrop-blur-md border border-green-500/20 text-green-400 hover:bg-green-500/20',
  },
  blue: {
    solid: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40',
    outline: 'border-2 border-blue-500 text-blue-500 hover:bg-blue-500/10',
    ghost: 'text-blue-500 hover:bg-blue-500/10',
    glass: 'bg-blue-500/10 backdrop-blur-md border border-blue-500/20 text-blue-400 hover:bg-blue-500/20',
  },
  red: {
    solid: 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-lg shadow-red-500/25 hover:shadow-red-500/40',
    outline: 'border-2 border-red-500 text-red-500 hover:bg-red-500/10',
    ghost: 'text-red-500 hover:bg-red-500/10',
    glass: 'bg-red-500/10 backdrop-blur-md border border-red-500/20 text-red-400 hover:bg-red-500/20',
  },
  white: {
    solid: 'bg-white text-gray-900 hover:bg-gray-100',
    outline: 'border-2 border-white text-white hover:bg-white/10',
    ghost: 'text-white hover:bg-white/10',
    glass: 'bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20',
  },
  gray: {
    solid: 'bg-gray-600 text-white hover:bg-gray-700',
    outline: 'border-2 border-gray-500 text-gray-400 hover:bg-gray-500/10',
    ghost: 'text-gray-400 hover:bg-gray-500/10',
    glass: 'bg-gray-500/10 backdrop-blur-md border border-gray-500/20 text-gray-400 hover:bg-gray-500/20',
  },
}

export const Button = forwardRef<HTMLButtonElement, Props>(
  (
    {
      children,
      variant = 'solid',
      color = 'orange',
      size = 'md',
      isLoading,
      loadingText,
      leftIcon: Left,
      rightIcon: Right,
      fullWidth,
      disabled,
      className,
      animate = false,
      pulse = false,
      type = 'button',
      ...props
    },
    ref
  ) => (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isLoading}
      className={cn(
        'inline-flex items-center justify-center gap-2 whitespace-nowrap',
        'rounded-xl',
        'transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-orange-500/50',
        'whitespace-nowrap',
        sizes[size],
        colors[color][variant],
        fullWidth && 'w-full',
        (disabled || isLoading) && 'opacity-50 cursor-not-allowed',
        animate && 'hover:scale-105 active:scale-95',
        pulse && 'animate-pulse',
        className
      )}
      {...props}
    >
      {isLoading && <Loader2 className={cn(iconSizes[size], 'animate-spin')} />}
      {!isLoading && Left && <Left className={iconSizes[size]} />}
      <span>{isLoading && loadingText ? loadingText : children}</span>
      {!isLoading && Right && <Right className={iconSizes[size]} />}
    </button>
  )
)

Button.displayName = 'Button'
export default Button
