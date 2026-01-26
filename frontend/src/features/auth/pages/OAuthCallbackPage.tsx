import { useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Loader } from 'lucide-react'
import toast from 'react-hot-toast'
import { GlassCard } from '@/ui'
import { SocialPlatform } from '@/shared/constants/socialPlatforms.constants'
import { useSocialLoginMutation } from '@/services/social.api'
import { AuthResponse } from '@/shared/types/user.types'

export default function OAuthCallbackPage() {
  const navigate = useNavigate()
  const { provider } = useParams<{ provider: SocialPlatform }>()
  const [searchParams] = useSearchParams()
  const [socialLogin] = useSocialLoginMutation()

useEffect(() => {
  const processCallback = async () => {
    console.log('🌐 OAuthCallbackPage mounted', { provider, searchParams: Object.fromEntries(searchParams) })
    
    if (!provider) {
      console.error('❌ No provider specified')
      toast.error('Помилка авторизації')
      navigate('/')
      return
    }

    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    console.log('🔄 OAuth params', { code, state, error })

    if (error) {
      console.error(`❌ ${provider} auth error:`, error)
      toast.error(`Помилка авторизації: ${error}`)
      navigate('/')
      return
    }

    if (!code) {
      console.error('❌ No authorization code')
      toast.error('Відсутній код авторизації')
      navigate('/')
      return
    }

    try {
      console.log('⚡ Calling backend social login', { provider, externalId: code })
      const response: AuthResponse = await socialLogin({ provider, externalId: code }).unwrap()
      console.log('✅ Social login response', response)
      localStorage.setItem('auth_token', response.tokens.accessToken)
      toast.success(`Вхід через ${provider} успішний! 👋`)
      navigate('/dashboard')
    } catch (err: any) {
      console.error('❌ Social login backend error', err)
      toast.error(err?.data?.message || 'Помилка авторизації')
      navigate('/')
    }
  }


    processCallback()
  }, [provider, searchParams, navigate, socialLogin])

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <GlassCard className="p-10 flex flex-col items-center gap-4">
        <Loader className="w-10 h-10 animate-spin text-orange-500" />
        <p className="text-white/60">Обробка авторизації через {provider}...</p>
      </GlassCard>
    </div>
  )
}
