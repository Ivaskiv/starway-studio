// /Users/viravira/Documents/starway-studio/packages/frontend/src/ui/Input.tsx

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  rows?: number;
}

export const Input = ({ label, error, helperText, className, ...props }: InputProps) => (
  <div className="w-full">
    {label && <label className="block text-sm font-medium text-text-secondary mb-2">{label}</label>}
    <input
      data-error={!!error}
      className={`glass-field ${className || ''}`}
      {...props}
    />
    {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    {helperText && !error && <p className="mt-1 text-sm text-text-muted">{helperText}</p>}
  </div>
);

Input.displayName = 'Input';

export default Input;