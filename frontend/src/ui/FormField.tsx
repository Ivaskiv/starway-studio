// fix style $100k — premium form fields using glass surfaces
import { ChangeEvent } from 'react';
import { cn } from '../lib/utils';
import { Mail, User, Phone, MapPin } from 'lucide-react';

interface FormFieldProps {
  label: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  placeholder?: string;
  icon?: 'user' | 'mail' | 'phone' | 'map';
  readOnly?: boolean;
  textarea?: boolean;
  className?: string;
}

const ICONS = {
  user: User,
  mail: Mail,
  phone: Phone,
  map: MapPin,
};

const fieldClass = 'w-full rounded-[16px] border border-[var(--border-primary)] bg-[var(--glass-bg)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-3 py-2 transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[color:rgba(var(--accent-rgb),0.2)] appearance-none';

const FormField: React.FC<FormFieldProps> = ({
  label,
  value,
  onChange,
  placeholder = '',
  icon,
  readOnly = false,
  textarea = false,
  className,
}) => {
  const Icon = icon ? ICONS[icon] : null;

  if (readOnly) {
    return (
      <div className={cn('liquid-glass surface glass-noise flex items-center gap-3 p-3 rounded-[18px]', className)}>
        {Icon && <Icon className="w-4 h-4 text-[var(--text-muted)]" />}
        <span className="text-[var(--text-primary)]">{value || 'Не вказано'}</span>
      </div>
    );
  }

  if (textarea) {
    return (
      <label className={cn('block space-y-2', className)}>
        <span className="text-sm font-medium text-[var(--text-muted)]">{label}</span>
        <textarea
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={cn(fieldClass, 'min-h-[120px] resize-none')}
        />
      </label>
    );
  }

  return (
    <label className={cn('block space-y-2', className)}>
      <span className="text-sm font-medium text-[var(--text-muted)]">{label}</span>
      <div className="flex items-center gap-3">
        {Icon && <Icon className="w-4 h-4 text-[var(--text-muted)]" />}
        <input
          type="text"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={cn(fieldClass, 'flex-1')}
        />
      </div>
    </label>
  );
};

export default FormField;
