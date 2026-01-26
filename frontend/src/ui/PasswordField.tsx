// /Users/viravira/Documents/starway-studio/frontend/src/ui/PasswordField.tsx
import { forwardRef, useState } from 'react';

export interface PasswordFieldProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  color?: 'green' | 'olive' | 'red' | 'yellow' | 'orange';
  label?: string;
  helperText?: string;
  error?: string;
  showToggle?: boolean;}

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  ({ color = 'orange', size = 'md', disabled, label, error, ...props }, ref) => {
    const [visible, setVisible] = useState(false);

    return (
      <div className="flex flex-col w-full relative">
        {label && (
          <label className={`mb-1 ${error ? 'text-red-500' : 'text-white/80'}`}>
            {label}
          </label>
        )}

        <input
          ref={ref}
          type={visible ? 'text' : 'password'}
          data-color={color}
          data-size={size}
          disabled={disabled}
          className={`glass-field password ${disabled ? 'disabled' : ''} ${
            error ? 'error' : ''
          }`}
          data-error={!!error}
          {...props}
        />

        <button
          type="button"
          onClick={() => setVisible(v => !v)}
          className="password-toggle"
        >
          {visible ? '🙈' : '👁'}
        </button>

        {error && <span className="text-red-500 text-sm mt-1">{error}</span>}
      </div>
    );
  }
);

PasswordField.displayName = 'PasswordField';
