// fix style $100k — controlled form field wrapper tuned to liquid-glass system
import { ChangeEvent } from 'react';
import { Input } from './Input';
import Select, { SelectOption } from './Select';
import { Textarea } from './Textarea';
import { Icon } from './Icon';
import { cn } from '../lib/utils';

interface FormFieldControllerProps {
  value?: any;
  onChange?: (value: any) => void;
  name?: string;
  label?: string;
  placeholder?: string;
  type?: 'input' | 'textarea' | 'select' | 'email' | 'number' | 'checkbox';
  options?: SelectOption[];
  iconName?: string;
  iconPosition?: 'left' | 'right';
  className?: string;
  error?: string;
  disabled?: boolean;
}

export function FormFieldController({
  value,
  onChange,
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
  const baseLabel = 'text-sm font-semibold text-[var(--text-muted)]';

  if (type === 'textarea') {
    return (
      <label className={cn('space-y-2', className)}>
        {label && <span className={baseLabel}>{label}</span>}
        <Textarea
          value={value}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange?.(e.target.value)}
          placeholder={placeholder}
          rows={5}
          className="w-full rounded-[16px] border border-[var(--border-primary)] bg-[var(--glass-bg)] text-[var(--text-primary)] px-3 py-2"
          aria-invalid={!!error}
          disabled={disabled}
        />
        {error && <p className="text-xs text-[var(--accent)]">{error}</p>}
      </label>
    );
  }

  if (type === 'select') {
    return (
      <label className={cn('space-y-2', className)}>
        {label && <span className={baseLabel}>{label}</span>}
        <Select
          value={value}
          onChange={onChange}
          options={options || []}
          className="glass-field w-full"
          error={error}
          disabled={disabled}
        />
      </label>
    );
  }

  if (type === 'input' || type === 'email' || type === 'number') {
    const typeValue = type === 'email' ? 'email' : type === 'number' ? 'number' : 'text';
    return (
      <div className={cn('space-y-2 relative', className)}>
        {label && <span className={baseLabel}>{label}</span>}
        {iconName && iconPosition === 'left' && (
          <Icon name={iconName} size={20} className="absolute left-3 top-3 text-[var(--text-muted)]" />
        )}
        {iconName && iconPosition === 'right' && (
          <Icon name={iconName} size={20} className="absolute right-3 top-3 text-[var(--text-muted)]" />
        )}
        <Input
          value={value}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange?.(e.target.value)}
          type={typeValue}
          placeholder={placeholder}
          className={cn(
            'glass-field w-full border border-[var(--border-primary)] bg-[var(--glass-bg)]',
            iconName ? (iconPosition === 'left' ? 'pl-11' : 'pr-11') : '',
            className,
          )}
          disabled={disabled}
        />
        {error && <p className="text-xs text-[var(--accent)]">{error}</p>}
      </div>
    );
  }

  if (type === 'checkbox') {
    return (
      <label className={cn('flex items-center gap-2 text-[var(--text-primary)]', className)}>
        <Input
          type="checkbox"
          checked={!!value}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange?.(e.target.checked)}
          disabled={disabled}
          className="glass-field w-5 h-5 rounded-xl border-[var(--border-accent)]"
        />
        {label && <span className="text-sm font-medium">{label}</span>}
      </label>
    );
  }

  return null;
}
