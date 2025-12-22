// src/components/ui/Checkbox.tsx


import { InputHTMLAttributes, forwardRef } from 'react'

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  variant?: 'default' | 'success' | 'danger'
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className = '', label, variant = 'default', ...props }, ref) => {
    const variants = {
      default: 'accent-orange-600',
      success: 'accent-green-600',
      danger: 'accent-red-600'
    }
    
    return (
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          ref={ref}
          type="checkbox"
          className={`w-4 h-4 rounded border-gray-600 bg-gray-800 ${variants[variant]} ${className}`}
          {...props}
        />
        {label && <span className="text-sm text-gray-300">{label}</span>}
      </label>
    )
  }
)

Checkbox.displayName = 'Checkbox'