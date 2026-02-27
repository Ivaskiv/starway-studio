import { forwardRef, useState, InputHTMLAttributes } from 'react'
import { Eye, EyeOff, LucideIcon } from 'lucide-react'
import { cn } from '../lib/utils'

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  error?: string
  helperText?: string
  icon?: LucideIcon
  showPasswordToggle?: boolean
}

export const Input = forwardRef<HTMLInputElement, Props>(
  (
    {
      label,
      error,
      helperText,
      icon: Icon,
      showPasswordToggle,
      type = 'text',
      disabled,
      className,
      ...props
    },
    ref
  ) => {
    const [show, setShow] = useState(false)
    const isPassword = type === 'password'
    const actualType = isPassword && show ? 'text' : type

    const hasLeftIcon = Boolean(Icon)
    const hasRightIcon = isPassword && showPasswordToggle

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label
            className={cn(
              'text-sm font-medium',
              error ? 'text-red-400' : 'text-white/80'
            )}
          >
            {label}
          </label>
        )}

        <div className="relative">
          {Icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
              <Icon className="w-5 h-5" />
            </div>
          )}

          <input
            ref={ref}
            type={actualType}
            disabled={disabled}
            className={cn(
              'w-full h-11 rounded-xl border outline-none',
              'bg-[color:rgba(var(--ambient-rgb-2),0.3)] backdrop-blur-md border-[color:rgba(var(--glass-border-rgb),0.22)]',
              'text-[color:var(--color-text)] placeholder:text-white/30',
              'transition-all duration-200',
              'focus:border-[color:rgba(var(--accent-rgb),0.55)] focus:ring-2 focus:ring-[color:rgba(var(--accent-rgb),0.2)] focus:bg-white/10',
              error &&
                'border-red-500/50 focus:border-red-500 focus:ring-red-500/20',
              disabled && 'opacity-50 cursor-not-allowed',

              // ✅ ЄДИНА логіка padding
              hasLeftIcon ? 'pl-10' : 'pl-3',
              hasRightIcon ? 'pr-10' : 'pr-3',

              className
            )}
            {...props}
          />

          {hasRightIcon && (
            <button
              type="button"
              onClick={() => setShow(v => !v)}
              tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60"
            >
              {show ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          )}
        </div>

        {(error || helperText) && (
          <p className={cn('text-xs', error ? 'text-red-400' : 'text-white/50')}>
            {error || helperText}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
export default Input
