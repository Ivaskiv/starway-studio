// packages/shared/src/components/ui/Textarea.tsx

import { forwardRef } from 'react';
import { cn } from '../utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ 
    className, 
    label, 
    error, 
    helperText, 
    variant = 'primary', 
    size = 'md', 
    isLoading, 
    disabled, 
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
        
        <textarea
          ref={ref}
          disabled={disabled || isLoading}
          className={cn(
            'w-full font-medium transition-all duration-300',
            'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900',
            'disabled:opacity-50 disabled:cursor-not-allowed resize-none',
            
            // Variants
            variant === 'primary' && [
              'bg-slate-800/50 text-white border border-slate-700',
              'focus:border-orange-500 focus:ring-orange-500/30',
              'placeholder:text-slate-500',
            ],
            variant === 'secondary' && [
              'bg-slate-700/40 text-white border border-slate-600',
              'backdrop-blur-sm',
              'focus:border-green-500 focus:ring-green-500/30',
              'placeholder:text-slate-500',
            ],
            variant === 'ghost' && [
              'bg-transparent text-slate-300 border border-transparent',
              'focus:border-orange-500 focus:ring-orange-500/30',
              'placeholder:text-slate-600',
            ],

            // Sizes
            size === 'sm' && 'px-3 py-1.5 text-sm rounded-lg',
            size === 'md' && 'px-4 py-2 text-base rounded-xl',
            size === 'lg' && 'px-5 py-3 text-lg rounded-2xl',

            // Error state
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500/30',

            className
          )}
          {...props}
        />

        {error && (
          <p className="mt-1.5 text-sm text-red-400 flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}

        {helperText && !error && (
          <p className="mt-1.5 text-sm text-slate-400">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';