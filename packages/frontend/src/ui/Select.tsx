// /Users/viravira/Documents/starway-studio/packages/frontend/src/ui/Select.tsx
import { forwardRef } from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  options: SelectOption[];
  label?: string;
  color?: 'green' | 'olive' | 'red' | 'yellow' | 'orange';
  size?: 'sm' | 'md' | 'lg';
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ options, color = 'orange', size = 'md', disabled, label, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && <label className="block text-sm font-medium mb-2">{label}</label>}
        <select
          ref={ref}
          disabled={disabled}
          data-color={color}
          data-size={size}
          className={`glass-field select ${disabled ? 'disabled' : ''} ${className || ''}`}
          {...props}
        >
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;