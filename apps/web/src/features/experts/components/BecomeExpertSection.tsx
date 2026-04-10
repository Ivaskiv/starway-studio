import type { SerializedError } from '@reduxjs/toolkit'
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query'
import { useState } from 'react'
import { GlassCard } from '@/ui'
import { useRegisterExpertBotMutation } from '@/features/experts/services/experts.api'

type BecomeExpertStep = 'info' | 'form' | 'success'

export default function BecomeExpertSection() {
  const [step, setStep]             = useState<BecomeExpertStep>('info')
  const [token, setToken]           = useState('')
  const [showToken, setShowToken]   = useState(false)
  const [name, setName]             = useState('')
  const [specialty, setSpecialty]   = useState('')
  const [bio, setBio]               = useState('')

  type RegisterMutationState = {
    isLoading: boolean
    error?: FetchBaseQueryError | SerializedError
  }

  const [registerBot, registerState] = useRegisterExpertBotMutation()
  const registerResult = registerState as RegisterMutationState
  const isLoading = registerResult.isLoading
  const error = registerResult.error

  const handleSubmit = async () => {
    if (!token.trim() || !name.trim()) return
    try {
      await registerBot({
        botToken: token.trim(),
        displayName: name.trim(),
        specialty: specialty.trim() || undefined,
        bio: bio.trim() || undefined,
      }).unwrap()
      setStep('success')
    } catch {
      // error surfaced via mutation state
    }
  }

  const errorMessage = (() => {
    if (!error) return undefined
    const fetchError = error as FetchBaseQueryError
    const hasPayload = typeof fetchError === 'object' && fetchError !== null && 'data' in fetchError
    if (hasPayload) {
      const payload = fetchError.data
      if (
        payload &&
        typeof payload === 'object' &&
        'error' in payload
      ) {
        return String((payload as { error?: string }).error ?? 'Помилка. Перевір токен.')
      }
    }
    const serialized = error as SerializedError
    return serialized?.message ?? 'Помилка. Спробуй пізніше.'
  })()

  if (step === 'success') {
    return (
      <GlassCard className="p-6 space-y-3 border border-[color:var(--border-primary)] bg-[color:var(--glass-bg)]">
        <h3 className="text-lg font-semibold text-[color:var(--text-primary)]">✅ Ти тепер Ментор!</h3>
        <p className="text-sm text-[color:var(--text-secondary)]">
          Твій бот активний. Перехід до кабінету ментора відкрито.
        </p>
        <a
          href="/dashboard/expert"
          className="btn-primary inline-flex items-center justify-center px-5 py-3 rounded-xl text-xs font-semibold uppercase tracking-wide"
        >
          Відкрити кабінет ментора →
        </a>
      </GlassCard>
    )
  }

  if (step === 'info') {
    return (
      <GlassCard className="p-6 space-y-4 border border-[color:var(--border-primary)] bg-[color:var(--glass-bg)]">
        <div>
          <h3 className="text-lg font-semibold text-[color:var(--text-primary)]">🤖 Стати ментором</h3>
          <p className="text-sm text-[color:var(--text-secondary)] mt-1">
            Підключи власного Telegram-бота і з'явись у списку менторів. Твої студенти зможуть отримати ментора від тебе.
          </p>
        </div>
        <button
          className="btn-primary inline-flex items-center justify-center px-5 py-3 rounded-xl text-xs font-semibold uppercase tracking-wide"
          onClick={() => setStep('form')}
        >
          Зареєструвати бота
        </button>
      </GlassCard>
    )
  }

  return (
    <GlassCard className="p-6 space-y-4 border border-[color:var(--border-primary)] bg-[color:var(--glass-bg)]">
      <div>
        <h3 className="text-lg font-semibold text-[color:var(--text-primary)]">🤖 Підключення бота</h3>
        <p className="text-sm text-[color:var(--text-secondary)] mt-1">
          Отримай токен від <strong>@BotFather</strong> та заповни форму. Ми з'єднаємо твій бот з платформою.
        </p>
      </div>

      <ol className="list-decimal list-inside space-y-1 text-sm text-[color:var(--text-secondary)]">
        <li>Відкрий <strong>@BotFather</strong> у Telegram</li>
        <li>Надішли <code>/newbot</code>, дай ім’я та отримай токен</li>
        <li>Встав токен у форму нижче</li>
      </ol>

      <div className="flex items-center gap-2">
        <input
          className="input-glass flex-1"
          type={showToken ? 'text' : 'password'}
          placeholder="1234567890:AAFxxxxxxxxxxxxxxx"
          value={token}
          onChange={e => setToken(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="button"
          className="btn-secondary px-3 py-2 rounded-xl text-xs"
          onClick={() => setShowToken(s => !s)}
        >
          {showToken ? '🙈' : '👁'}
        </button>
      </div>

      <input
        className="input-glass"
        placeholder="Твоє ім'я як ментора *"
        value={name}
        onChange={e => setName(e.target.value)}
      />

      <input
        className="input-glass"
        placeholder="Спеціалізація (напр. нутриціологія)"
        value={specialty}
        onChange={e => setSpecialty(e.target.value)}
      />

      <textarea
        className="input-glass min-h-[90px]"
        placeholder="Про себе (необов'язково)"
        value={bio}
        onChange={e => setBio(e.target.value)}
        rows={3}
      />

      <div className="flex items-center gap-3">
        <button
          className="btn-secondary px-4 py-2 rounded-xl text-xs tracking-wide uppercase"
          onClick={() => setStep('info')}
          disabled={isLoading}
        >
          Назад
        </button>
        <button
          className="btn-primary px-4 py-2 rounded-xl text-xs font-semibold tracking-wide uppercase"
          onClick={handleSubmit}
          disabled={isLoading || !token.trim() || !name.trim()}
        >
          {isLoading ? 'Перевіряємо токен...' : 'Підключити і стати ментором'}
        </button>
      </div>

      {errorMessage && (
        <p className="text-sm text-[color:var(--accent-muted)]">{errorMessage}</p>
      )}
    </GlassCard>
  )
}
