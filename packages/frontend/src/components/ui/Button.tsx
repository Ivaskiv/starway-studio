// src/components/ui/Button.tsx
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success' 
  isLoading?: boolean
    size?: 'sm' | 'md' | 'lg'

}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', isLoading, children, type = 'button', disabled, ...props }, ref) => {
    const variants = {
      primary: 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-bold',
      secondary: 'bg-gray-800 hover:bg-gray-700 text-white font-medium',
      danger: 'text-red-500 hover:text-red-400',
      ghost: 'text-gray-400 hover:text-white',
      success: 'bg-gradient-to-r from-green-700 to-emerald-700 hover:from-green-600 hover:to-emerald-600 text-white font-bold'
    }
     const sizes = {
      sm: 'py-1 px-3 text-sm',
      md: 'py-2 px-4 text-base',
      lg: 'py-3 px-6 text-lg'
    }
    
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={`py-2 px-4 rounded-lg transition inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]}  ${sizes[size]}  ${className}`}
        {...props}
      >
        {isLoading && (
          <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

