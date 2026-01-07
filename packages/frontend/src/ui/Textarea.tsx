// /Users/viravira/Documents/starway-studio/packages/frontend/src/ui/Textarea.tsx

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Textarea = ({ label, error, helperText, size = 'md', isLoading, className, ...props }: TextareaProps) => (
  <div className="w-full">
    {label && <label className="block text-sm font-medium text-slate-300 mb-2">{label}</label>}
    <textarea
      disabled={isLoading || props.disabled}
      data-size={size}
      className={`glass-field ${className || ''}`}
      {...props}
    />
    {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    {helperText && !error && <p className="mt-1 text-sm text-text-muted">{helperText}</p>}
  </div>
)

Textarea.displayName = 'Textarea';