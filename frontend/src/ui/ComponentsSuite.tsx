// /ui/components-suite.tsx
// Повний набір готових UI компонентів з Tailwind анімаціями

import Button from '@/ui/Button';
import { AlertCircle, Check, Info, X } from 'lucide-react';
import { forwardRef, HTMLAttributes, ReactNode, useState } from 'react';
import { cn } from '../lib/utils';

// ===========================
// BADGE - Значки
// ===========================
interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ children, variant = 'default', size = 'md', pulse = false, className, ...props }, ref) => {
    const variants = {
      default: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
      success: 'bg-green-500/20 text-green-400 border-green-500/30',
      warning: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      error: 'bg-red-500/20 text-red-400 border-red-500/30',
      info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    };

    const sizes = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-3 py-1 text-sm',
      lg: 'px-4 py-1.5 text-base',
    };

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1 rounded-full font-medium border transition-all',
          variants[variant],
          sizes[size],
          pulse && 'animate-pulse',
          className,
        )}
        {...props}
      >
        {children}
      </span>
    );
  },
);

Badge.displayName = 'Badge';

// ===========================
// ALERT - Сповіщення
// ===========================
interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'info';
  closable?: boolean;
  onClose?: () => void;
}

export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  ({ children, variant = 'info', closable = false, onClose, className, ...props }, ref) => {
    const [visible, setVisible] = useState(true);

    const handleClose = () => {
      setVisible(false);
      setTimeout(() => onClose?.(), 300);
    };

    if (!visible) return null;

    const variants = {
      success: {
        bg: 'bg-green-500/10 border-green-500/30',
        icon: <Check className="w-5 h-5 text-green-400" />,
        text: 'text-green-400',
      },
      warning: {
        bg: 'bg-amber-500/10 border-amber-500/30',
        icon: <AlertCircle className="w-5 h-5 text-amber-400" />,
        text: 'text-amber-400',
      },
      error: {
        bg: 'bg-red-500/10 border-red-500/30',
        icon: <AlertCircle className="w-5 h-5 text-red-400" />,
        text: 'text-red-400',
      },
      info: {
        bg: 'bg-blue-500/10 border-blue-500/30',
        icon: <Info className="w-5 h-5 text-blue-400" />,
        text: 'text-blue-400',
      },
    };

    const config = variants[variant];

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-start gap-3 p-4 rounded-xl border transition-all duration-300',
          config.bg,
          visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
          className,
        )}
        {...props}
      >
        {config.icon}
        <div className={cn('flex-1', config.text)}>{children}</div>
        {closable && (
          <Button
            onClick={handleClose}
            className="p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    );
  },
);

Alert.displayName = 'Alert';

// ===========================
// SKELETON - Placeholder
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
      className={cn('bg-white/10 animate-pulse', circle ? 'rounded-full' : 'rounded-lg', className)}
      style={{ width, height }}
      {...props}
    />
  ),
);

Skeleton.displayName = 'Skeleton';

// ===========================
// DIVIDER - Роздільник
// ===========================
interface DividerProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
  label?: string;
}

export const Divider = forwardRef<HTMLDivElement, DividerProps>(
  ({ orientation = 'horizontal', label, className, ...props }, ref) => {
    if (orientation === 'vertical') {
      return <div ref={ref} className={cn('w-px h-full bg-white/10', className)} {...props} />;
    }

    if (label) {
      return (
        <div ref={ref} className={cn('relative flex items-center', className)} {...props}>
          <div className="flex-1 border-t border-white/10" />
          <span className="px-3 text-sm text-white/40">{label}</span>
          <div className="flex-1 border-t border-white/10" />
        </div>
      );
    }

    return (
      <div ref={ref} className={cn('w-full border-t border-white/10', className)} {...props} />
    );
  },
);

Divider.displayName = 'Divider';

// ===========================
// SPINNER - Завантаження
// ===========================
interface SpinnerProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
  color?: 'orange' | 'purple' | 'white' | 'green' | 'blue';
}

export const Spinner = forwardRef<HTMLDivElement, SpinnerProps>(
  ({ size = 'md', color = 'orange', className, ...props }, ref) => {
    const sizes = {
      sm: 'w-4 h-4 border-2',
      md: 'w-8 h-8 border-3',
      lg: 'w-12 h-12 border-4',
    };

    const colors = {
      orange: 'border-orange-500 border-t-transparent',
      purple: 'border-purple-500 border-t-transparent',
      white: 'border-white border-t-transparent',
      green: 'border-green-500 border-t-transparent',
      blue: 'border-blue-500 border-t-transparent',
    };

    return (
      <div
        ref={ref}
        className={cn('rounded-full animate-spin', sizes[size], colors[color], className)}
        {...props}
      />
    );
  },
);

Spinner.displayName = 'Spinner';

// ===========================
// TOOLTIP - Підказка
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
    <div
      className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div
          className={cn(
            'absolute z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg whitespace-nowrap transition-opacity duration-200',
            positions[position],
            show ? 'opacity-100' : 'opacity-0',
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
}

// ===========================
// PROGRESS BAR - Прогрес
// ===========================
interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  color?: 'orange' | 'purple' | 'green' | 'blue';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  (
    { value, max = 100, color = 'orange', size = 'md', showLabel = false, className, ...props },
    ref,
  ) => {
    const percentage = Math.min((value / max) * 100, 100);

    const sizes = {
      sm: 'h-1',
      md: 'h-2',
      lg: 'h-3',
    };

    const colors = {
      orange: 'bg-gradient-to-r from-orange-500 to-orange-600',
      purple: 'bg-gradient-to-r from-purple-500 to-purple-600',
      green: 'bg-gradient-to-r from-green-500 to-green-600',
      blue: 'bg-gradient-to-r from-blue-500 to-blue-600',
    };

    return (
      <div ref={ref} {...props}>
        <div
          className={cn('w-full bg-white/10 rounded-full overflow-hidden', sizes[size], className)}
        >
          <div
            className={cn('h-full rounded-full transition-all duration-500', colors[color])}
            style={{ width: `${percentage}%` }}
          />
        </div>
        {showLabel && (
          <div className="mt-1 text-xs text-white/60 text-right">{Math.round(percentage)}%</div>
        )}
      </div>
    );
  },
);

Progress.displayName = 'Progress';

/*
ВИКОРИСТАННЯ:

// Badge
<Badge variant="success" pulse>Active</Badge>

// Alert
<Alert variant="error" closable onClose={() => {}}>
  Something went wrong!
</Alert>

// Skeleton
<Skeleton width="100%" height="20px" />

// Divider
<Divider label="OR" />

// Spinner
<Spinner size="lg" color="purple" />

// Tooltip
<Tooltip content="Click to copy" position="top">
  <button>Hover me</button>
</Tooltip>

// Progress
<Progress value={75} max={100} color="green" showLabel />
*/
