import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/ui'
import { useLoginMutation, useRegisterMutation } from '../services/auth.api'
import { LoginForm, LoginFormData } from './LoginForm'
import { RegisterForm, RegisterFormData } from './RegisterForm'
import { SocialAuthRow } from './SocialAuthRow'
import { SOCIAL_PLATFORM_METADATA } from '@/shared/constants/socialPlatforms.constants'
import { SocialPlatform } from '@/shared/types/social.types'
import { setCredentials } from '../services/auth.slice'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  defaultMode?: 'login' | 'register'
}

// 👀 Беремо список соціальних платформ для кнопок
const SOCIAL_PLATFORMS = Object.keys(SOCIAL_PLATFORM_METADATA) as SocialPlatform[]

export function AuthModal({ isOpen, onClose, defaultMode = 'login' }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>(defaultMode)
  const [serverError, setServerError] = useState<string>()
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const [login, { isLoading: loginLoading }] = useLoginMutation()
  const [register, { isLoading: registerLoading }] = useRegisterMutation()

  // 👆 блокуємо скролл під час відкритої модалки
  useEffect(() => {
    if (!isOpen) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  // ================== LOGIN ==================
  const handleLogin = async (data: LoginFormData) => {
    setServerError(undefined)
    try {
      // unwrap() дає прямий результат без RTK Query об'єкта
      const result = await login(data).unwrap()

      // 🔑 зберігаємо юзера і токен у Redux
      dispatch(setCredentials({ user: result.user, accessToken: result.token }))

      // 🟢 повідомлення про успішний вхід
      toast.success('Вхід успішний 👋')

      // ✨ закриваємо модалку
      onClose()

      // 🚀 переходимо у кабінет
      navigate('/dashboard')
    } catch (err: any) {
      // ❌ показуємо серверну помилку
      const message = err?.data?.message || 'Помилка входу'
      setServerError(message)
      toast.error(message)
    }
  }

  // ================== REGISTER ==================
  const handleRegister = async (data: Omit<RegisterFormData, 'confirmPassword'>) => {
    setServerError(undefined)
    try {
      const result = await register(data).unwrap()
      dispatch(setCredentials({ user: result.user, accessToken: result.token }))
      toast.success('Реєстрація успішна 🎉')
      onClose()
      navigate('/dashboard')
    } catch (err: any) {
      const message = err?.data?.message || 'Помилка реєстрації'
      setServerError(message)
      toast.error(message)
    }
  }

  // ================== SOCIAL AUTH ==================
  const handleSocialAuth = (platform: SocialPlatform) => {
    // тут можна додати реальну соціальну авторизацію
 toast('Реєстрація через Telegram — скоро')
    // 🔹 Після успішної соц. авторизації теж:
    onClose()
    navigate('/dashboard')  }

  return (
    <div className="fixed inset-0 z-[9999]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative w-full max-w-md rounded-3xl bg-gradient-to-br from-slate-900/95 to-slate-800/95 border border-white/10 shadow-2xl overflow-hidden">
          {/* fade top/bottom */}
          <div className="pointer-events-none absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-black/60 to-transparent z-10" />
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-black/60 to-transparent z-10" />

          {/* кнопка закриття */}
          <Button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 z-20"
          >
            <X className="w-5 h-5 text-white" />
          </Button>

          {/* контент модалки */}
          <div className="p-5 sm:p-6 flex flex-col gap-5">
            {mode === 'login' ? (
              <LoginForm
                onSubmit={handleLogin}
                onRegisterClick={() => setMode('register')}
                isLoading={loginLoading}
                serverError={serverError}
              />
            ) : (
              <RegisterForm
                onSubmit={handleRegister}
                onLoginClick={() => setMode('login')}
                isLoading={registerLoading}
                serverError={serverError}
              />
            )}

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="px-2 bg-slate-900 text-white/20">або</span>
              </div>
            </div>

            {/* соціальна авторизація */}
            <SocialAuthRow onAuth={handleSocialAuth} />

            <p className="mt-5 text-xs text-center text-white/40">
              Продовжуючи, ви погоджуєтесь з умовами та політикою конфіденційності
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
