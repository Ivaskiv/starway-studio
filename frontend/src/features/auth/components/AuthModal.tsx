// frontend/src/features/auth/components/AuthModal.tsx
// Liquid Glass modal — без backdrop-filter, без inline style={{}}
// Класи: modal-overlay · modal-glass · modal-close · modal-divider · modal-processing

import { useAppDispatch } from '@/app/hooks'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { saveToken } from '@/features/auth/services/token'
import type { SocialPlatform } from '@/features/social/types/social.types'
import { getToastMessage, type ToastLang } from '@/shared/i18n/toast'
import { hasSavedAccentColor } from '@/theme/accent.utils'
import { Button } from '@/ui'
import { X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { useLoginMutation } from '../services/auth.api'
import { setCredentials } from '../services/auth.slice'
import { LoginForm } from './LoginForm'
import { RegisterForm } from './RegisterForm'

type Mode = 'login' | 'register'
interface SocialData { provider: SocialPlatform; name?: string; email?: string }
interface Props { isOpen: boolean; onClose: () => void; defaultMode?: Mode }

export default function AuthModal({ isOpen, onClose, defaultMode = 'login' }: Props) {
  const navigate        = useNavigate()
  const dispatch        = useAppDispatch()
  const { loginWithSocial, user } = useAuth()
  const lang            = (user?.settings?.language ?? 'uk') as ToastLang
  const [loginMutation] = useLoginMutation()

  const [mode,          setMode]          = useState<Mode>(defaultMode)
  const [socialData,    setSocialData]    = useState<SocialData | null>(null)
  const [isProcessing,  setIsProcessing]  = useState(false)
  const [autoLoginData, setAutoLoginData] = useState<{ email: string; password: string } | null>(null)
  const formKey = useRef(0)

  useEffect(() => {
    if (!isOpen) {
      setMode(defaultMode); setSocialData(null)
      setIsProcessing(false); setAutoLoginData(null)
      formKey.current += 1
    }
  }, [isOpen, defaultMode])

  useEffect(() => { if (autoLoginData) performAutoLogin() }, [autoLoginData])

  const performAutoLogin = async () => {
    if (!autoLoginData) return
    try {
      const expertId = window.localStorage.getItem('expertId')?.trim() || import.meta.env.VITE_EXPERT_ID?.trim()
      const response = await loginMutation({ ...autoLoginData, ...(expertId ? { expertId } : {}) }).unwrap()
      saveToken(response.accessToken)
      dispatch(setCredentials({ user: response.user as any, accessToken: response.accessToken }))
      toast.success(getToastMessage('auth.autoLoginSuccess', lang))
      onClose(); navigate('/dashboard', { replace: true })
    } catch {
      toast.error(getToastMessage('auth.autoLoginFailed', lang))
      setMode('login')
    } finally { setAutoLoginData(null) }
  }

  const handleSocial = async (provider: SocialPlatform) => {
    setIsProcessing(true)
    try {
      await loginWithSocial(provider)
      toast.success(getToastMessage('auth.socialSuccess', lang))
      onClose(); navigate('/dashboard', { replace: true })
    } catch (err) {
      const message = err instanceof Error && err.message === 'VITE_GOOGLE_CLIENT_ID not configured'
        ? getToastMessage('auth.socialGoogleNotConfigured', lang)
        : getToastMessage('auth.socialGenericError', lang)
      toast.error(message)
    } finally { setIsProcessing(false) }
  }

  const handleRegisterSuccess = (credentials?: { email: string; password: string }) => {
    toast.success(getToastMessage('auth.registerSuccess', lang))
    if (credentials) { setAutoLoginData(credentials) }
    else { setMode('login'); formKey.current += 1 }
  }

  const handleLoginSuccess = () => {
    onClose()
    navigate(hasSavedAccentColor() ? '/dashboard' : '/dashboard/settings?accent=1', { replace: true })
  }

  const switchMode = () => {
    setMode(prev => prev === 'login' ? 'register' : 'login')
    setSocialData(null); formKey.current += 1
  }

  if (!isOpen) return null

  return (
    // Overlay — без backdrop-filter (Safari safe), multi-layer gradient
    <div className="modal-overlay" onClick={onClose}>

      {/* Glass frame — зупиняємо propagation */}
      <div className="modal-glass" onClick={e => e.stopPropagation()}>

        {/* Close row */}
        <div className="flex items-center justify-end px-6 pt-5 pb-0 relative z-10">
          <button
            onClick={onClose}
            disabled={isProcessing}
            aria-label="Закрити"
            className="modal-close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-8 pt-3 pb-8 space-y-6 relative z-10">

          {mode === 'login' ? (
            <LoginForm
              key={`login-${formKey.current}`}
              onSwitch={switchMode}
              onSuccess={handleLoginSuccess}
            />
          ) : (
            <RegisterForm
              key={`register-${formKey.current}`}
              email={socialData?.email}
              name={socialData?.name}
              onSwitch={switchMode}
              onSuccess={handleRegisterSuccess}
            />
          )}

          {/* Social auth */}
          {mode === 'login' && (
            <>
              <div className="modal-divider">
                <span className="modal-divider__label">або продовжити з</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => handleSocial('google')}
                  disabled={isProcessing}
                  className="border-white/15 bg-white/[.04] hover:bg-white/[.08] text-white/70 hover:text-white transition-all"
                >
                  Google
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleSocial('telegram')}
                  disabled={isProcessing}
                  className="border-white/15 bg-white/[.04] hover:bg-white/[.08] text-white/70 hover:text-white transition-all"
                >
                  Telegram
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Processing overlay */}
        {isProcessing && (
          <div className="modal-processing">
            <div className="w-11 h-11 border-[3px] border-[rgb(var(--accent-rgb))] border-t-transparent rounded-full animate-spin" />
            <p className="text-white/70 text-sm">Обробка...</p>
          </div>
        )}

      </div>
    </div>
  )
}
