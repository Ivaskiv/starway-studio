// frontend/src/features/auth/components/AuthModal.tsx
import { X } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ROUTES } from '@/config/routes'
import { useSessionOrchestrator } from '@/features/auth/context/SessionOrchestratorContext'
import { isTelegramMiniApp } from '@/features/social/utils/telegramWebApp'
import { useAuth } from '../hooks/useAuth'
import { LoginForm } from './LoginForm'
import { RegisterForm } from './RegisterForm'
import { usePostAuthNavigation } from '../hooks/usePostAuthNavigation'
import { getToastMessage, type ToastLang } from '@/features/notifications/i18n/toast'
import { getToken } from '../services/token'
import toast from 'react-hot-toast'
import { AB_TEST_LANDING_RESULT_ROUTE } from '@/features/ab-test-landing/config'
import { resolveApiUrl } from '@/services/api'

type Mode = 'login' | 'register'
interface Props { isOpen: boolean; onClose: () => void; defaultMode?: Mode }

type AbTestPendingPayload = {
  source?: 'anonymous' | 'authenticated'
  answers?: Array<{
    questionId: string
    answerId: string
  }> | Record<string, string>
}

export default function AuthModal({ isOpen, onClose, defaultMode = 'login' }: Props) {
  const { loginWithSocial, canUseSocialProvider } = useAuth()
  const orchestrator = useSessionOrchestrator()
  const location = useLocation()
  const navigate = useNavigate()
  const isMiniAppRuntime = isTelegramMiniApp(location.pathname)
  const lang: ToastLang = 'uk'
  const postAuthNavigate = usePostAuthNavigation()

  const [mode, setMode] = useState<Mode>(defaultMode)
  const [isProcessing, setIsProcessing] = useState(false)
  const formKey = useRef(0)
  const deferToPendingProtectedNavigation =
    orchestrator.sessionModal.kind === 'auth' &&
    (orchestrator.sessionModal.reason === 'protected_route' || orchestrator.sessionModal.reason === 'telegram_required')

  useEffect(() => {
    if (!isOpen || !isMiniAppRuntime) {
      return
    }

    onClose()
  }, [isMiniAppRuntime, isOpen, onClose])

  useEffect(() => {
    if (isOpen) {
      setMode(defaultMode)
      return
    }

    if (!isOpen) {
      setMode(defaultMode)
      setIsProcessing(false)
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
      if (!deferToPendingProtectedNavigation) {
        await postAuthNavigate()
      }
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
  const isAbTestRegisterFlow = location.pathname.startsWith('/register') && new URLSearchParams(location.search).get('from') === 'ab-test'

  const handleRegisterSuccess = async () => {
    toast.success(getToastMessage('auth.registerSuccess', lang))

    const pending = readPendingAbTest()
    let redirectedToAbTestResult = false

    const pendingAnswers = normalizePendingAbTestAnswers(pending)

    if (isAbTestRegisterFlow && pending?.source === 'anonymous' && pendingAnswers.length) {
      setIsProcessing(true)
      try {
        const response = await fetch(resolveApiUrl('/ab-test/submit'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...buildAuthHeaders(),
          },
          credentials: 'include',
          body: JSON.stringify({ answers: pendingAnswers }),
        })

        if (!response.ok) {
          throw new Error(`Failed to submit AB test result (${response.status})`)
        }

        const data = await response.json() as { type?: string }
        window.sessionStorage.removeItem('ab_test_pending')
        redirectedToAbTestResult = true
        navigate(`${AB_TEST_LANDING_RESULT_ROUTE}?type=${encodeURIComponent(String(data.type ?? 'STATE'))}`, {
          replace: true,
          state: { result: data },
        })
        return
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Не вдалося зберегти результат тесту')
        return
      } finally {
        if (!redirectedToAbTestResult) {
          setIsProcessing(false)
        }
      }
    }

    onClose()
    if (!deferToPendingProtectedNavigation) {
      void postAuthNavigate()
    }
  }

  const switchMode = () => {
    setMode((prev: Mode) => (prev === 'login' ? 'register' : 'login'))
    formKey.current += 1
  }

  if (isMiniAppRuntime) return null
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
                onSuccess={() => {
                  onClose()
                  if (!deferToPendingProtectedNavigation) {
                    void postAuthNavigate()
                  }
                }}
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

function readPendingAbTest(): AbTestPendingPayload | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.sessionStorage.getItem('ab_test_pending')
    if (!raw) return null
    const parsed = JSON.parse(raw) as AbTestPendingPayload | null
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

function normalizePendingAbTestAnswers(
  pending: AbTestPendingPayload | null,
): Array<{ questionId: string; answerId: string }> {
  if (!pending?.answers) return []

  if (Array.isArray(pending.answers)) {
    return pending.answers.filter(
      (item): item is { questionId: string; answerId: string } =>
        Boolean(item && typeof item.questionId === 'string' && typeof item.answerId === 'string'),
    )
  }

  return Object.entries(pending.answers).flatMap(([questionId, answerId]) => (
    typeof answerId === 'string' && answerId.trim()
      ? [{ questionId, answerId }]
      : []
  ))
}

function buildAuthHeaders(): HeadersInit {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}
