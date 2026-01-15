import { useAuth } from '@/features/auth/hooks/useAuth'
import { User, UserRole, UserType } from '@/types/user.types'
import { Button, Input } from '@/ui'
import { motion } from 'framer-motion'
import { ArrowLeft, Eye, EyeOff, Loader2, Sparkles, User as UserIcon, Zap } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

type AuthMode = 'login' | 'register'

const USER_TYPES: { id: UserType; label: string; icon: React.ElementType }[] = [
  { id: 'admin', label: 'Власник AI-воронок', icon: Zap },
  { id: 'user', label: 'Користувач', icon: UserIcon },
  { id: 'guest', label: 'Гість', icon: Eye },
]

export default function AuthPage() {
  const navigate = useNavigate()
  const { setCredentials } = useAuth()
  const [mode, setMode] = useState<AuthMode>('login')
  const [userType, setUserType] = useState<UserType>('user')
  const [formData, setFormData] = useState({ email: '', password: '', firstName: '', lastName: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const userTypeToRole = (type: UserType): UserRole => (type === 'admin' ? 'admin' : 'user');


  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setError(null)
  setIsLoading(true)

  try {
    // 🔹 Локальний мок login / register
    const user: User = {
      id: Math.random().toString(36).substr(2, 9),
      email: formData.email,
      first_name: mode === 'register' ? formData.firstName || 'Test' : 'Test',
      last_name: mode === 'register' ? formData.lastName || 'User' : 'User',
      role: userTypeToRole(userType),
      created_at: new Date().toISOString(),
    }

    const tokens = {
      accessToken: 'mock-token-123',
      refreshToken: 'mock-refresh',
      expiresIn: 3600,
    }

    // 🔹 Передаємо строго по типах
    setCredentials({ user, accessToken: tokens.accessToken })

    navigate('/', { replace: true })
  } catch (err: any) {
    setError(err?.message || 'Auth failed')
  } finally {
    setIsLoading(false)
  }
}


  return (
    <div className="min-h-screen bg-black relative">
      <Button onClick={() => navigate('/')} className="fixed top-6 left-6 z-50 flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-all">
        <ArrowLeft className="w-4 h-4" />
        <span className="hidden sm:inline">На головну</span>
      </Button>

      <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/30">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">STARWAY STUDIO</h1>
            <p className="text-white/60 mt-2">Створи свою AI-екосистему</p>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8">
            {mode === 'register' && (
              <div className="mb-6 grid grid-cols-3 gap-2 sm:gap-3">
                {USER_TYPES.map((type) => {
                  const Icon = type.icon
                  const isSelected = userType === type.id
                  return (
                    <button key={type.id} type="button" onClick={() => setUserType(type.id)} className={`p-3 sm:p-4 rounded-2xl border transition-all text-center ${isSelected ? 'border-orange-500 bg-orange-500/10 ring-2 ring-orange-500' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl mx-auto mb-2 flex items-center justify-center
                        ${type.id === 'admin' ? 'bg-orange-500' : ''}
                        ${type.id === 'user' ? 'bg-green-500' : ''}
                        ${type.id === 'guest' ? 'bg-blue-500' : ''}`}>
                        <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                      <p className="text-white text-xs sm:text-sm font-medium">{type.label}</p>
                    </button>
                  )
                })}
              </div>
            )}

            <div className="flex gap-2 p-1 bg-white/5 rounded-xl mb-6">
              <button type="button" onClick={() => setMode('register')} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${mode === 'register' ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white' : 'text-white/60 hover:text-white'}`}>Реєстрація</button>
              <button type="button" onClick={() => setMode('login')} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${mode === 'login' ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white' : 'text-white/60 hover:text-white'}`}>Вхід</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <>
                  <Input type="text" name="firstName" placeholder="Ім'я" value={formData.firstName} onChange={handleChange} required className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
                  <Input type="text" name="lastName" placeholder="Прізвище" value={formData.lastName} onChange={handleChange} required className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
                </>
              )}
              <Input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} required className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
              <div className="relative">
                <Input type={showPassword ? 'text' : 'password'} name="password" placeholder="Пароль" value={formData.password} onChange={handleChange} required className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-orange-500/50 pr-12" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <button type="submit" disabled={isLoading} data-color="orange" data-size="lg" className="btn w-full">
                {isLoading ? <><Loader2 className="w-5 h-5 animate-spin" /> Зачекайте...</> : mode === 'register' ? 'Створити акаунт' : 'Увійти'}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
