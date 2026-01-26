import { zodResolver } from '@hookform/resolvers/zod';
import { LogIn, Mail } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button, Input } from '@/ui';
import { FormLayout } from './FormLayout';

const loginSchema = z.object({
  email: z.string().min(1, 'Email обовʼязковий').email('Невірний email'),
  password: z.string().min(1, 'Пароль обовʼязковий').min(8, 'Мін. 8 символів'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

interface Props {
  onSubmit: (data: LoginFormData) => Promise<void>;
  onRegisterClick?: () => void;
  isLoading?: boolean;
  serverError?: string;
}

export function LoginForm({ onSubmit, onRegisterClick, isLoading = false, serverError }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const loading = isLoading || isSubmitting;

  return (
    <FormLayout
      title="Вхід до системи"
      subtitle="Введи свої дані для продовження"
      error={serverError}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 sm:gap-3">
        <Input
          {...register('email')}
          label="Email"
          type="email"
          placeholder="your@email.com"
          icon={Mail}
          error={errors.email?.message}
          disabled={loading}
          autoFocus
        />

        <Input
          {...register('password')}
          label="Пароль"
          type="password"
          placeholder="••••••••"
          showPasswordToggle
          error={errors.password?.message}
          disabled={loading}
        />

        <Button
          type="submit"
          color="orange"
          size="lg"
          fullWidth
          isLoading={loading}
          loadingText="Входимо..."
        >
          <LogIn className="w-5 h-5" />
          Увійти
        </Button>

        {onRegisterClick && (
          <Button
            type="button"
            variant="ghost"
            color="white"
            size="md"
            fullWidth
            onClick={onRegisterClick}
            disabled={loading}
          >
            Нема акаунту?
            <span className="text-orange-400 ml-1">Зареєструватись</span>
          </Button>
        )}
      </form>
    </FormLayout>
  );
}
