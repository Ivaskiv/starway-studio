// fix style $100k — premium alert surfaces using the new glass system
import { forwardRef, HTMLAttributes, ReactNode, useState } from 'react';
import { AlertCircle, Check, CheckCircle, Info, X } from 'lucide-react';
import Button from '@/ui/Button';
import { cn } from '../lib/utils';

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'info';
  closable?: boolean;
  onClose?: () => void;
}

const variantConfig: Record<Required<Pick<AlertProps, 'variant'>>['variant'], { text: string; icon: ReactNode }> = {
  success: {
    text: 'text-[var(--accent)]',
    icon: <Check className="w-5 h-5 text-[var(--accent)]" />,
  },
  warning: {
    text: 'text-[var(--accent)]',
    icon: <AlertCircle className="w-5 h-5 text-[var(--accent)]" />,
  },
  error: {
    text: 'text-[var(--accent)]',
    icon: <AlertCircle className="w-5 h-5 text-[var(--accent)]" />,
  },
  info: {
    text: 'text-[var(--text-primary)]',
    icon: <Info className="w-5 h-5 text-[var(--accent)]" />,
  },
};

export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  ({ children, variant = 'info', closable = false, onClose, className, ...props }, ref) => {
    const [visible, setVisible] = useState(true);

    const handleClose = () => {
      setVisible(false);
      setTimeout(() => onClose?.(), 300);
    };

    if (!visible) return null;

    const config = variantConfig[variant];

    return (
      <div
        ref={ref}
        className={cn(
          'liquid-glass surface glass-noise flex items-start gap-3 p-4 rounded-[18px] text-sm font-medium transition-all duration-300 shadow-[0_30px_60px_rgba(var(--accent-rgb),0.25)]',
          'border border-[var(--border-accent)]',
          visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
          config.text,
          className,
        )}
        {...props}
      >
        {config.icon}
        <div className="flex-1 leading-relaxed">{children}</div>
        {closable && (
          <Button
            onClick={handleClose}
            variant="ghost"
            size="sm"
            color="muted"
            className="p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    );
  },
);

Alert.displayName = 'Alert';

const baseMessageClasses = 'flex gap-3 p-4 rounded-[18px] border transition-all duration-300 liquid-glass surface glass-noise text-sm';

export function ErrorAlert({ message, className }: { message?: string; className?: string }) {
  if (!message) return null;
  return (
    <div
      className={cn(
        baseMessageClasses,
        'border-[var(--accent-error-border)] bg-[var(--accent-error-bg)] text-[var(--accent-error-text)]',
        className,
      )}
    >
      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-[var(--accent-error-icon)]" />
      <p className="leading-relaxed">{message}</p>
    </div>
  );
}

export function SuccessAlert({ message, className }: { message?: string; className?: string }) {
  if (!message) return null;
  return (
    <div
      className={cn(
        baseMessageClasses,
        'border-[var(--accent-success-border)] bg-[var(--accent-success-bg)] text-[var(--accent-success-text)]',
        className,
      )}
    >
      <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-[var(--accent-success-icon)]" />
      <p className="leading-relaxed">{message}</p>
    </div>
  );
}
