// /Users/viravira/Documents/starway-studio/packages/frontend/src/components/auth/RegisterForm.tsx
import {  
  Card, 
  CardContent, 
  CardHeader, 
  ErrorAlert, 
  FormFieldController, 
  PasswordField, 
  PasswordStrength
} from '../../ui';
import { Mail, User as UserIcon } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import Button from '../../ui/Button';
import { cn } from '@/lib/utils';

export interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface RegisterFormProps {
  onSubmit: (name: string, email: string, password: string) => Promise<void>;
  onLoginClick?: () => void;
  variant?: 'default' | 'funnel-admin';
  className?: string;
  isLoading?: boolean;
}

export default function RegisterForm({
  onSubmit: handleRegisterSubmit,
  onLoginClick,
  variant = 'default',
  className,
  isLoading = false
}: RegisterFormProps) {
  const [serverError, setServerError] = useState('');
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<RegisterFormData>();
  const password = watch('password', '');
  const loading = isLoading || isSubmitting;

  const onSubmit = async (data: RegisterFormData) => {
    setServerError('');
    if (data.password !== data.confirmPassword) {
      setServerError('Паролі не співпадають');
      return;
    }
    try {
      await handleRegisterSubmit(data.name, data.email, data.password);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Помилка реєстрації');
    }
  };

  return (
    <Card className={cn('w-full animate-scale-in', className)} hover glass>
      <CardHeader>
        <h2 className="text-2xl font-bold text-center mb-2">
          {variant === 'funnel-admin' ? 'Створити AI-воронку' : 'Реєстрація'}
        </h2>
        <p className="text-text-secondary text-center text-sm">
          {variant === 'funnel-admin'
            ? 'Стань автором власної AI-екосистеми'
            : 'Заповни дані для створення акаунту'}
        </p>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <ErrorAlert message={serverError} />

          <FormFieldController
            label="Ім'я"
            type="text"
            placeholder="Надя"
            // icon={UserIcon}
            error={errors.name?.message}
            disabled={loading}
            {...register('name', { required: 'Ім\'я обов\'язкове' })}
          />

          <FormFieldController
            label="Email"
            type="email"
            placeholder="your@email.com"
            // icon={Mail}
            error={errors.email?.message}
            disabled={loading}
            {...register('email', { required: 'Email обов\'язковий' })}
          />

          <PasswordField
            label="Пароль"
            placeholder="••••••••"
            helperText="Мінімум 8 символів, буква та цифра"
            error={errors.password?.message}
            disabled={loading}
            {...register('password', {
              required: 'Пароль обов\'язковий',
              minLength: { value: 8, message: 'Мінімум 8 символів' }
            })}
          />

          <PasswordField
            label="Підтвердження пароля"
            placeholder="••••••••"
            error={errors.confirmPassword?.message}
            disabled={loading}
            showToggle={false}
            {...register('confirmPassword', {
              required: 'Підтвердження пароля обов\'язкове'
            })}
          />

          <PasswordStrength password={password} />

          <Button
            type="submit"
            data-color="orange"
            data-size="lg"
            className="w-full"
            isLoading={loading}
            disabled={loading}
          >
            {variant === 'funnel-admin' ? 'Створити воронку' : 'Зареєструватись'}
          </Button>

          {onLoginClick && (
            <Button
              type="button"
              data-color="orange"
              data-size="md"
              // variant="ghost"
              className="w-full"
              onClick={onLoginClick}
              disabled={loading}
            >
              Вже маєш акаунт?
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
