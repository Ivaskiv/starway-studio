// frontend/src/ui/Button.tsx
import { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type Size = 'sm' | 'md' | 'lg';
type Variant = 'solid' | 'outline' | 'ghost' | 'glass';
type Color = 'orange' | 'purple' | 'white' | 'gray' | 'green' | 'blue' | 'red';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: Variant;
  color?: Color;
  size?: Size;
  loading?: boolean;               
  loadingText?: string;
  leftIcon?: LucideIcon;
  rightIcon?: LucideIcon;
  fullWidth?: boolean;
  animate?: boolean;
  pulse?: boolean;
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-base gap-2',
  lg: 'h-12 px-6 text-lg gap-2.5',
};

const iconSizes: Record<Size, string> = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

const colors: Record<Color, Record<Variant, string>> = {
  orange: {
    // fix code_x: main "orange" palette now follows user-selected accent tokens globally.
    solid: 'text-white border border-transparent bg-[image:var(--accent-gradient)] hover:brightness-110 shadow-lg',
    outline: 'border-2 border-[color:rgba(var(--accent-rgb),0.6)] text-[var(--color-accent)] hover:bg-[color:rgba(var(--accent-rgb),0.1)]',
    ghost: 'text-[var(--color-accent)] hover:bg-[color:rgba(var(--accent-rgb),0.1)]',
    glass: 'bg-[color:rgba(var(--accent-rgb),0.12)] backdrop-blur-md border border-[color:rgba(var(--accent-rgb),0.35)] text-[var(--color-accent-soft)] hover:bg-[color:rgba(var(--accent-rgb),0.2)]',
  },
  purple: {
    // fix code_x: legacy "purple" buttons now follow selected accent to keep one coherent palette.
    solid: 'text-white border border-transparent bg-[image:var(--accent-gradient)] hover:brightness-110 shadow-lg',
    outline: 'border-2 border-[color:rgba(var(--accent-rgb),0.6)] text-[var(--color-accent)] hover:bg-[color:rgba(var(--accent-rgb),0.1)]',
    ghost: 'text-[var(--color-accent)] hover:bg-[color:rgba(var(--accent-rgb),0.1)]',
    glass: 'bg-[color:rgba(var(--accent-rgb),0.12)] backdrop-blur-md border border-[color:rgba(var(--accent-rgb),0.35)] text-[var(--color-accent-soft)] hover:bg-[color:rgba(var(--accent-rgb),0.2)]',
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
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'solid',
      color = 'orange',
      size = 'md',
      loading = false,
      loadingText = 'Завантаження...',
      leftIcon: LeftIcon,
      rightIcon: RightIcon,
      fullWidth = false,
      disabled,
      className,
      animate = false,
      pulse = false,
      type = 'button',
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[color:rgba(var(--accent-rgb),0.5)]',
          sizes[size],
          colors[color][variant],
          fullWidth && 'w-full',
          (disabled || loading) && 'opacity-60 cursor-not-allowed',
          animate && 'hover:scale-105 active:scale-95',
          pulse && 'animate-pulse',
          className
        )}
        {...props}
      >
        {loading && <Loader2 className={cn(iconSizes[size], 'animate-spin')} />}
        {!loading && LeftIcon && <LeftIcon className={cn(iconSizes[size], 'shrink-0')} />}
        <span className="inline-block whitespace-nowrap">{loading && loadingText ? loadingText : children}</span>
        {!loading && RightIcon && <RightIcon className={cn(iconSizes[size], 'shrink-0')} />}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
