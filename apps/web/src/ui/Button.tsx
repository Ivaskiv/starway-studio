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
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-base gap-2',
  lg: 'h-12 px-6 text-lg gap-2.5',
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
    solid: 'bg-[var(--accent)] text-[var(--text-primary)] border border-[color:var(--accent)] shadow-lg transition hover:bg-[var(--accent-hover)]/90',
    outline: 'border border-[color:var(--accent)] text-[var(--accent)] bg-transparent transition hover:bg-[var(--accent-hover)]/10',
    ghost: 'text-[var(--accent)] bg-transparent hover:bg-[var(--accent-soft)]/20 transition',
    glass: 'glass-button border-[var(--border-accent)] text-[var(--accent)] bg-[var(--glass-bg)]',
  },
  muted: {
    solid: 'bg-[var(--background)] text-[var(--text-primary)] border border-[color:var(--border)] shadow transition duration-200 hover:bg-[rgba(var(--background-rgb),0.8)]',
    outline: 'border border-[color:var(--border)] text-[var(--text-muted)] bg-transparent transition duration-200 hover:bg-[color:rgba(var(--text-rgb),0.08)]',
    ghost: 'text-[var(--text-muted)] bg-transparent transition duration-200 hover:bg-[color:rgba(var(--text-rgb),0.06)]',
    glass: 'glass-button border-[var(--border-primary)] text-[var(--text-muted)] bg-[var(--glass-bg)]',
  },
  white: {
    solid: 'bg-[var(--glass-bg)] text-[var(--text-primary)] border border-[color:var(--glass-border)] shadow-sm transition duration-200 hover:bg-[color:rgba(var(--text-rgb),0.08)]',
    outline: 'border border-[color:var(--border)] text-[var(--text-muted)] bg-transparent transition duration-200 hover:bg-[color:rgba(var(--text-rgb),0.08)]',
    ghost: 'text-[var(--text-primary)] bg-transparent transition duration-200 hover:bg-[color:rgba(var(--text-rgb),0.1)]',
    glass: 'glass-button border-[var(--border-accent)] text-[var(--text-primary)]',
  },
  success: {
    solid: 'bg-[color:rgba(16,185,129,0.9)] text-[var(--text-primary)] border border-[color:rgba(16,185,129,0.8)] shadow-[0_12px_30px_rgba(16,185,129,0.25)] transition hover:bg-[color:rgba(16,185,129,0.95)]',
    outline: 'border border-[color:rgba(16,185,129,0.4)] text-[color:rgba(16,185,129,0.9)] bg-transparent transition hover:bg-[color:rgba(16,185,129,0.15)]',
    ghost: 'text-[color:rgba(16,185,129,0.9)] bg-transparent hover:bg-[color:rgba(16,185,129,0.15)] transition',
    glass: 'glass-button border-[var(--border-accent)] text-[color:rgba(16,185,129,0.95)]',
  },
  error: {
    solid: 'bg-[color:rgba(239,68,68,0.9)] text-[var(--text-primary)] border border-[color:rgba(239,68,68,0.85)] shadow-[0_12px_30px_rgba(239,68,68,0.3)] transition hover:bg-[color:rgba(239,68,68,0.95)]',
    outline: 'border border-[color:rgba(239,68,68,0.4)] text-[color:rgba(239,68,68,0.9)] bg-transparent transition hover:bg-[color:rgba(239,68,68,0.15)]',
    ghost: 'text-[color:rgba(239,68,68,0.9)] bg-transparent hover:bg-[color:rgba(239,68,68,0.15)] transition',
    glass: 'glass-button border-[var(--border-accent)] text-[color:rgba(239,68,68,0.95)]',
  },
  warning: {
    solid: 'bg-[color:rgba(245,158,11,0.95)] text-[var(--text-primary)] border border-[color:rgba(245,158,11,0.75)] shadow-[0_12px_30px_rgba(245,158,11,0.3)] transition hover:bg-[color:rgba(245,158,11,0.98)]',
    outline: 'border border-[color:rgba(245,158,11,0.4)] text-[color:rgba(245,158,11,0.9)] bg-transparent transition hover:bg-[color:rgba(245,158,11,0.15)]',
    ghost: 'text-[color:rgba(245,158,11,0.9)] bg-transparent hover:bg-[color:rgba(245,158,11,0.15)] transition',
    glass: 'glass-button border-[var(--border-accent)] text-[color:rgba(245,158,11,0.95)]',
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
