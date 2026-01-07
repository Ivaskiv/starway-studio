// /Users/viravira/Documents/starway-studio/packages/frontend/src/features/auth/LoginForm.tsx

import {  Card, CardContent, CardHeader, ErrorAlert, FormField, PasswordField } from '../../ui';
import { Mail } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import Button from '../../ui/Button';

export interface LoginFormData {
  email: string;
  password: string;
}

export interface LoginFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  onRegisterClick?: () => void;
  className?: string;
  isLoading?: boolean;
}

export default function LoginForm({ 
  onSubmit: handleLoginSubmit, 
  onRegisterClick, 
  className,
  isLoading = false 
}: LoginFormProps) {
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    setServerError('');

    try {
      await handleLoginSubmit(data.email, data.password);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Помилка входу');
    }
  };

  const loading = isLoading || isSubmitting;

  return (
    <Card className={'w-full animate-scale-in'} hover glass>
      <CardHeader>
        <h2 className="text-2xl font-bold text-center mb-2">Вхід</h2>
        <p className="text-text-secondary text-center text-sm">
          Введи свої дані для входу
        </p>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <ErrorAlert message={serverError} />

          <FormField
            label="Email"
            type="email"
            placeholder="your@email.com"
            icon={Mail}
            error={errors.email?.message}
            disabled={loading}
            {...register('email', { required: 'Email обов\'язковий' })}
          />

          <PasswordField
            label="Пароль"
            placeholder="••••••••"
            error={errors.password?.message}
            disabled={loading}
            {...register('password', { 
              required: 'Пароль обов\'язковий',
              minLength: { value: 8, message: 'Мінімум 8 символів' }
            })}
          />

          <Button 
          type="submit" 
          size="lg" 
          isLoading={loading} 
          disabled={loading}>
            Увійти
          </Button>

          {onRegisterClick && (
            <Button 
            type="button" 
            size="md" 
            onClick={onRegisterClick} 
            disabled={loading}>
              Створити акаунт
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}