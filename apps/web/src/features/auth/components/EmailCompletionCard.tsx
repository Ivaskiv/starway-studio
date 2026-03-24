import type { AppDispatch } from '@/app/store'
import { useAttachEmailMutation } from '@/features/auth/services/auth.api'
import { syncAuthSession } from '@/features/auth/utils/sessionSync'
import { useThemeContext } from '@/theme/ThemeProvider'
import { Button, Input } from '@/ui'
import { useState, type FormEvent } from 'react'
import toast from 'react-hot-toast'
import { useDispatch } from 'react-redux'

interface Props {
  onCompleted?: () => Promise<unknown> | unknown
}

export function EmailCompletionCard({ onCompleted }: Props) {
  const [email, setEmail] = useState('')
  const dispatch = useDispatch<AppDispatch>()
  const theme = useThemeContext()
  const [attachEmail, { isLoading }] = useAttachEmailMutation()

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      toast.error('Введіть коректний email')
      return
    }

    try {
      await attachEmail({ email: normalizedEmail }).unwrap()
      await syncAuthSession({
        allowRefreshWithoutHint: true,
        dispatch,
        theme,
      })
      await onCompleted?.()
      toast.success('Email збережено')
    } catch (error: any) {
      const message =
        error?.data?.error === 'EMAIL_TAKEN' || error?.data?.error === 'email_exists'
          ? 'Цей email уже використовується'
          : 'Не вдалося зберегти email'
      toast.error(message)
    }
  }

  return (
    <div className="card-surface liquid-glass mx-auto max-w-xl p-6 sm:p-8">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[rgb(var(--accent-soft-rgb))]">
          Завершіть профіль
        </p>
        <h2 className="text-2xl font-bold text-white">Введіть email</h2>
        <p className="text-sm leading-6 text-white/65">
          Потрібно додати email перед продовженням шляху в AI-менторі.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={event => setEmail(event.target.value)}
          placeholder="you@example.com"
          disabled={isLoading}
        />

        <Button type="submit" disabled={isLoading} fullWidth>
          {isLoading ? 'Збереження...' : 'Продовжити'}
        </Button>
      </form>
    </div>
  )
}
