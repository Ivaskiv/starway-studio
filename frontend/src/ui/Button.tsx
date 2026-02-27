// frontend/src/ui/Button.tsx
import { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type Size = 'sm' | 'md' | 'lg';
type Variant = 'solid' | 'outline' | 'ghost' | 'glass';
type Color = 'accent' | 'muted' | 'white' | 'orange' | 'purple' | 'green' | 'blue' | 'red' | 'gray';

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
  active?: boolean;
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
  accent: {
    solid:
      'text-[var(--text)] border border-transparent bg-[color:var(--accent)] shadow-[0_20px_35px_rgba(var(--accent-rgb),0.35)] hover:shadow-[0_30px_45px_rgba(var(--accent-rgb),0.45)]',
    outline: 'border border-[color:var(--accent)] text-[var(--accent)] bg-[color:rgba(var(--accent-rgb),0.08)]',
    ghost: 'text-[var(--accent)] bg-transparent hover:bg-[color:rgba(var(--accent-rgb),0.12)]',
    glass:
      'bg-[color:var(--glass)] text-[var(--accent)] border border-[color:var(--glass-border)] backdrop-blur-2xl shadow-[0_10px_40px_rgba(var(--glass-accent-glow),0.25)]',
  },
  muted: {
    solid: 'bg-[color:var(--bg-soft)] text-[var(--text)] border border-transparent shadow-[0_15px_30px_rgba(0,0,0,0.25)]',
    outline: 'border border-[color:var(--text)] text-[var(--text)] bg-transparent',
    ghost: 'text-[var(--text-secondary)] bg-transparent hover:bg-[color:rgba(var(--text-rgb),0.08)]',
    glass:
      'bg-[color:var(--glass)] text-[var(--text-secondary)] border border-[color:rgba(var(--text-rgb),0.2)] backdrop-blur-2xl shadow-[0_6px_25px_rgba(var(--glass-rgb),0.25)]',
  },
  white: {
    solid: 'bg-white text-gray-900 shadow-[0_15px_40px_rgba(255,255,255,0.15)]',
    outline: 'border border-white text-white bg-transparent',
    ghost: 'text-white bg-transparent hover:bg-white/10',
    glass:
      'bg-white/10 text-white border border-white/20 backdrop-blur-2xl shadow-[0_10px_30px_rgba(255,255,255,0.15)]',
  },
};

const aliasMap: Record<string, Color> = {
  orange: 'accent',
  purple: 'accent',
  green: 'muted',
  blue: 'muted',
  red: 'muted',
  gray: 'muted',
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
      active = false,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const resolvedColor = colors[color] ? color : (aliasMap[color] as Color) || 'accent';
    const activeClasses =
      active && variant === 'solid'
        ? 'border-[color:rgba(var(--accent-rgb),0.55)] bg-[color:rgba(var(--accent-rgb),0.22)] text-white shadow-[0_20px_35px_rgba(var(--accent-rgb),0.32)] hover:bg-[color:rgba(var(--accent-rgb),0.32)]'
        : '';

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[color:rgba(var(--accent-rgb),0.5)]',
          sizes[size],
          colors[resolvedColor][variant],
          fullWidth && 'w-full',
          (disabled || loading) && 'opacity-60 cursor-not-allowed',
          animate && 'hover:scale-105 active:scale-95',
          pulse && 'animate-pulse',
          activeClasses,
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
