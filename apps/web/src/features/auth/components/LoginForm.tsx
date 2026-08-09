// frontend/src/features/auth/components/LoginForm.tsx
// ✓ showPasswordToggle перенесено в Input — тут більше немає окремої кнопки
import { FormLayout }           from './FormLayout'
import {
  useLoginMutation,
  useForgotPasswordMutation,
}                               from '@/features/auth/services/auth.api'
import { getToastMessage, type ToastLang } from '@/features/notifications/i18n/toast'
import { Button, Input }        from '@/ui'
import { useForm } from '@tanstack/react-form'
import { useMemo, type FormEvent } from 'react'
import { useState }             from 'react'
import toast                    from 'react-hot-toast'
import { useNavigate }          from 'react-router-dom'

function getTurnstileToken() {
  if (typeof window === 'undefined') return ''
  const tokenFromWindow = (window as Window & { __STARWAY_TURNSTILE_TOKEN__?: string }).__STARWAY_TURNSTILE_TOKEN__
  return String(tokenFromWindow ?? '').trim()
}

interface Props {
  onSuccess: () => void
  onSwitch: () => void
  initialEmail?: string
  initialPassword?: string
}
type Mode = 'login' | 'forgot'

const PRIMARY_AUTH_BUTTON_CLASS = 'rounded-xl border border-white/10 bg-[#1E293B] px-5 py-2.5 font-semibold text-white transition-all duration-200 hover:scale-[1.02] hover:bg-[#243041] active:scale-[0.98] active:bg-[#0F172A] disabled:cursor-not-allowed disabled:opacity-40'
const SECONDARY_AUTH_BUTTON_CLASS = 'rounded-xl border border-white/12 bg-transparent px-5 py-2.5 font-medium text-white/70 transition-all duration-200 hover:scale-[1.02] hover:bg-white/5 hover:text-white active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40'

export function LoginForm({
  onSuccess,
  onSwitch,
  initialEmail = '',
  initialPassword = '',
}: Props) {
  const [mode, setMode]           = useState<Mode>('login')
  const [resetEmail, setResetEmail] = useState('')
  const navigate                  = useNavigate()

  const lang: ToastLang = 'uk'

  const [login,          { isLoading: isLoginLoading   }] = useLoginMutation()
  const [forgotPassword, { isLoading: isForgotLoading  }] = useForgotPasswordMutation()
  const anyLoading = isLoginLoading || isForgotLoading

  const forgotHint = useMemo(
    () => 'Введіть email. Якщо акаунт існує, буде створено токен для скидання пароля.',
    [],
  )

  const form = useForm({
    defaultValues: { email: initialEmail, password: initialPassword, remember: true, companyWebsite: '' },
    onSubmit: async ({ value }) => {
      try {
        const expertId = resolveExpertId()
        await login({
          email: value.email.trim(),
          password: value.password,
          companyWebsite: value.companyWebsite,
          turnstileToken: getTurnstileToken(),
          ...(expertId ? { expertId } : {}),
        }).unwrap()
        toast.success(getToastMessage('auth.loginSuccess', lang))
        onSuccess()
      } catch (err: any) {
        const message =
          err?.data?.error === 'bot_detected'
            ? 'Схоже на автоматичну спробу. Спробуй ще раз.'
            : err?.data?.error === 'human_verification_required' || err?.data?.error === 'human_verification_failed'
              ? 'Потрібно підтвердити, що ти не бот.'
            : err?.data?.error === 'auth_db_unavailable'
              ? 'Сервер тимчасово не має доступу до бази даних. Спробуй трохи пізніше.'
            :
          err?.data?.error === 'invalid_credentials'
            ? getToastMessage('auth.loginInvalidCredentials', lang)
            : err?.data?.message || getToastMessage('auth.loginFailed', lang)
        toast.error(message)
      }
    },
  })

  const handleForgotSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!resetEmail || !resetEmail.includes('@')) {
      toast.error(getToastMessage('auth.forgotInvalidEmail', lang)); return
    }
    try {
      const response = await forgotPassword({ email: resetEmail }).unwrap()
      if (response.emailSent) {
        toast.success(getToastMessage('auth.forgotEmailSent', lang))
      } else if (response.resetUrl) {
        toast.success(getToastMessage('auth.forgotNoMailProvider', lang))
        navigate(response.resetUrl.replace(window.location.origin, ''), { replace: true })
      } else {
        toast(getToastMessage('auth.forgotGeneric', lang))
      }
    } catch (err: any) {
      toast.error(err?.data?.message || getToastMessage('auth.forgotFailed', lang))
    }
  }

  if (mode === 'forgot') {
    return (
      <FormLayout title="Скидання пароля" subtitle={forgotHint}>
        <form onSubmit={handleForgotSubmit} className="flex flex-col gap-4">
          <Input
            label="Email" type="email"
            value={resetEmail} onChange={e => setResetEmail(e.target.value)}
            placeholder="your@email.com" disabled={anyLoading}
          />
          <Button type="submit" fullWidth disabled={anyLoading} className={PRIMARY_AUTH_BUTTON_CLASS}>
            {anyLoading ? 'Завантаження...' : 'Надіслати запит'}
          </Button>
          <Button type="button" onClick={() => setMode('login')} disabled={anyLoading}
            fullWidth
            className={SECONDARY_AUTH_BUTTON_CLASS}>
            Назад до входу
          </Button>
        </form>
      </FormLayout>
    )
  }

  return (
    <FormLayout title="Увійти" subtitle="Введіть ваші дані">
      <form onSubmit={e => { e.preventDefault(); form.handleSubmit() }} className="flex flex-col gap-4">

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

        <form.Field
          name="email"
          validators={{
            onChange: ({ value }) =>
              !value ? 'Email обовʼязковий' : !value.includes('@') ? 'Невірний формат email' : undefined,
          }}
        >
          {field => (
            <Input
              label="Email" value={field.state.value}
              onChange={e => field.handleChange(e.target.value)}
              onBlur={field.handleBlur} disabled={anyLoading}
              error={field.state.meta.isTouched && !field.state.meta.isValid
                ? field.state.meta.errors.join(', ') : undefined}
            />
          )}
        </form.Field>

        <form.Field
          name="password"
          validators={{ onChange: ({ value }) => (!value ? 'Пароль обовʼязковий' : undefined) }}
        >
          {field => (
            <Input
              label="Пароль"
              type="password"
              value={field.state.value}
              onChange={e => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              disabled={anyLoading}
              error={field.state.meta.isTouched && !field.state.meta.isValid
                ? field.state.meta.errors.join(', ') : undefined}
            />
          )}
        </form.Field>

        <div className="flex justify-end text-[13px] text-white/70">
          <button type="button" onClick={() => setMode('forgot')} className="underline" disabled={anyLoading}>
            Забули пароль?
          </button>
        </div>

        <Button
          type="submit"
          fullWidth
          disabled={anyLoading || form.state.isSubmitting}
          className={PRIMARY_AUTH_BUTTON_CLASS}
        >
          {anyLoading ? 'Завантаження...' : 'Увійти'}
        </Button>

        <div className="text-center mt-2">
          <button
            type="button"
            onClick={onSwitch}
            className="inline-flex items-center justify-center rounded-[14px] border border-[rgba(var(--accent-rgb),0.32)] bg-[rgba(var(--accent-rgb),0.12)] px-4 py-2 text-sm font-medium text-white shadow-[0_12px_28px_rgba(var(--accent-rgb),0.14)] transition-all duration-200 hover:-translate-y-[2px] hover:border-[rgba(var(--accent-rgb),0.46)] hover:bg-[rgba(var(--accent-rgb),0.18)] active:translate-y-0"
          >
            Створити акаунт
          </button>
        </div>
      </form>
    </FormLayout>
  )
}

function resolveExpertId(): string | undefined {
  const search = new URLSearchParams(window.location.search)
  return (
    search.get('expertId')?.trim() ||
    localStorage.getItem('expertId')?.trim() ||
    import.meta.env.VITE_EXPERT_ID?.trim() ||
    undefined
  )
}
