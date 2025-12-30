// packages/shared/src/components/ui/FormField.tsx

import { forwardRef } from 'react';
import { Input, InputProps } from './Input';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../utils';

interface FormFieldProps extends InputProps {
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({ icon: Icon, iconPosition = 'left', className, ...props }, ref) => {
    return (
      <div className="relative">
        {Icon && iconPosition === 'left' && (
          <Icon className="absolute left-3 top-11 text-text-muted z-10" size={20} />
        )}
        <Input
          ref={ref}
          className={cn(
            Icon && iconPosition === 'left' && 'pl-11',
            Icon && iconPosition === 'right' && 'pr-11',
            className
          )}
          {...props}
        />
        {Icon && iconPosition === 'right' && (
          <Icon className="absolute right-3 top-11 text-text-muted z-10" size={20} />
        )}
      </div>
    );
  }
);

FormField.displayName = 'FormField';