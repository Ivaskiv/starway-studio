import { ChangeEvent } from 'react';
import { cn } from '@/lib/utils';
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
      <div className={cn('glass-field flex items-center gap-3 p-3 rounded-xl', className)}>
        {Icon && <Icon className="w-4 h-4 text-slate-400" />}
        <span className="text-white">{value || 'Не вказано'}</span>
      </div>
    );
  }

  if (textarea) {
    return (
      <div className={className}>
        <label className="block text-sm font-medium text-slate-400 mb-2">{label}</label>
        <textarea
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="glass-field w-full min-h-[100px] resize-none px-3 py-2 rounded-md bg-slate-800 text-white"
        />
      </div>
    );
  }

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-slate-400 mb-2">{label}</label>
      <div className="flex items-center gap-3">
        {Icon && <Icon className="w-4 h-4 text-slate-400" />}
        <input
          type="text"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="glass-field w-full px-3 py-2 rounded-md bg-slate-800 text-white"
        />
      </div>
    </div>
  );
};

export default FormField;
