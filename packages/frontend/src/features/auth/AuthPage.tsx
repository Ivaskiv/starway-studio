// packages/frontend/src/features/auth/pages/AuthPage.tsx

import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Eye, EyeOff, Loader2, Sparkles, User, Zap } from 'lucide-react'
import { useSignInMutation, useSignUpMutation } from './services/auth.api'
import { userRole } from '@/types/user.types'
import toast from 'react-hot-toast'
import { Button, Input } from '@/ui'

type AuthMode = 'login' | 'register'
type UserType = 'funnel_admin' | 'user' | 'guest'

// ✅ Правильний mapping userType → role для бекенду
const USER_TYPE_TO_ROLE: Record<UserType, userRole> = {
  funnel_admin: 'funnel_admin',
  user: 'user',
  guest: 'user', // guest реєструється як user
}

const USER_TYPES: { id: UserType; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'funnel_admin', label: 'Власник AI-воронок', icon: Zap, description: 'Створюй та продавай' },
  { id: 'user', label: 'Користувач', icon: User, description: 'Купуй та навчайся' },
  { id: 'guest', label: 'Гість', icon: Eye, description: 'Переглядай демо' },
]

export default function AuthPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string })?.from || '/dashboard'

  const [mode, setMode] = useState<AuthMode>('register')
  const [userType, setUserType] = useState<UserType>('user')
  const [showPassword, setShowPassword] = useState(false)
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  })

  const [signIn, { isLoading: isSigningIn }] = useSignInMutation()
  const [signUp, { isLoading: isSigningUp }] = useSignUpMutation()

  const isLoading = isSigningIn || isSigningUp

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (mode === 'register') {
        // ✅ Передаємо правильну role на бекенд
        const role = USER_TYPE_TO_ROLE[userType]
        
        console.log('📝 Registering with role:', role, 'userType:', userType)
        
        await signUp({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
        }).unwrap()

        toast.success('Реєстрація успішна!')
      } else {
        await signIn({
          email: formData.email,
          password: formData.password,
        }).unwrap()

        toast.success('Вхід успішний!')
      }

      // Невелика затримка для збереження токену
      setTimeout(() => {
        navigate(from, { replace: true })
      }, 100)
    } catch (error: any) {
      toast.error(error?.data?.message || 'Помилка авторизації')
    }
  }

  return (
    <div className="min-h-screen bg-black relative">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-green-500/20 rounded-full blur-3xl" />
      </div>

      {/* Back button */}
      <Button
        onClick={() => navigate('/')}
        className="fixed top-6 left-6 z-50 flex items-center gap-2 px-4 py-2 rounded-xl 
                   bg-white/5 backdrop-blur-xl border border-white/10 text-white/70 
                   hover:text-white hover:bg-white/10 transition-all"
      >
        <ArrowLeft className="w-4 h-4" />
        На головну
      </Button>

      {/* Content */}
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg"
        >
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl 
                          flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/30">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">STARWAY STUDIO</h1>
            <p className="text-white/60 mt-2">Створи свою AI-екосистему</p>
          </div>

          {/* Form Card */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8">
            {/* User Type Selection (only for register) */}
            {mode === 'register' && (
              <div className="mb-6">
                <div className="grid grid-cols-3 gap-3">
                  {USER_TYPES.map((type) => {
                    const Icon = type.icon
                    const isSelected = userType === type.id
                    return (
                      <Button
                        key={type.id}
                        type="button"
                        onClick={() => setUserType(type.id)}
                        className={`p-4 rounded-2xl border transition-all text-center
                          ${isSelected 
                            ? 'border-orange-500 bg-orange-500/10 ring-2 ring-orange-500' 
                            : 'border-white/10 bg-white/5 hover:bg-white/10'
                          }`}
                      >
                        <div className={`w-12 h-12 rounded-xl mx-auto mb-2 flex items-center justify-center
                          ${type.id === 'funnel_admin' ? 'bg-orange-500' : ''}
                          ${type.id === 'user' ? 'bg-green-500' : ''}
                          ${type.id === 'guest' ? 'bg-blue-500' : ''}`}
                        >
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <p className="text-white text-sm font-medium">{type.label}</p>
                      </Button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Mode Toggle */}
            <div className="flex gap-2 p-1 bg-white/5 rounded-xl mb-6">
              <Button
                type="button"
                onClick={() => setMode('register')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all
                  ${mode === 'register' 
                    ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white' 
                    : 'text-white/60 hover:text-white'
                  }`}
              >
                Реєстрація
              </Button>
              <Button
                type="button"
                onClick={() => setMode('login')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all
                  ${mode === 'login' 
                    ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white' 
                    : 'text-white/60 hover:text-white'
                  }`}
              >
                Вхід
              </Button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <AnimatePresence mode="wait">
                {mode === 'register' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="grid grid-cols-2 gap-4"
                  >
                    <Input
                      type="text"
                      name="firstName"
                      placeholder="Ім'я"
                      value={formData.firstName}
                      onChange={handleChange}
                      required={mode === 'register'}
                      className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 
                               text-white placeholder-white/40 focus:outline-none 
                               focus:ring-2 focus:ring-orange-500/50"
                    />
                    <Input
                      type="text"
                      name="lastName"
                      placeholder="Прізвище"
                      value={formData.lastName}
                      onChange={handleChange}
                      className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 
                               text-white placeholder-white/40 focus:outline-none 
                               focus:ring-2 focus:ring-orange-500/50"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <Input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 
                         text-white placeholder-white/40 focus:outline-none 
                         focus:ring-2 focus:ring-orange-500/50"
              />

              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="Пароль"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 
                           text-white placeholder-white/40 focus:outline-none 
                           focus:ring-2 focus:ring-orange-500/50 pr-12"
                />
                <Button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </Button>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 
                         text-white font-semibold hover:opacity-90 transition-opacity
                         disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Зачекайте...
                  </>
                ) : mode === 'register' ? (
                  'Створити акаунт'
                ) : (
                  'Увійти'
                )}
              </Button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  )
}