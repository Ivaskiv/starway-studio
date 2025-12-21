import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, User, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { useAppDispatch } from '@/store/hooks'
import { login as loginAction } from '@/features/auth/authSlice'
import { Input, Button } from '@/components/ui'
import api from '@/lib/api'

export default function Register() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()

  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const passwordValidation = {
    minLength: formData.password.length >= 8,
    hasNumber: /\d/.test(formData.password),
    hasLetter: /[a-zA-Z]/.test(formData.password),
    match: formData.password === formData.confirmPassword && formData.password !== ''
  }

  const isPasswordValid = Object.values(passwordValidation).every(Boolean)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!isPasswordValid) {
      setError('Пароль не відповідає вимогам')
      return
    }

    setIsLoading(true)
    try {
      const res = await api.post('/auth/register', {
        name: formData.name,
        email: formData.email,
        password: formData.password
      })
      const user = res.data.user
      const token = res.data.token || res.data.access

      dispatch(loginAction({ ...user, token }))
      navigate('/admin')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Помилка реєстрації. Спробуй ще раз.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-pink-500 rounded-xl" />
            <span className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-transparent">
              Starway
            </span>
          </Link>
          <p className="text-gray-400 mt-4">Створи свій акаунт</p>
        </div>

        {/* Form */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div className="relative">
              <User className="absolute left-3 top-[46px] text-gray-400 z-10" size={20} />
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Твоє ім'я"
                className="pl-12"
                required
              />
            </div>

            {/* Email */}
            <div className="relative">
              <Mail className="absolute left-3 top-[46px] text-gray-400 z-10" size={20} />
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="твій@email.com"
                className="pl-12"
                required
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock className="absolute left-3 top-[46px] text-gray-400 z-10" size={20} />
              <Input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                className="pl-12 pr-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[46px] text-gray-400 hover:text-white transition"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {/* Confirm Password */}
            <div className="relative">
              <Lock className="absolute left-3 top-[46px] text-gray-400 z-10" size={20} />
              <Input
                type={showPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="••••••••"
                className="pl-12"
                required
              />
            </div>

            {/* Password validation */}
            {formData.password && (
              <div className="mt-3 space-y-2">
                {Object.entries(passwordValidation).map(([key, met]) => (
                  <div key={key} className="flex items-center gap-2 text-sm">
                    <CheckCircle size={16} className={met ? 'text-green-400' : 'text-gray-600'} />
                    <span className={met ? 'text-gray-300' : 'text-gray-500'}>
                      {key === 'minLength' ? 'Мінімум 8 символів' :
                       key === 'hasNumber' ? 'Хоча б одна цифра' :
                       key === 'hasLetter' ? 'Хоча б одна буква' : 'Паролі співпадають'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400 text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
              disabled={!isPasswordValid}
              className="w-full"
            >
              Створити акаунт
            </Button>
          </form>

          {/* Links */}
          <div className="mt-6 text-center text-sm text-gray-400">
            Вже є акаунт?{' '}
            <Link to="/login" className="text-orange-400 hover:text-orange-300 font-medium">
              Увійти
            </Link>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <Link to="/" className="text-sm text-gray-400 hover:text-white transition">
            ← Повернутись на головну
          </Link>
        </div>
      </div>
    </div>
  )
}
