// frontend/src/ui/ComponentsSuite.tsx
// fix style $100k
import Button from '@/ui/Button';
import { AlertCircle, Check, Info, X, CheckCircle } from 'lucide-react';
import { forwardRef, HTMLAttributes, ReactNode, useState } from 'react';
import { cn } from '../lib/utils';

// ===========================
// THEME COLORS MAPPING
// ===========================
const themeColors = {
  accent: { bg: 'var(--accent-bg)', text: 'var(--accent)', border: 'var(--accent-border)' },
  success: { bg: 'var(--success-bg)', text: 'var(--success)', border: 'var(--success-border)' },
  warning: { bg: 'var(--warning-bg)', text: 'var(--warning)', border: 'var(--warning-border)' },
  error: { bg: 'var(--error-bg)', text: 'var(--error)', border: 'var(--error-border)' },
  info: { bg: 'var(--info-bg)', text: 'var(--info)', border: 'var(--info-border)' },
  default: { bg: 'var(--glass-bg)', text: 'var(--text-primary)', border: 'var(--glass-border)' },
};

// ===========================
// BADGE
// ===========================
interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  variant?: keyof typeof themeColors;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ children, variant = 'default', size = 'md', pulse = false, className, ...props }, ref) => {
    const sizes = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-3 py-1 text-sm',
      lg: 'px-4 py-1.5 text-base',
    };
    const color = themeColors[variant];

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1 rounded-full font-medium border transition-all liquid-glass',
          `bg-[${color.bg}] text-[${color.text}] border-[${color.border}]`,
          sizes[size],
          pulse && 'animate-pulse',
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

// ===========================
// ALERT
// ===========================
interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: keyof typeof themeColors;
  closable?: boolean;
  onClose?: () => void;
}

const alertIcons: Record<keyof typeof themeColors, ReactNode> = {
  accent: <Info className="w-5 h-5" />,
  success: <Check className="w-5 h-5" />,
  warning: <AlertCircle className="w-5 h-5" />,
  error: <AlertCircle className="w-5 h-5" />,
  info: <Info className="w-5 h-5" />,
  default: <Info className="w-5 h-5" />,
};

export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  ({ children, variant = 'default', closable = false, onClose, className, ...props }, ref) => {
    const [visible, setVisible] = useState(true);
    const handleClose = () => { setVisible(false); setTimeout(() => onClose?.(), 300); };
    if (!visible) return null;

    const color = themeColors[variant];
    const icon = alertIcons[variant];

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-start gap-3 p-4 rounded-xl border transition-all duration-300 liquid-glass glow-accent',
          `bg-[${color.bg}] border-[${color.border}] text-[${color.text}]`,
          visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
          className
        )}
        {...props}
      >
        {icon}
        <div className="flex-1">{children}</div>
        {closable && (
          <Button onClick={handleClose} className="p-1 rounded-lg hover:bg-[var(--glass-hover)] transition-colors">
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    );
  }
);

Alert.displayName = 'Alert';

// ===========================
// SKELETON
// ===========================
interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  width?: string;
  height?: string;
  circle?: boolean;
}

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ width, height, circle = false, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('animate-pulse liquid-glass', circle ? 'rounded-full' : 'rounded-lg', className)}
      {...props}
    />
  )
);

Skeleton.displayName = 'Skeleton';

// ===========================
// DIVIDER
// ===========================
interface DividerProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
  label?: string;
}

export const Divider = forwardRef<HTMLDivElement, DividerProps>(
  ({ orientation = 'horizontal', label, className, ...props }, ref) => {
    if (orientation === 'vertical') {
      return <div ref={ref} className={cn('w-px h-full border-[var(--glass-border)]', className)} {...props} />;
    }
    if (label) {
      return (
        <div ref={ref} className={cn('relative flex items-center', className)} {...props}>
          <div className="flex-1 border-t border-[var(--glass-border)]" />
          <span className="px-3 text-sm text-[var(--text-muted)]">{label}</span>
          <div className="flex-1 border-t border-[var(--glass-border)]" />
        </div>
      );
    }
    return <div ref={ref} className={cn('w-full border-t border-[var(--glass-border)]', className)} {...props} />;
  }
);

Divider.displayName = 'Divider';

// ===========================
// SPINNER
// ===========================
interface SpinnerProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
}

export const Spinner = forwardRef<HTMLDivElement, SpinnerProps>(
  ({ size = 'md', className, ...props }, ref) => {
    const sizes = { sm: 'w-4 h-4 border-2', md: 'w-8 h-8 border-3', lg: 'w-12 h-12 border-4' };
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-full animate-spin border-t-transparent liquid-glass',
          sizes[size],
          'border-[var(--accent)] border-[var(--glass-border)]',
          className
        )}
        {...props}
      />
    );
  }
);

Spinner.displayName = 'Spinner';

// ===========================
// TOOLTIP
// ===========================
interface TooltipProps {
  children: ReactNode;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function Tooltip({ children, content, position = 'top' }: TooltipProps) {
  const [show, setShow] = useState(false);
  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };
  return (
    <div className="relative inline-block" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div
          className={cn(
            'absolute z-50 px-3 py-2 text-sm rounded-lg shadow-lg transition-opacity duration-200 liquid-glass glow-accent',
            positions[position],
            show ? 'opacity-100' : 'opacity-0'
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
}

// ===========================
// PROGRESS
// ===========================
interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  color?: keyof typeof themeColors;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  ({ value, max = 100, color = 'accent', size = 'md', showLabel = false, className, ...props }, ref) => {
    const percentage = Math.min((value / max) * 100, 100);
    const sizes = { sm: 'h-1', md: 'h-2', lg: 'h-3' };
    const c = themeColors[color];

    return (
      <div ref={ref} {...props}>
        <div className={cn(`w-full rounded-full overflow-hidden liquid-glass ${sizes[size]}`, className)}>
          <div className={`h-full rounded-full transition-all duration-500 bg-[${c.bg}] w-[${percentage}%]`} />
        </div>
        {showLabel && <div className="mt-1 text-xs text-[var(--text-muted)] text-right">{Math.round(percentage)}%</div>}
      </div>
    );
  }
);

Progress.displayName = 'Progress';
