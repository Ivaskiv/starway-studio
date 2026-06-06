// frontend/src/features/auth/components/RegisterForm.tsx
// ✓ showPasswordToggle в Input — прибрано окремі кнопки show/hide

import { getToastMessage, type ToastLang } from '@/features/notifications/i18n/toast'
import { Button, Input }        from '@/ui'
import { useForm, type AnyFieldApi } from '@tanstack/react-form'
import toast                    from 'react-hot-toast'
import { useRegisterMutation }  from '../services/auth.api'
import { FormLayout }           from './FormLayout'

function getTurnstileToken() {
  if (typeof window === 'undefined') return ''
  const tokenFromWindow = (window as Window & { __STARWAY_TURNSTILE_TOKEN__?: string }).__STARWAY_TURNSTILE_TOKEN__
  return String(tokenFromWindow ?? '').trim()
}

function getTelegramRuntimeUserId(): string | null {
  if (typeof window === 'undefined') return null
  const telegramUser = (window as {
    Telegram?: {
      WebApp?: {
        initDataUnsafe?: {
          user?: { id?: number }
        }
      }
    }
  }).Telegram?.WebApp?.initDataUnsafe?.user

  return telegramUser?.id ? String(telegramUser.id) : null
}

interface Props {
  email?:    string
  name?:     string
  onSwitch:  () => void
  onSuccess: (credentials?: { email: string; password: string }) => void
}

const PRIMARY_AUTH_BUTTON_CLASS = 'rounded-xl border border-white/10 bg-[#1E293B] px-5 py-2.5 font-semibold text-white transition-all duration-200 hover:scale-[1.02] hover:bg-[#243041] active:scale-[0.98] active:bg-[#0F172A] disabled:cursor-not-allowed disabled:opacity-40'

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
  const lang: ToastLang = 'uk'
  const [registerUser, { isLoading }] = useRegisterMutation()
  const isSocialEmail = !!initialEmail

  const form = useForm({
    defaultValues: { name: initialName, email: initialEmail, password: '', confirmPassword: '', companyWebsite: '' },
    onSubmit: async ({ value }) => {
      try {
        const response = await registerUser({
          email: value.email.trim(),
          password: value.password,
          name: value.name.trim(),
          companyWebsite: value.companyWebsite,
          turnstileToken: getTurnstileToken(),
          telegramId: getTelegramRuntimeUserId(),
        }).unwrap()
        if (response.accessToken) onSuccess({ email: value.email, password: value.password })
        else onSuccess()
      } catch (err: any) {
        toast.error(
          err?.data?.error === 'bot_detected'
            ? 'Схоже на автоматичну спробу. Спробуй ще раз.'
            : err?.data?.error === 'human_verification_required' || err?.data?.error === 'human_verification_failed'
              ? 'Потрібно підтвердити, що ти не бот.'
            : err?.data?.error === 'email_already_registered'
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

        <form.Field name="companyWebsite">
          {field => (
            <input
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={field.state.value}
              onChange={e => field.handleChange(e.target.value)}
              className="absolute left-[-9999px] top-0 h-0 w-0 opacity-0 pointer-events-none"
            />
          )}
        </form.Field>

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
