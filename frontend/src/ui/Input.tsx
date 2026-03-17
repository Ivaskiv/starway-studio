// frontend/src/ui/Input.tsx
// ✓ showPasswordToggle — іконка ВСЕРЕДИНІ relative-wrapper разом з input
// ✓ Нуль inline style={{}}  ✓ Liquid Glass через CSS class
// ✓ Eye/EyeOff з lucide-react

import { forwardRef, useState, type InputHTMLAttributes } from 'react'
import { Eye, EyeOff, type LucideIcon }                   from 'lucide-react'
import { cn }                                              from '../lib/utils'

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?:               string
  error?:               string
  helperText?:          string
  icon?:                LucideIcon
  showPasswordToggle?:  boolean
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
    ref,
  ) => {
    const [show, setShow] = useState(false)

    const isPassword  = type === 'password'
    const actualType  = isPassword && show ? 'text' : type
    const hasLeft     = Boolean(Icon)
    // Показуємо toggle або якщо showPasswordToggle=true, або якщо type=password і явно не вимкнено
    const hasRight    = isPassword && showPasswordToggle !== false

    return (
      <div className="flex flex-col gap-1.5 w-full">

        {label && (
          <label className={cn(
            'text-sm font-semibold',
            error ? 'text-red-400' : 'text-[color:var(--text-primary)]',
          )}>
            {label}
          </label>
        )}

        {/* 
          relative — ТІЛЬКИ на цьому div, що містить input + іконки.
          НЕ на зовнішньому flex-col — це і була причина вильоту.
        */}
        <div className="relative w-full">

          {Icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)] pointer-events-none">
              <Icon className="w-5 h-5" />
            </div>
          )}

          <input
            ref={ref}
            type={actualType}
            disabled={disabled}
            className={cn(
              // Liquid Glass base
              'input-glass w-full',
              hasLeft  ? 'pl-10' : 'pl-4',
              hasRight ? 'pr-11' : 'pr-4',
              error    && 'input-glass--error',
              disabled && 'opacity-60 cursor-not-allowed',
              className,
            )}
            {...props}
          />

          {/* Toggle — абсолютно позиціонований ВСЕРЕДИНІ того ж div.relative */}
          {hasRight && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShow(v => !v)}
              aria-label={show ? 'Приховати пароль' : 'Показати пароль'}
              className="
                absolute right-3 top-1/2 -translate-y-1/2
                w-7 h-7 flex items-center justify-center rounded-lg
                text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]
                hover:bg-white/[.07]
                transition-colors duration-150
                focus:outline-none
              "
            >
              {show
                ? <EyeOff className="w-4 h-4" />
                : <Eye    className="w-4 h-4" />
              }
            </button>
          )}
        </div>

        {(error || helperText) && (
          <p className={cn(
            'text-xs',
            error ? 'text-red-400' : 'text-[color:var(--text-muted)]',
          )}>
            {error || helperText}
          </p>
        )}

      </div>
    )
  },
)

Input.displayName = 'Input'
export default Input