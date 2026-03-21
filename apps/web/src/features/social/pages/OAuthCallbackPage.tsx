// frontend/src/features/social/pages/OAuthCallbackPage.tsx
// FIX: mapSafeUserToUser — abilities cast через as Ability[]
// (після виправлення abilities.ts це більше не потрібно,
//  але залишаємо cast для надійності якщо тип ще не оновився)

import { useAppDispatch }           from '@/app/hooks'
import { setCredentials }           from '@/features/auth/services/auth.slice'
import type { Ability }             from '@/features/auth/permissions/abilities'
import { saveToken }                from '@/features/auth/services/token'
import type { User }                from '@/features/user/types/user.types'
import type { SafeUser }            from '@/types/globalTypes'
import { GlassCard }                from '@/ui'
import { Loader }                   from 'lucide-react'
import { useEffect }                from 'react'
import toast                        from 'react-hot-toast'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useSocialCallbackMutation } from '../services/social.api'
import { parseSocialFlow }          from '../utils/social.utils'

const mapSafeUserToUser = (safeUser: SafeUser): User => ({
  ...safeUser,
  subscriptionStatus: safeUser.subscriptionStatus as User['subscriptionStatus'],
  subscriptionPlan:   safeUser.subscriptionPlan   as User['subscriptionPlan'],
  // FIX: бекенд повертає string[] — кастуємо до Ability[] (сумісно після виправлення типу)
  abilities: (safeUser.abilities ?? []) as Ability[],
})

export default function OAuthCallbackPage() {
  const navigate         = useNavigate()
  const [searchParams]   = useSearchParams()
  const dispatch         = useAppDispatch()
  const [socialCallback] = useSocialCallbackMutation()

  useEffect(() => {
    const processCallback = async () => {
      const { mode } = parseSocialFlow(searchParams)
      const code  = searchParams.get('code')
      const error = searchParams.get('error')

      if (error) {
        toast.error(`Помилка авторизації: ${error}`)
        navigate(mode === 'connect' ? '/settings/connections' : '/login', { replace: true })
        return
      }

      if (!code) {
        toast.error('Неправильні параметри авторизації')
        navigate(mode === 'connect' ? '/settings/connections' : '/login', { replace: true })
        return
      }

      try {
        toast.loading('Завершення авторизації...', { id: 'oauth' })

        const response = await socialCallback({ code }).unwrap()

        saveToken(response.accessToken)
        dispatch(setCredentials({
          user:        mapSafeUserToUser(response.user),
          accessToken: response.accessToken,
        }))

        toast.success('Авторизація успішна!', { id: 'oauth' })
        navigate(mode === 'connect' ? '/settings/connections' : '/dashboard', { replace: true })

      } catch (err: any) {
        console.error('OAuth callback error:', err)
        toast.error(err?.data?.message || 'Помилка авторизації', { id: 'oauth' })
        navigate(mode === 'connect' ? '/settings/connections' : '/login', { replace: true })
      }
    }

    processCallback()
  }, [searchParams, navigate, socialCallback, dispatch])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 to-black">
      <GlassCard className="p-12 flex flex-col items-center gap-6">
        <Loader className="w-12 h-12 animate-spin text-[color:var(--accent)]" />
        <h2 className="text-2xl font-bold text-[color:var(--text-primary)]">Обробка авторизації...</h2>
        <p className="text-[color:var(--text-muted)]">Будь ласка, зачекайте</p>
      </GlassCard>
    </div>
  )
}