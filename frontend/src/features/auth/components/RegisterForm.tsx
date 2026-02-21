// frontend/src/features/auth/components/RegisterForm.tsx
import { useForm } from '@tanstack/react-form'
import { useRegisterMutation } from '../services/auth.api'
import { Button, Input } from '@/ui'
import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { FormLayout } from './FormLayout'

function validateEmail(value: string) {
  if (!value) return 'Email обовʼязковий'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Невірний формат email'
  return undefined
}

function validatePassword(value: string) {
  if (!value) return 'Пароль обовʼязковий'
  if (value.length < 8) return 'Пароль повинен бути мінімум 8 символів'
  if (!/[A-Za-z]/.test(value)) return 'Пароль повинен містити букви'
  if (!/\d/.test(value)) return 'Пароль повинен містити цифри'
  return undefined
}

interface Props {
  email?: string
  name?: string
  onSwitch: () => void
  onSuccess: (credentials?: { email: string; password: string }) => void
}

export function RegisterForm({
  email: initialEmail = '',
  name: initialName = '',
  onSwitch,
  onSuccess,
}: Props) {
  const [registerUser, { isLoading }] = useRegisterMutation()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const isSocialEmail = !!initialEmail

  const form = useForm({
    defaultValues: {
      name: initialName,
      email: initialEmail,
      password: '',
      confirmPassword: '',
    },
    onSubmit: async ({ value }) => {
      try {
        const response = await registerUser({
          email: value.email.trim(),
          password: value.password,
          name: value.name.trim(),
        }).unwrap()

        toast.success('Реєстрація успішна!')

        if (response.accessToken) {
          onSuccess({ email: value.email, password: value.password })
        } else {
          onSuccess()
        }
      } catch (err: any) {
        const message =
          err?.data?.error === 'email_already_registered'
            ? 'Цей email вже зареєстрований. Спробуйте увійти.'
            : err?.data?.message || 'Помилка реєстрації'
        toast.error(message)
        throw new Error(message)
      }
    },
  })

  return (
    <FormLayout
      title="Створити акаунт"
      subtitle={isSocialEmail ? 'Ми отримали ваші дані з соцмережі' : 'Заповніть форму для реєстрації'}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          e.stopPropagation()
          form.handleSubmit()
        }}
        className="space-y-5"
      >
        {/* Name */}
        <form.Field
          name="name"
          validators={{
            onChange: ({ value }) =>
              !value
                ? "Ім'я обовʼязкове"
                : value.length < 2
                ? "Ім'я повинно бути мінімум 2 символи"
                : undefined,
          }}
        >
          {(field) => (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-white/80">Ім'я</label>
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder="Ваше ім'я"
                error={
                  field.state.meta.isTouched && !field.state.meta.isValid
                    ? field.state.meta.errors.join(', ')
                    : undefined
                }
                disabled={isLoading || form.state.isSubmitting}
              />
            </div>
          )}
        </form.Field>

        {/* Email */}
        <form.Field
          name="email"
          validators={{
            onChange: ({ value }) => (isSocialEmail ? undefined : validateEmail(value)),
          }}
        >
          {(field) => (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-white/80">Email</label>
              <Input
                type="email"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder="your@email.com"
                error={
                  field.state.meta.isTouched && !field.state.meta.isValid
                    ? field.state.meta.errors.join(', ')
                    : undefined
                }
                disabled={isLoading || form.state.isSubmitting || isSocialEmail}
                readOnly={isSocialEmail}
                className={isSocialEmail ? 'bg-gray-800/50 cursor-not-allowed' : ''}
              />
              {isSocialEmail && (
                <p className="text-xs text-white/50">Email отримано з соцмережі</p>
              )}
            </div>
          )}
        </form.Field>

        {/* Password */}
        <form.Field
          name="password"
          validators={{ onChange: ({ value }) => validatePassword(value) }}
        >
          {(field) => (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-white/80">Пароль</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="••••••••"
                  error={
                    field.state.meta.isTouched && !field.state.meta.isValid
                      ? field.state.meta.errors.join(', ')
                      : undefined
                  }
                  disabled={isLoading || form.state.isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                >
                  {showPassword ? '👁️' : '🙈'}
                </button>
              </div>
            </div>
          )}
        </form.Field>

        {/* Confirm Password */}
        <form.Field
          name="confirmPassword"
          validators={{
            onChangeListenTo: ['password'],
            onChange: ({ value, fieldApi }) => {
              if (!value) return 'Підтвердження паролю обовʼязкове'
              if (value !== fieldApi.form.getFieldValue('password')) return 'Паролі не співпадають'
              return undefined
            },
          }}
        >
          {(field) => (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-white/80">Підтвердіть пароль</label>
              <div className="relative">
                <Input
                  type={showConfirm ? 'text' : 'password'}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="••••••••"
                  error={
                    field.state.meta.isTouched && !field.state.meta.isValid
                      ? field.state.meta.errors.join(', ')
                      : undefined
                  }
                  disabled={isLoading || form.state.isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                >
                  {showConfirm ? '👁️' : '🙈'}
                </button>
              </div>
            </div>
          )}
        </form.Field>

        {/* Submit + Switch */}
        <form.Subscribe
          selector={(s) => [s.canSubmit, s.isSubmitting] as const}
          children={([canSubmit, isSubmitting]) => (
            <>
              <Button
                type="submit"
                fullWidth
                loading={isSubmitting || isLoading}
                disabled={!canSubmit || isSubmitting || isLoading}
                className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600"
              >
                Зареєструватися
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={onSwitch}
                  disabled={isSubmitting || isLoading}
                  className="text-orange-400 hover:text-orange-300 font-medium transition-colors disabled:opacity-50"
                >
                  Вже маєте акаунт? Увійти
                </button>
              </div>
            </>
          )}
        />
      </form>
    </FormLayout>
  )
}