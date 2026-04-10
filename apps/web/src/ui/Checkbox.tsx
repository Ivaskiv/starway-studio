import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { Label } from './Label';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({ label, className, ...props }) => {
  const isChecked = Boolean(props.checked);

  return (
    <Label className="flex items-center gap-3 cursor-pointer select-none">
      <input
        type="checkbox"
        className={cn(
          'sr-only',
          className,
        )}
        {...props}
      />
      <span
        className={cn(
          'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[7px] border transition-all duration-200',
          isChecked
            ? 'border-[rgba(var(--accent-rgb),0.34)] bg-[rgba(var(--accent-rgb),0.85)]'
            : 'border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.04)]',
        )}
      >
        <Check
          className={cn(
            'h-3.5 w-3.5 stroke-[2.8] text-white transition-opacity duration-150',
            isChecked ? 'opacity-100' : 'opacity-0',
          )}
        />
      </span>
      {label && <span className="text-sm text-[var(--text-primary)]">{label}</span>}
    </Label>
  );
};

export default Checkbox;
