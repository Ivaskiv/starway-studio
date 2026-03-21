// frontend/src/features/auth/pages/ResetPasswordPage.tsx
import { useResetPasswordMutation } from '@/features/auth/services/auth.api'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { getToastMessage } from '@/features/notifications/i18n/toast'
import { Button, Input } from '@/ui'
import { type FormEvent, useState } from 'react'
import toast from 'react-hot-toast'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

// Хелпер — кастує обидва параметри щоб не чіпати toast.ts
type ToastKey  = Parameters<typeof getToastMessage>[0]
type ToastLang = Parameters<typeof getToastMessage>[1]
const t = (key: string, lang: string) =>
  getToastMessage(key as ToastKey, lang as ToastLang)

export default function ResetPasswordPage() {
  const [searchParams]  = useSearchParams()
  const navigate        = useNavigate()
  const [resetPassword, { isLoading }] = useResetPasswordMutation()
  const { user }        = useAuth()
  const lang            = user?.settings?.language ?? 'uk'

  const initialToken    = searchParams.get('token') ?? ''
  const [token,           setToken]           = useState(initialToken)
  const [password,        setPassword]        = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!token.trim()) {
      toast.error(t('auth.resetNeedToken', lang))
      return
    }
    if (password.length < 8) {
      toast.error(t('auth.resetPasswordMinLen', lang))
      return
    }
    if (password !== confirmPassword) {
      toast.error(t('auth.resetPasswordsMismatch', lang))
      return
    }

    try {
      await resetPassword({ token: token.trim(), password }).unwrap()
      toast.success(t('auth.resetSuccess', lang))
      navigate('/?auth=login', { replace: true })
    } catch (err: unknown) {
      const e = err as { data?: { error?: string; message?: string } }
      const message = e?.data?.error === 'invalid_or_expired_reset_token'
        ? t('auth.resetTokenInvalid', lang)
        : e?.data?.message || t('auth.resetFailed', lang)
      toast.error(message)
    }
  }

  return (
    <section className="min-h-[70vh] flex items-center justify-center px-4 py-10">
      <div className="glass-card w-full max-w-md p-6 md:p-8">
        <h1 className="text-2xl font-semibold text-[color:var(--text-primary)] mb-2">
          Скидання пароля
        </h1>
        <p className="text-[color:var(--text-secondary)] text-sm mb-6">
          {initialToken
            ? 'Задайте новий пароль для вашого акаунту.'
            : 'Вставте токен з листа та задайте новий пароль.'}
        </p>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {!initialToken && (
            <Input
              label="Токен"
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="reset-token"
              disabled={isLoading}
            />
          )}
          <Input
            label="Новий пароль"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={isLoading}
          />
          <Input
            label="Підтвердіть пароль"
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Збереження...' : 'Зберегти новий пароль'}
          </Button>
        </form>

        <Link
          to="/"
          className="inline-block mt-5 text-sm text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)] underline underline-offset-4 transition-colors"
        >
          Повернутись на вхід
        </Link>
      </div>
    </section>
  )
}
