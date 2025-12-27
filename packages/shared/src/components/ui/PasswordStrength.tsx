// packages/shared/src/components/ui/PasswordStrength.tsx

import { cn } from '../../utils/cn';
import { CheckCircle } from 'lucide-react';
interface PasswordStrength {
  password: string;
}

interface ValidationRule {
  label: string;
  test: (password: string) => boolean;
}

const VALIDATION_RULES: ValidationRule[] = [
  {
    label: 'Мінімум 8 символів',
    test: (p) => p.length >= 8,
  },
  {
    label: 'Хоча б одна цифра',
    test: (p) => /\d/.test(p),
  },
  {
    label: 'Хоча б одна буква',
    test: (p) => /[a-zA-Z]/.test(p),
  },
];

export function PasswordStrength({ password }: PasswordStrength) {
  if (!password) return null;

  return (
    <div className="space-y-2 p-3 rounded-lg bg-bg-tertiary/40 border border-border animate-slide-up">
      <p className="text-xs text-text-secondary font-medium mb-2">
        Вимоги до пароля:
      </p>
      <div className="space-y-1.5">
        {VALIDATION_RULES.map(({ label, test }) => {
          const isValid = test(password);
          return (
            <div key={label} className="flex items-center gap-2 text-sm">
              <CheckCircle
                size={16}
                className={cn(
                  'flex-shrink-0 transition-colors',
                  isValid ? 'text-success' : 'text-text-muted'
                )}
              />
              <span
                className={cn(
                  'transition-colors',
                  isValid ? 'text-text-primary' : 'text-text-muted'
                )}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}