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

const PRIMARY_AUTH_BUTTON_CLASS = 'rounded-[14px] border border-[rgba(var(--accent-rgb),0.42)] bg-[linear-gradient(180deg,rgba(var(--accent-rgb),0.34),rgba(36,58,118,0.58))] text-white shadow-[0_20px_45px_rgba(0,0,0,0.45),0_0_24px_rgba(var(--accent-rgb),0.22)] transition-all duration-200 hover:-translate-y-[2px] hover:border-[rgba(var(--accent-rgb),0.58)] hover:bg-[linear-gradient(180deg,rgba(var(--accent-rgb),0.42),rgba(36,58,118,0.72))] hover:shadow-[0_24px_54px_rgba(0,0,0,0.48),0_0_30px_rgba(var(--accent-rgb),0.28)] active:translate-y-0 active:shadow-[0_10px_20px_rgba(0,0,0,0.45),0_0_18px_rgba(var(--accent-rgb),0.2)]'

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
        <form.Field name="name" validators={{ onBlur: ({ value }) =>
          !value ? "Ім'я обовʼязкове" : value.length < 2 ? "Ім'я мінімум 2 символи" : undefined }}>
          {field => (
            <>
              <Input label="Ім'я" placeholder="Ваше ім'я"
                value={field.state.value} onChange={e => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                error={field.state.meta.isTouched && !field.state.meta.isValid ? field.state.meta.errors.join(', ') : undefined}
                disabled={isLoading || form.state.isSubmitting} />
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
            </>
          )}
        </form.Field>

        <Button type="submit" fullWidth
          loading={isLoading || form.state.isSubmitting}
          disabled={isLoading || form.state.isSubmitting}
          className={PRIMARY_AUTH_BUTTON_CLASS}>
          Зареєструватися
        </Button>

        <div className="text-center">
          <button type="button" onClick={onSwitch}
            disabled={isLoading || form.state.isSubmitting}
            className="inline-flex items-center justify-center rounded-[14px] border border-[rgba(var(--accent-rgb),0.32)] bg-[rgba(var(--accent-rgb),0.12)] px-4 py-2 text-sm font-medium text-white shadow-[0_12px_28px_rgba(var(--accent-rgb),0.14)] transition-all duration-200 hover:-translate-y-[2px] hover:border-[rgba(var(--accent-rgb),0.46)] hover:bg-[rgba(var(--accent-rgb),0.18)] active:translate-y-0 disabled:opacity-50">
            Вже маєте акаунт? Увійти
          </button>
        </div>

      </form>
    </FormLayout>
  )
}
