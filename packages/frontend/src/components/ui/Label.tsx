// src/components/ui/Label.tsx
import { LabelHTMLAttributes, forwardRef } from 'react'

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  variant?: 'default' | 'required' | 'optional' | 'error'
  size?: 'sm' | 'md' | 'lg'
}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className = '', variant = 'default', size = 'md', children, ...props }, ref) => {
    const variants = {
      default: 'text-gray-300',
      required: 'text-gray-300 after:content-["*"] after:ml-1 after:text-red-500',
      optional: 'text-gray-400',
      error: 'text-red-500'
    }

    const sizes = {
      sm: 'text-xs',
      md: 'text-sm',
      lg: 'text-base'
    }
    
    return (
      <label
        ref={ref}
        className={`block font-medium mb-1 ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {children}
      </label>
    )
  }
)

Label.displayName = 'Label'