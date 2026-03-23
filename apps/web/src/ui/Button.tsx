// fix style k — premium glass buttons aligned with the liquid-glass system
// ==========================
// frontend/src/ui/Button.tsx
// ==========================

import { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// 🔹 Типи
type Size = 'sm' | 'md' | 'lg';
type Variant = 'solid' | 'outline' | 'ghost' | 'glass';
type Color = 'accent' | 'muted' | 'white' | 'success' | 'error' | 'warning';

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

// 🔹 Розміри кнопок
const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2.5',
};

// 🔹 Розміри іконок
const iconSizes: Record<Size, string> = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

// 🔹 Кольори тепер лише з ThemeProvider CSS-токенів
// 🔹 Видалені всі старі color maps та inline градієнти
const colors: Record<Color, Record<Variant, string>> = {
  accent: {
    solid: 'ios-button',
    outline: 'ios-button-secondary border-[hsl(var(--accent-h)_82%_60%_/_0.22)] text-[var(--accent)]',
    ghost: 'ios-button-ghost text-[var(--accent)]',
    glass: 'ios-button-secondary text-[var(--accent)]',
  },
  muted: {
    solid: 'ios-button-secondary',
    outline: 'ios-button-secondary text-[var(--text-secondary)]',
    ghost: 'ios-button-ghost text-[var(--text-muted)]',
    glass: 'ios-button-secondary text-[var(--text-secondary)]',
  },
  white: {
    solid: 'ios-button-secondary text-[var(--text-primary)]',
    outline: 'ios-button-secondary text-[var(--text-primary)]',
    ghost: 'ios-button-ghost text-[var(--text-primary)]',
    glass: 'ios-button-secondary text-[var(--text-primary)]',
  },
  success: {
    solid: 'ios-button bg-[linear-gradient(180deg,rgba(16,185,129,0.34),rgba(16,185,129,0.18))]',
    outline: 'ios-button-secondary border-[rgba(16,185,129,0.22)] text-[rgba(110,231,183,0.95)]',
    ghost: 'ios-button-ghost text-[rgba(110,231,183,0.95)]',
    glass: 'ios-button-secondary text-[rgba(110,231,183,0.95)]',
  },
  error: {
    solid: 'ios-button bg-[linear-gradient(180deg,rgba(239,68,68,0.34),rgba(239,68,68,0.18))]',
    outline: 'ios-button-secondary border-[rgba(239,68,68,0.22)] text-[rgba(252,165,165,0.95)]',
    ghost: 'ios-button-ghost text-[rgba(252,165,165,0.95)]',
    glass: 'ios-button-secondary text-[rgba(252,165,165,0.95)]',
  },
  warning: {
    solid: 'ios-button bg-[linear-gradient(180deg,rgba(245,158,11,0.34),rgba(245,158,11,0.18))]',
    outline: 'ios-button-secondary border-[rgba(245,158,11,0.22)] text-[rgba(253,224,71,0.95)]',
    ghost: 'ios-button-ghost text-[rgba(253,224,71,0.95)]',
    glass: 'ios-button-secondary text-[rgba(253,224,71,0.95)]',
  },
};

// 🔹 Компонент
export const Button = forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
  const {
    children,
    variant = 'solid',
    color = 'accent',
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
    ...rest
  } = props;

  const resolvedColor = colors[color] ? color : 'accent';

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
        'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[999px] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[color:rgba(var(--accent-rgb),0.24)] focus:ring-offset-0',
        sizes[size],
        colors[resolvedColor][variant],
        fullWidth && 'w-full',
        (disabled || loading) && 'opacity-60 cursor-not-allowed',
        animate && 'hover:scale-[1.02] active:scale-[0.985]',
        pulse && 'animate-pulse',
        activeClasses,
        className
      )}
      {...rest}
    >
      {loading && <Loader2 className={cn(iconSizes[size], 'animate-spin')} />}
      {!loading && LeftIcon && <LeftIcon className={cn(iconSizes[size], 'shrink-0')} />}
      <span className="inline-block whitespace-nowrap">{loading && loadingText ? loadingText : children}</span>
      {!loading && RightIcon && <RightIcon className={cn(iconSizes[size], 'shrink-0')} />}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
