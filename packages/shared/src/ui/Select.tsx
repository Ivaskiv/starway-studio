// packages/shared/src/components/ui/Select.tsx

import { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../utils';

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  options: { value: string; label: string }[];
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ 
    className, 
    label, 
    error, 
    helperText, 
    options, 
    variant = 'primary',
    size = 'md',
    ...props 
  }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-slate-300 mb-2">
            {label}
            {props.required && <span className="text-red-400 ml-1">*</span>}
          </label>
        )}
        
        <div className="relative">
          <select
            ref={ref}
            className={cn(
              'w-full appearance-none cursor-pointer',
              'font-medium transition-all duration-300',
              'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              
              // Variants
              variant === 'primary' && [
                'bg-slate-800/50 text-white border border-slate-700',
                'focus:border-orange-500 focus:ring-orange-500/30',
              ],
              variant === 'secondary' && [
                'bg-slate-700/40 text-white border border-slate-600',
                'backdrop-blur-sm',
                'focus:border-green-500 focus:ring-green-500/30',
              ],
              variant === 'ghost' && [
                'bg-transparent text-slate-300 border border-transparent',
                'focus:border-orange-500 focus:ring-orange-500/30',
              ],

              // Sizes
              size === 'sm' && 'px-3 py-1.5 pr-8 text-sm rounded-lg',
              size === 'md' && 'px-4 py-2.5 pr-10 text-base rounded-xl',
              size === 'lg' && 'px-5 py-3 pr-12 text-lg rounded-2xl',

              // Error state
              error && 'border-red-500 focus:border-red-500 focus:ring-red-500/30',

              className
            )}
            {...props}
          >
            {options.map((option) => (
              <option 
                key={option.value} 
                value={option.value} 
                className="bg-slate-800 text-white"
              >
                {option.label}
              </option>
            ))}
          </select>
          
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <ChevronDown className={cn(
              'text-slate-400',
              size === 'sm' && 'w-4 h-4',
              size === 'md' && 'w-5 h-5',
              size === 'lg' && 'w-6 h-6'
            )} />
          </div>
        </div>
        
        {error && (
          <p className="mt-1.5 text-sm text-red-400 flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
        
        {helperText && !error && (
          <p className="mt-1.5 text-sm text-slate-400">{helperText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';