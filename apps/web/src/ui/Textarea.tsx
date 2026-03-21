// fix style $100k — premium glass textarea using accent lighting
import { cn } from '../lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

const heights: Record<Required<TextareaProps>['size'], string> = {
  sm: 'min-h-[120px]',
  md: 'min-h-[150px]',
  lg: 'min-h-[200px]',
};

export const Textarea = ({ label, value, error, helperText, size = 'md', isLoading, className, ...props }: TextareaProps) => {
  const disabled = isLoading || props.disabled;

  return (
    <div className="w-full space-y-1">
      {label && <label className="text-sm font-semibold text-[var(--text-primary)]">{label}</label>}
      <textarea
        disabled={disabled}
        value={value}
        className={cn(
          'glass-field w-full rounded-[16px] border border-[var(--border-primary)] bg-[var(--glass-bg)] px-3 py-3 text-[var(--text-primary)] leading-relaxed shadow-[0_12px_30px_rgba(var(--accent-rgb),0.2)] transition duration-200',
          heights[size],
          error && 'border-[var(--accent)] focus:border-[var(--accent)] focus:ring-[var(--accent)]',
          disabled && 'opacity-60 cursor-not-allowed',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-[var(--accent)]">{error}</p>}
      {helperText && !error && <p className="text-xs text-[var(--text-muted)]">{helperText}</p>}
    </div>
  );
};

Textarea.displayName = 'Textarea';
