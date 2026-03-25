import { useAuth } from '@/features/auth/hooks/useAuth'
import { usePostAuthNavigation } from '@/features/auth/hooks/usePostAuthNavigation'
import { Button } from '@/ui'
import { useState } from 'react'
import toast from 'react-hot-toast'

interface Props {
  onEmailLogin?: () => void
}

export function LandingAuthActions({ onEmailLogin }: Props) {
  const { loginWithSocial, canUseSocialProvider } = useAuth()
  const postAuthNavigate = usePostAuthNavigation()
  const [pendingProvider, setPendingProvider] = useState<'google' | 'telegram' | null>(null)

  const handleSocialLogin = async (provider: 'google' | 'telegram') => {
    setPendingProvider(provider)
    try {
      const result = await loginWithSocial(provider)
      await postAuthNavigate({ email: result.email ?? null })
    } catch (error) {
      console.error('[LandingAuthActions] social login failed', error)
      toast.error(provider === 'google' ? 'Не вдалося увійти через Google' : 'Не вдалося увійти через Telegram')
    } finally {
      setPendingProvider(null)
    }
  }

  return (
    <div className="card-surface liquid-glass mx-auto mt-6 max-w-3xl p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
        {canUseSocialProvider('google') && (
          <Button onClick={() => handleSocialLogin('google')} disabled={pendingProvider !== null}>
            {pendingProvider === 'google' ? 'Google...' : 'Продовжити через Google'}
          </Button>
        )}
        {canUseSocialProvider('telegram') && (
          <Button onClick={() => handleSocialLogin('telegram')} disabled={pendingProvider !== null} variant="outline">
            {pendingProvider === 'telegram' ? 'Telegram...' : 'Продовжити через Telegram'}
          </Button>
        )}
      </div>
    </div>
  )
}
