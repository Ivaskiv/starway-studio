// frontend/src/ui/FormFieldController.tsx
import { FieldType } from '../shared/types/modules.types'
import { Input } from './Input'
import Select, { SelectOption } from './Select'
import { Textarea } from './Textarea'
import { Icon } from './Icon'

interface FormFieldControllerProps {
  value?: any
  onChange?: (value: any) => void
  name?: string
  label?: string
  placeholder?: string
  type?: FieldType
  options?: SelectOption[]
  iconName?: string
  iconPosition?: 'left' | 'right'
  className?: string
  error?: string
  disabled?: boolean
}

export function FormFieldController({
  value,
  onChange,
  name,
  label,
  placeholder,
  type = 'input',
  options,
  iconName,
  iconPosition = 'left',
  className,
  error,
  disabled = false,
}: FormFieldControllerProps) {
  if (type === 'textarea') {
    return (
      <div className="space-y-2">
        {label && <label className="block text-sm font-medium text-slate-300">{label}</label>}
        <Textarea
          value={value}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange?.(e.target.value)}
          placeholder={placeholder}
          rows={5}
          className={`glass-field w-full resize-none ${className || ''}`}
          aria-invalid={!!error}
          disabled={disabled}
        />
        {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
      </div>
    )
  }

  if (type === 'select') {
    return (
      <div className="space-y-1">
        {label && <label className="text-white">{label}</label>}
        <Select value={value} onChange={onChange} options={options || []} className={className} error={error} disabled={disabled} />
      </div>
    )
  }

  if (type === 'input' || type === 'email' || type === 'number') {
    return (
      <div className="space-y-1 relative">
        {label && <label className="text-white">{label}</label>}

        {iconName && iconPosition === 'left' && (
          <Icon name={iconName} size={20} className="absolute left-3 top-3 text-text-muted z-10" />
        )}
        {iconName && iconPosition === 'right' && (
          <Icon name={iconName} size={20} className="absolute right-3 top-3 text-text-muted z-10" />
        )}

        <Input
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange?.(e.target.value)}
          type={type === 'email' ? 'email' : type === 'number' ? 'number' : 'text'}
          placeholder={placeholder}
          className={`${iconName ? (iconPosition === 'left' ? 'pl-11' : 'pr-11') : ''} ${className || ''}`}
          disabled={disabled}
        />

        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
      </div>
    )
  }

  if (type === 'checkbox') {
    return (
      <div className="flex items-center gap-2">
        <Input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange?.(e.target.checked)}
          disabled={disabled}
          className="w-4 h-4 accent-purple-500"
        />
        {label && <span className="text-white">{label}</span>}
      </div>
    )
  }

  return null
}