// packages/shared/src/components/ui/PasswordField.tsx

import { forwardRef, useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { Input, InputProps } from './Input';

interface PasswordField extends Omit<InputProps, 'type'> {
  showToggle?: boolean;
}

export const PasswordField = forwardRef<HTMLInputElement, PasswordField>(
  ({ showToggle = true, className, disabled, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
      <div className="relative">
        <Lock className="absolute left-3 top-11 text-text-muted z-10" size={20} />
        <Input
          ref={ref}
          type={showPassword ? 'text' : 'password'}
          className={`pl-11 ${showToggle ? 'pr-11' : ''} ${className || ''}`}
          disabled={disabled}
          {...props}
        />
        {showToggle && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-11 text-text-muted hover:text-text-primary transition disabled:opacity-50"
            disabled={disabled}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        )}
      </div>
    );
  }
);

PasswordField.displayName = 'PasswordField';