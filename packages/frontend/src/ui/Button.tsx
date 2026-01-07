// /Users/viravira/Documents/starway-studio/packages/frontend/src/ui/Button.tsx
import { cn } from '@/lib/utils';
import { forwardRef, ReactNode } from 'react';

 export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
  color?: 'green' | 'olive' | 'red' | 'yellow' | 'orange';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  // variant?: 'primary' | 'secondary' | 'ghost';
}


export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, size, color, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn('btn', className)}
        // data-variant={variant}
        data-size={size}
        data-color={color}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

Button.displayName = 'Button';

export default Button;