// packages/shared/src/components/ui/Label.tsx

import { forwardRef } from 'react'
import { cn } from '../utils';

export interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean
}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, children, required, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          'block text-sm font-medium text-text-secondary mb-1',
          className
        )}
        {...props}
      >
        {children}
        {required && <span className="ml-1 text-danger">*</span>}
      </label>
    )
  }
)

Label.displayName = 'Label'
