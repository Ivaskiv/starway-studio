// fix style $100k — premium checkbox aligned with the glass tokens
import React from 'react';
import { cn } from '../lib/utils';
import { Label } from './Label';
import Input from './Input';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({ label, className, ...props }) => {
  return (
    <Label className="flex items-center gap-3 cursor-pointer select-none">
      <Input
        type="checkbox"
        className={cn(
          'w-5 h-5 rounded-xl border-[var(--border-accent)] bg-[var(--glass-bg)] outline-none transition duration-200 appearance-none',
          'checked:bg-[var(--accent)] checked:border-[var(--accent)] checked:shadow-[0_0_10px_rgba(var(--accent-rgb),0.4)]',
          'focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-0',
          className,
        )}
        {...props}
      />
      {label && <span className="text-sm text-[var(--text-primary)]">{label}</span>}
    </Label>
  );
};

export default Checkbox;
