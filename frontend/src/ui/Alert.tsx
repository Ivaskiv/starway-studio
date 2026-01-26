import { AlertCircle, Check, CheckCircle, Info, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { forwardRef, HTMLAttributes, ReactNode, useState } from 'react';
import Button from '@/ui/Button';

const variants = {
  error: { box: 'bg-red-500/10 border-red-500/20 text-red-300', icon: 'text-red-400' },
  success: { box: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300', icon: 'text-emerald-400' },
};

// ===========================
// ALERT - Сповіщення
// ===========================
interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  variant?: 'success' | 'warning' | 'error' | 'info'
  closable?: boolean
  onClose?: () => void
}

export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  ({ children, variant = 'info', closable = false, onClose, className, ...props }, ref) => {
    const [visible, setVisible] = useState(true)

    const handleClose = () => {
      setVisible(false)
      setTimeout(() => onClose?.(), 300)
    }

    if (!visible) return null

    const variants = {
      success: {
        bg: 'bg-green-500/10 border-green-500/30',
        icon: <Check className="w-5 h-5 text-green-400" />,
        text: 'text-green-400'
      },
      warning: {
        bg: 'bg-amber-500/10 border-amber-500/30',
        icon: <AlertCircle className="w-5 h-5 text-amber-400" />,
        text: 'text-amber-400'
      },
      error: {
        bg: 'bg-red-500/10 border-red-500/30',
        icon: <AlertCircle className="w-5 h-5 text-red-400" />,
        text: 'text-red-400'
      },
      info: {
        bg: 'bg-blue-500/10 border-blue-500/30',
        icon: <Info className="w-5 h-5 text-blue-400" />,
        text: 'text-blue-400'
      }
    }

    const config = variants[variant]

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-start gap-3 p-4 rounded-xl border transition-all duration-300',
          config.bg,
          visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
          className
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
    )
  }
)

Alert.displayName = 'Alert'

export function ErrorAlert({ message, className }: { message?: string; className?: string }) {
  if (!message) return null;
  return (
    <div className={cn('flex gap-3 p-4 rounded-xl border backdrop-blur-sm animate-in fade-in', variants.error.box, className)}>
      <AlertCircle className={cn('w-5 h-5 flex-shrink-0 mt-0.5', variants.error.icon)} />
      <p className="text-sm">{message}</p>
    </div>
  );
}

export function SuccessAlert({ message, className }: { message?: string; className?: string }) {
  if (!message) return null;
  return (
    <div className={cn('flex gap-3 p-4 rounded-xl border backdrop-blur-sm animate-in fade-in', variants.success.box, className)}>
      <CheckCircle className={cn('w-5 h-5 flex-shrink-0 mt-0.5', variants.success.icon)} />
      <p className="text-sm">{message}</p>
    </div>
  );
}