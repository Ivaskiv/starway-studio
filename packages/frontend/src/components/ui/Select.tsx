// ═══════════════════════════════════════════════════════════
// src/components/ui/Select.tsx
// ═══════════════════════════════════════════════════════════
import { SelectHTMLAttributes, forwardRef } from 'react'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: SelectOption[]
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', label, error, options, id, ...props }, ref) => {
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`
    
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="block text-sm text-gray-400 mb-2">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`w-full bg-black border ${error ? 'border-red-500' : 'border-gray-700'} rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500 transition ${className}`}
          {...props}
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
      </div>
    )
  }
)

Select.displayName = 'Select'

