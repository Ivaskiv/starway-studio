// fix style $100k — premium password field leveraging glass inputs
import { cn } from '@/lib/utils';
import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export interface PasswordFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  showToggle?: boolean;
}

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(({ label, error, helperText, showToggle = true, disabled, ...props }, ref) => {
  const [visible, setVisible] = useState(false);
  const fieldType = visible ? 'text' : 'password';

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className={cn('text-sm font-semibold', error ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]')}>
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={ref}
          type={fieldType}
          disabled={disabled}
          className={cn(
            'glass-field w-full rounded-[16px] border border-[var(--border-primary)] bg-[var(--glass-bg)] text-[var(--text-field)] placeholder:text-[var(--text-field-placeholder)] px-3 py-2 shadow-[0_10px_30px_rgba(var(--accent-rgb),0.25)] transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[color:rgba(var(--accent-rgb),0.25)]',
            error && 'border-[var(--accent)]',
            disabled && 'opacity-60 cursor-not-allowed'
          )}
          {...props}
        />
        {showToggle && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
          >
            {visible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        )}
      </div>
      {(error || helperText) && (
        <p className={cn('text-xs', error ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]')}>
          {error || helperText}
        </p>
      )}
    </div>
  );
});

PasswordField.displayName = 'PasswordField';
