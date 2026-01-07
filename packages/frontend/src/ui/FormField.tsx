// /Users/viravira/Documents/starway-studio/packages/frontend/src/ui/FormField.tsx
// packages/shared/src/components/ui/FormField.tsx
import Input, { InputProps } from './Input';
import type { LucideIcon } from 'lucide-react';


interface FormFieldProps extends InputProps {
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
}

export const FormField = ({ icon: Icon, iconPosition = 'left', className, ...props }: FormFieldProps) => (
  <div className="relative">
    {Icon && iconPosition === 'left' && <Icon className="absolute left-3 top-11 text-text-muted z-10" size={20} />}
    <Input
      className={`${Icon ? (iconPosition === 'left' ? 'pl-11' : 'pr-11') : ''} ${className || ''}`}
      {...props}
    />
    {Icon && iconPosition === 'right' && <Icon className="absolute right-3 top-11 text-text-muted z-10" size={20} />}
  </div>
)

FormField.displayName = 'FormField';