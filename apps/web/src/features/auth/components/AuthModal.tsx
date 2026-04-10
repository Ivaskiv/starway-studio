// frontend/src/features/auth/components/AuthModal.tsx
import { X } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../hooks/useAuth'
import { LoginForm } from './LoginForm'
import { RegisterForm } from './RegisterForm'
import { usePostAuthNavigation } from '../hooks/usePostAuthNavigation'
import { getToastMessage, type ToastLang } from '@/features/notifications/i18n/toast'
import toast from 'react-hot-toast'

type Mode = 'login' | 'register'
interface Props { isOpen: boolean; onClose: () => void; defaultMode?: Mode }

export default function AuthModal({ isOpen, onClose, defaultMode = 'login' }: Props) {
  const { loginWithSocial, canUseSocialProvider } = useAuth()
  const lang: ToastLang = 'uk'
  const postAuthNavigate = usePostAuthNavigation()

  const [mode, setMode] = useState<Mode>(defaultMode)
  const [isProcessing, setIsProcessing] = useState(false)
  const [loginPrefill, setLoginPrefill] = useState<{ email: string; password: string } | null>(null)
  const formKey = useRef(0)

  useEffect(() => {
    if (!isOpen) {
      setMode(defaultMode)
      setIsProcessing(false)
      setLoginPrefill(null)
      formKey.current += 1
    }
  }, [isOpen, defaultMode])

  useEffect(() => {
    // Lock body scroll while the modal is open so the background content stays fixed.
    document.body.classList.toggle('overflow-hidden', isOpen)

    return () => {
      document.body.classList.remove('overflow-hidden')
    }
  }, [isOpen])

  const handleSocial = async (provider: 'google' | 'telegram') => {
    setIsProcessing(true)
    try {
      await loginWithSocial(provider)
      toast.success(getToastMessage('auth.socialSuccess', lang))
      onClose()
      await postAuthNavigate()
    } catch (err) {
      const message = err instanceof Error && err.message.includes('VITE_GOOGLE_CLIENT_ID not configured')
        ? getToastMessage('auth.socialGoogleNotConfigured', lang)
        : err instanceof Error && err.message.includes('Telegram social auth unavailable')
          ? 'Telegram-вхід доступний лише з Telegram WebApp'
          : getToastMessage('auth.socialGenericError', lang)
      toast.error(message)
    } finally { setIsProcessing(false) }
  }

  const showGoogleSocial = canUseSocialProvider('google')
  const showTelegramSocial = canUseSocialProvider('telegram')
  const showSocialSection = showGoogleSocial || showTelegramSocial

  const handleRegisterSuccess = (credentials?: { email: string; password: string }) => {
    setMode('login')
    setLoginPrefill(credentials ?? null)
    formKey.current += 1
    toast.success(getToastMessage('auth.registerSuccess', lang))
  }

  const switchMode = () => {
    setMode(prev => prev === 'login' ? 'register' : 'login')
    setLoginPrefill(null)
    formKey.current += 1
  }

  if (!isOpen) return null

  return (
    <div
      className="modal-overlay animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md animate-scaleFadeIn"
        onClick={e => e.stopPropagation()}
      >
        <div className="auth-modal-shell relative overflow-hidden rounded-[30px]">
          <div className="pointer-events-none absolute inset-[1px] rounded-[29px] border border-[rgba(255,255,255,.05)]" />
          <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/85 to-transparent opacity-80" />

          {/* Close button */}
          <div className="flex justify-end px-6 pt-5 relative z-10">
            <button onClick={onClose} disabled={isProcessing} aria-label="Закрити"
              className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-[rgba(255,255,255,.16)] bg-[linear-gradient(180deg,rgba(255,255,255,.12),rgba(var(--accent-rgb),.08))] text-white/65 shadow-[0_6px_18px_rgba(0,0,0,.22),0_0_22px_rgba(var(--accent-rgb),.08)] hover:bg-[linear-gradient(180deg,rgba(255,255,255,.18),rgba(var(--accent-rgb),.14))] hover:text-white hover:border-[rgba(var(--accent-rgb),.42)] hover:shadow-[0_0_0_4px_rgba(var(--accent-rgb),.10),0_10px_24px_rgba(0,0,0,.28)] transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Forms */}
          <div className="px-8 pt-3 pb-8 space-y-6 relative z-10">
            {mode === 'login' ? (
              <LoginForm
                key={`login-${formKey.current}`}
                onSwitch={switchMode}
                onSuccess={() => { onClose(); void postAuthNavigate() }}
                initialEmail={loginPrefill?.email}
                initialPassword={loginPrefill?.password}
              />
            ) : (
              <RegisterForm key={`register-${formKey.current}`} onSwitch={switchMode} onSuccess={handleRegisterSuccess} />
            )}

            {showSocialSection && (
              <>
                {/* <div className="relative flex items-center my-4">
                  <span className="px-3 text-xs text-white/40">або продовжити через</span>
                  <div className="absolute inset-0 flex items-center">
                    <div className="flex-1 h-px bg-white/8"></div>
                  </div>
                </div> */}
                {/* <div className="grid grid-cols-2 gap-3">
                  {showGoogleSocial ? (
                    <Button variant="outline" onClick={() => handleSocial('google')} disabled={isProcessing}>Google</Button>
                  ) : <div />}
                  {showTelegramSocial ? (
                    <Button variant="outline" onClick={() => handleSocial('telegram')} disabled={isProcessing}>Telegram</Button>
                  ) : <div />}
                </div> */}
              </>
            )}
          </div>

          {/* Processing overlay */}
          {isProcessing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-[30px] bg-[linear-gradient(180deg,rgba(9,10,16,.88),rgba(7,8,12,.94))] z-20">
              <div className="w-11 h-11 border-3 border-[rgb(var(--accent-rgb))] border-t-transparent rounded-full animate-spin shadow-[0_0_24px_rgba(var(--accent-rgb),.28)]" />
              <p className="text-white/70 text-sm">Обробка...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
