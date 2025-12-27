// packages/shared/src/components/ui/Textarea.tsx
import { forwardRef } from 'react';
import { cn } from '../../utils/cn';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, disabled, children, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'w-full font-medium transition-all duration-300',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-bg-primary',
          'disabled:opacity-50 disabled:cursor-not-allowed resize-none',
          
          // Variants
          variant === 'primary' && [
            'bg-bg-primary text-text-primary border border-border',
            'focus:border-primary focus:ring-primary/50',
          ],
          variant === 'secondary' && [
            'bg-bg-tertiary/40 text-text-primary border border-border',
            'backdrop-blur-glass',
            'focus:border-secondary focus:ring-secondary/50',
          ],
          variant === 'ghost' && [
            'bg-transparent text-text-secondary border border-transparent',
            'focus:border-primary focus:ring-primary/50',
          ],

          // Sizes
          size === 'sm' && 'px-3 py-1.5 text-sm rounded-lg',
          size === 'md' && 'px-4 py-2 text-base rounded-xl',
          size === 'lg' && 'px-5 py-3 text-lg rounded-2xl',

          className
        )}
        {...props}
      >
        {children}
      </textarea>
    );
  }
);

Textarea.displayName = 'Textarea';
