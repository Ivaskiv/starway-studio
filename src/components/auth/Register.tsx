// src/pages/auth/Register.tsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, User, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { useStore } from '../../store'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'

export default function Register() {
  const navigate = useNavigate()
  const { register } = useStore()
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Валідація пароля
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
      await register(formData.email, formData.password, formData.name)
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
                label="Ім'я"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="pl-12"
                placeholder="Твоє ім'я"
                required
              />
            </div>

            {/* Email */}
            <div className="relative">
              <Mail className="absolute left-3 top-[46px] text-gray-400 z-10" size={20} />
              <Input
                type="email"
                label="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="pl-12"
                placeholder="твій@email.com"
                required
              />
            </div>

            {/* Password */}
            <div>
              <div className="relative">
                <Lock className="absolute left-3 top-[46px] text-gray-400 z-10" size={20} />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  label="Пароль"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pl-12 pr-12"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[46px] text-gray-400 hover:text-white transition"
                  aria-label={showPassword ? 'Сховати пароль' : 'Показати пароль'}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              {/* Password Requirements */}
              {formData.password && (
                <div className="mt-3 space-y-2">
                  <PasswordRequirement 
                    met={passwordValidation.minLength}
                    text="Мінімум 8 символів"
                  />
                  <PasswordRequirement 
                    met={passwordValidation.hasNumber}
                    text="Хоча б одна цифра"
                  />
                  <PasswordRequirement 
                    met={passwordValidation.hasLetter}
                    text="Хоча б одна буква"
                  />
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <div className="relative">
                <Lock className="absolute left-3 top-[46px] text-gray-400 z-10" size={20} />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  label="Підтвердження пароля"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="pl-12"
                  placeholder="••••••••"
                  required
                />
              </div>
              {formData.confirmPassword && (
                <PasswordRequirement 
                  met={passwordValidation.match}
                  text="Паролі співпадають"
                  className="mt-3"
                />
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Submit */}
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

// Helper component для вимог до пароля
function PasswordRequirement({ 
  met, 
  text, 
  className = '' 
}: { 
  met: boolean
  text: string
  className?: string 
}) {
  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      <CheckCircle 
        size={16} 
        className={met ? 'text-green-400' : 'text-gray-600'}
      />
      <span className={met ? 'text-gray-300' : 'text-gray-500'}>
        {text}
      </span>
    </div>
  )
}