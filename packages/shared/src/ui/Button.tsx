// packages/shared/src/components/ui/Button.tsx

import { forwardRef } from 'react';
import { cn } from '../utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          // Base
          'inline-flex items-center justify-center font-semibold transition-all duration-300',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-bg-primary',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          
          // Variants
          variant === 'primary' && [
            'bg-gradient-to-br from-primary to-accent text-white',
            'shadow-lg shadow-primary/30',
            'hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5',
            'active:translate-y-0',
          ],
          
          variant === 'secondary' && [
            'bg-bg-tertiary/40 text-text-primary border border-border',
            'backdrop-blur-glass',
            'hover:bg-bg-tertiary/60 hover:border-primary',
          ],
          
          variant === 'danger' && [
            'bg-gradient-to-br from-danger to-red-600 text-white',
            'shadow-lg shadow-danger/30',
            'hover:shadow-xl hover:shadow-danger/40 hover:-translate-y-0.5',
          ],
          
          variant === 'success' && [
            'bg-gradient-to-br from-success to-green-600 text-white',
            'shadow-lg shadow-success/30',
            'hover:shadow-xl hover:shadow-success/40 hover:-translate-y-0.5',
          ],
          
          variant === 'ghost' && [
            'bg-transparent text-text-secondary',
            'hover:bg-bg-tertiary/40 hover:text-text-primary',
          ],
          
          // Sizes
          size === 'sm' && 'px-3 py-1.5 text-sm rounded-lg',
          size === 'md' && 'px-6 py-2.5 text-base rounded-xl',
          size === 'lg' && 'px-8 py-3.5 text-lg rounded-2xl',
          
          className
        )}
        {...props}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Завантаження...
          </>
        ) : children}
      </button>
    );
  }
);

Button.displayName = 'Button';