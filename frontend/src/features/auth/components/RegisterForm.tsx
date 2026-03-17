// frontend/src/features/auth/components/RegisterForm.tsx
// ✓ showPasswordToggle в Input — прибрано окремі кнопки show/hide

import { useAuth }              from '@/features/auth/hooks/useAuth'
import { getToastMessage, type ToastLang } from '@/shared/i18n/toast'
import { Button, Input }        from '@/ui'
import { useForm, type AnyFieldApi } from '@tanstack/react-form'
import toast                    from 'react-hot-toast'
import { useRegisterMutation }  from '../services/auth.api'
import { FormLayout }           from './FormLayout'

interface Props {
  email?:    string
  name?:     string
  onSwitch:  () => void
  onSuccess: (credentials?: { email: string; password: string }) => void
}

function validateEmail(value: string) {
  if (!value) return 'Email обовʼязковий'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Невірний формат email'
  return undefined
}

function validatePassword(value: string) {
  if (!value)            return 'Пароль обовʼязковий'
  if (value.length < 8)  return 'Пароль мінімум 8 символів'
  if (!/[A-Za-z]/.test(value)) return 'Пароль повинен містити букви'
  if (!/\d/.test(value)) return 'Пароль повинен містити цифри'
  return undefined
}

const FieldInfo = ({ field }: { field: AnyFieldApi }) =>
  field.state.meta.isTouched && !field.state.meta.isValid ? (
    <p className="text-red-400 text-sm">{field.state.meta.errors.join(', ')}</p>
  ) : null

export function RegisterForm({ email: initialEmail = '', name: initialName = '', onSwitch, onSuccess }: Props) {
  const { user }    = useAuth()
  const lang: ToastLang = (user?.settings?.language === 'en' ? 'en' : 'uk') as ToastLang
  const [registerUser, { isLoading }] = useRegisterMutation()
  const isSocialEmail = !!initialEmail

  const form = useForm({
    defaultValues: { name: initialName, email: initialEmail, password: '', confirmPassword: '' },
    onSubmit: async ({ value }) => {
      try {
        const response = await registerUser({
          email: value.email.trim(), password: value.password, name: value.name.trim(),
        }).unwrap()
        toast.success(getToastMessage('auth.registerSuccess', lang))
        if (response.accessToken) onSuccess({ email: value.email, password: value.password })
        else onSuccess()
      } catch (err: any) {
        toast.error(
          err?.data?.error === 'email_already_registered'
            ? getToastMessage('auth.registerEmailExists', lang)
            : err?.data?.message || getToastMessage('auth.registerFailed', lang),
        )
      }
    },
  })

  return (
    <FormLayout
      title="Створити акаунт"
      subtitle={isSocialEmail ? 'Ми отримали ваші дані з соцмережі' : 'Заповніть форму для реєстрації'}
    >
      <form onSubmit={e => { e.preventDefault(); e.stopPropagation(); form.handleSubmit() }} className="space-y-4">

        {/* Name */}
        <form.Field name="name" validators={{ onChange: ({ value }) =>
          !value ? "Ім'я обовʼязкове" : value.length < 2 ? "Ім'я мінімум 2 символи" : undefined }}>
          {field => (
            <>
              <Input label="Ім'я" placeholder="Ваше ім'я"
                value={field.state.value} onChange={e => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                error={field.state.meta.isTouched && !field.state.meta.isValid ? field.state.meta.errors.join(', ') : undefined}
                disabled={isLoading || form.state.isSubmitting} />
              <FieldInfo field={field} />
            </>
          )}
        </form.Field>

        {/* Email */}
        <form.Field name="email" validators={{ onChange: ({ value }) => isSocialEmail ? undefined : validateEmail(value) }}>
          {field => (
            <>
              <Input label="Email" type="email" placeholder="your@email.com"
                value={field.state.value} onChange={e => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                error={field.state.meta.isTouched && !field.state.meta.isValid ? field.state.meta.errors.join(', ') : undefined}
                disabled={isLoading || form.state.isSubmitting || isSocialEmail}
                readOnly={isSocialEmail}
                className={isSocialEmail ? 'opacity-60 cursor-not-allowed' : ''} />
              {isSocialEmail && <p className="text-xs text-white/50">Email отримано з соцмережі</p>}
              <FieldInfo field={field} />
            </>
          )}
        </form.Field>

        {/* Password — Input рендерить Eye сам */}
        <form.Field name="password" validators={{ onChange: ({ value }) => validatePassword(value) }}>
          {field => (
            <>
              <Input label="Пароль" type="password" placeholder="••••••••"
                value={field.state.value} onChange={e => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                error={field.state.meta.isTouched && !field.state.meta.isValid ? field.state.meta.errors.join(', ') : undefined}
                disabled={isLoading || form.state.isSubmitting} />
              <FieldInfo field={field} />
            </>
          )}
        </form.Field>

        {/* Confirm Password */}
        <form.Field name="confirmPassword" validators={{
          onChangeListenTo: ['password'],
          onChange: ({ value, fieldApi }) =>
            !value ? 'Підтвердження паролю обовʼязкове'
            : value !== fieldApi.form.getFieldValue('password') ? 'Паролі не співпадають'
            : undefined,
        }}>
          {field => (
            <>
              <Input label="Підтвердіть пароль" type="password" placeholder="••••••••"
                value={field.state.value} onChange={e => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                error={field.state.meta.isTouched && !field.state.meta.isValid ? field.state.meta.errors.join(', ') : undefined}
                disabled={isLoading || form.state.isSubmitting} />
              <FieldInfo field={field} />
            </>
          )}
        </form.Field>

        <Button type="submit" fullWidth
          loading={isLoading || form.state.isSubmitting}
          disabled={isLoading || form.state.isSubmitting}
          className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600">
          Зареєструватися
        </Button>

        <div className="text-center">
          <button type="button" onClick={onSwitch}
            disabled={isLoading || form.state.isSubmitting}
            className="text-orange-400 hover:text-orange-300 font-medium transition-colors disabled:opacity-50">
            Вже маєте акаунт? Увійти
          </button>
        </div>

      </form>
    </FormLayout>
  )
}