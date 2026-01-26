import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, Sparkles, User } from 'lucide-react'

import { Input, Button } from '@/ui'
import { PasswordStrength } from '@/ui/PasswordStrength'
import { FormLayout } from './FormLayout'

const registerSchema = z
  .object({
    name: z.string().min(2, 'Мін. 2 символи'),
    email: z.string().email('Невірний email'),
    password: z
      .string()
      .min(8, 'Мін. 8 символів')
      .regex(/[A-Za-z]/, 'Має містити літеру')
      .regex(/[0-9]/, 'Має містити цифру'),
    confirmPassword: z.string(),
  })
  .refine(data => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Паролі не співпадають',
  })

export type RegisterFormData = z.infer<typeof registerSchema>

interface Props {
  onSubmit: (data: Omit<RegisterFormData, 'confirmPassword'>) => Promise<void>
  onLoginClick?: () => void
  isLoading?: boolean
  serverError?: string
}

export function RegisterForm({
  onSubmit,
  onLoginClick,
  isLoading = false,
  serverError,
}: Props) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  const password = watch('password', '')
  const loading = isLoading || isSubmitting

  const submit = ({ confirmPassword, ...rest }: RegisterFormData) =>
    onSubmit(rest)

  return (
    <FormLayout
      title="Реєстрація"
      subtitle="Створи акаунт за хвилину"
      error={serverError}
    >
      <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4 sm:gap-3">
        <Input
          {...register('name')}
          label="Імʼя"
          placeholder="Надя"
          icon={User}
          error={errors.name?.message}
          disabled={loading}
        />

        <Input
          {...register('email')}
          label="Email"
          type="email"
          placeholder="your@email.com"
          icon={Mail}
          error={errors.email?.message}
          disabled={loading}
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

        <Input
          {...register('confirmPassword')}
          label="Підтвердження пароля"
          type="password"
          placeholder="••••••••"
          error={errors.confirmPassword?.message}
          disabled={loading}
        />

        <PasswordStrength password={password} />

        <Button
          type="submit"
          color="orange"
          size="lg"
          fullWidth
          isLoading={loading}
          loadingText="Реєструємо..."
        >
          <Sparkles className="w-5 h-5" />
          Зареєструватись
        </Button>

        {onLoginClick && (
          <Button
            type="button"
            variant="ghost"
            color="white"
            size="md"
            fullWidth
            onClick={onLoginClick}
            disabled={loading}
          >
            Вже маєш акаунт?
            <span className="text-orange-400 ml-1">Увійти</span>
          </Button>
        )}
      </form>
    </FormLayout>
  )
}
