// frontend/src/features/auth/components/AuthModal.tsx
import { X } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { Button } from '@/ui'
import { useAppDispatch } from '@/app/hooks'
import { setCredentials } from '../services/auth.slice'
import { useLoginMutation } from '../services/auth.api'
import { saveToken } from '../services/token'
import { LoginForm } from './LoginForm'
import { RegisterForm } from './RegisterForm'
import { useAuth } from '../hooks/useAuth'
import { usePostAuthNavigation } from '../hooks/usePostAuthNavigation'
import { getToastMessage, type ToastLang } from '@/shared/i18n/toast'
import toast from 'react-hot-toast'

type Mode = 'login' | 'register'
interface Props { isOpen: boolean; onClose: () => void; defaultMode?: Mode }

export default function AuthModal({ isOpen, onClose, defaultMode = 'login' }: Props) {
  const dispatch        = useAppDispatch()
  const { user, loginWithSocial } = useAuth()
  const lang            = (user?.settings?.language ?? 'uk') as ToastLang
  const [loginMutation] = useLoginMutation()
  const postAuthNavigate = usePostAuthNavigation()

  const [mode, setMode] = useState<Mode>(defaultMode)
  const [isProcessing, setIsProcessing] = useState(false)
  const [autoLoginData, setAutoLoginData] = useState<{ email: string; password: string } | null>(null)
  const formKey = useRef(0)

  useEffect(() => {
    if (!isOpen) {
      setMode(defaultMode)
      setIsProcessing(false)
      setAutoLoginData(null)
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

  useEffect(() => { if (autoLoginData) performAutoLogin() }, [autoLoginData])

  const performAutoLogin = async () => {
    if (!autoLoginData) return
    try {
      const expertId = window.localStorage.getItem('expertId')?.trim() || import.meta.env.VITE_EXPERT_ID?.trim()
      const response = await loginMutation({ ...autoLoginData, ...(expertId ? { expertId } : {}) }).unwrap()
      saveToken(response.accessToken)
      dispatch(setCredentials({ user: response.user as any, accessToken: response.accessToken }))
      toast.success(getToastMessage('auth.autoLoginSuccess', lang))
      onClose()
      await postAuthNavigate(response.user)
    } catch {
      toast.error(getToastMessage('auth.autoLoginFailed', lang))
      setMode('login')
    } finally { setAutoLoginData(null) }
  }

  const handleSocial = async (provider: 'google' | 'telegram') => {
    setIsProcessing(true)
    try {
      const result = await loginWithSocial(provider)
      toast.success(getToastMessage('auth.socialSuccess', lang))
      onClose()
      await postAuthNavigate({ email: result.email ?? null })
    } catch (err) {
      const message = err instanceof Error && err.message.includes('VITE_GOOGLE_CLIENT_ID not configured')
        ? getToastMessage('auth.socialGoogleNotConfigured', lang)
        : getToastMessage('auth.socialGenericError', lang)
      toast.error(message)
    } finally { setIsProcessing(false) }
  }

  const handleRegisterSuccess = (credentials?: { email: string; password: string }) => {
    if (credentials) setAutoLoginData(credentials)
    else { setMode('login'); formKey.current += 1 }
  }

  const switchMode = () => { setMode(prev => prev === 'login' ? 'register' : 'login'); formKey.current += 1 }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gradient-radial from-white/12 via-black/46 to-black/62 backdrop-blur-xl supports-[backdrop-filter]:bg-black/32 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md animate-scaleFadeIn"
        onClick={e => e.stopPropagation()}
      >
        {/* Outer accent aura separates the modal from the blurred background. */}
        <div className="pointer-events-none absolute -inset-8 rounded-[40px] bg-[radial-gradient(circle_at_50%_0%,rgba(var(--accent-rgb),.34),rgba(var(--accent-rgb),.14)_24%,transparent_68%)] blur-3xl opacity-95" />
        <div className="pointer-events-none absolute -inset-3 rounded-[34px] bg-[radial-gradient(circle_at_50%_100%,rgba(36,58,118,.2),transparent_62%)] blur-2xl opacity-80" />
        <div className="pointer-events-none absolute -inset-px rounded-[30px] bg-[linear-gradient(135deg,rgba(255,255,255,.24)0%,rgba(36,58,118,.42)18%,rgba(255,255,255,.08)38%,rgba(255,255,255,.05)62%,rgba(var(--accent-rgb),.18)82%,rgba(255,255,255,.12)100%)] opacity-75" />

        {/* Semi-transparent gradient keeps background visible; backdrop blur softens the page behind the modal. */}
        <div className="relative overflow-hidden rounded-[30px] border border-white/8 bg-[linear-gradient(155deg,rgba(255,255,255,.16)0%,rgba(255,255,255,.08)14%,rgba(255,255,255,.03)34%,rgba(10,12,18,.72)60%,rgba(7,8,12,.88)100%)] shadow-[0_1px_0_rgba(255,255,255,.24)_inset,0_-1px_0_rgba(0,0,0,.34)_inset,0_24px_80px_rgba(0,0,0,.58),0_12px_34px_rgba(0,0,0,.34),0_0_72px_rgba(36,58,118,.26)] backdrop-blur-2xl">
          {/* Refraction layers create the liquid-glass / icy transparency effect. */}
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,.16)0%,rgba(255,255,255,.05)18%,transparent_42%,rgba(255,255,255,.03)100%)]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,.26),rgba(var(--accent-rgb),.18)_26%,transparent_72%)] blur-xl" />
          <div className="pointer-events-none absolute -left-12 top-10 h-40 w-24 rotate-[18deg] bg-[linear-gradient(180deg,rgba(255,255,255,.24),rgba(255,255,255,0))] opacity-70 blur-lg" />
          <div className="pointer-events-none absolute -right-10 bottom-8 h-32 w-20 -rotate-[16deg] bg-[linear-gradient(180deg,rgba(var(--accent-rgb),.2),rgba(255,255,255,0))] opacity-60 blur-lg" />
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
              <LoginForm key={`login-${formKey.current}`} onSwitch={switchMode} onSuccess={() => { onClose(); void postAuthNavigate() }} />
            ) : (
              <RegisterForm key={`register-${formKey.current}`} onSwitch={switchMode} onSuccess={handleRegisterSuccess} />
            )}

            {/* Social buttons */}
            {mode === 'login' && (
              <>
                <div className="relative flex items-center my-4">
                  <span className="px-3 text-xs text-white/40">або продовжити з</span>
                  <div className="absolute inset-0 flex items-center">
                    <div className="flex-1 h-px bg-white/8"></div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" onClick={() => handleSocial('google')} disabled={isProcessing} className="border-white/15 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-all">Google</Button>
                  <Button variant="outline" onClick={() => handleSocial('telegram')} disabled={isProcessing} className="border-white/15 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-all">Telegram</Button>
                </div>
              </>
            )}
          </div>

          {/* Processing overlay */}
          {isProcessing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[linear-gradient(180deg,rgba(9,10,16,.82),rgba(7,8,12,.9))] backdrop-blur-md rounded-[30px] z-20">
              <div className="w-11 h-11 border-3 border-[rgb(var(--accent-rgb))] border-t-transparent rounded-full animate-spin shadow-[0_0_24px_rgba(var(--accent-rgb),.28)]" />
              <p className="text-white/70 text-sm">Обробка...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
