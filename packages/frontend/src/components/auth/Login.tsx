import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { useAppDispatch } from '@/store/hooks'
import { login as loginAction } from '@/features/auth/authSlice'
import { Input, Button } from '@/components/ui'
import api from '@/lib/api'

export default function Login() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()

  const [formData, setFormData] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const res = await api.post('/auth/login', formData)
      const user = res.data.user
      const token = res.data.token || res.data.access

      dispatch(loginAction({ ...user, token }))

      if (user.role === 'super_admin' || user.role === 'admin') navigate('/admin')
      else navigate('/cabinet')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Помилка входу. Перевір дані.')
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
          <p className="text-gray-400 mt-4">Увійди до адмін панелі</p>
        </div>

        {/* Form */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
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

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Submit */}
            <Button type="submit" variant="primary" isLoading={isLoading} className="w-full">
              Увійти
            </Button>
          </form>

          {/* Links */}
          <div className="mt-6 space-y-3 text-center text-sm text-gray-400">
            <Link to="/forgot-password" className="block hover:text-orange-400 transition">
              Забули пароль?
            </Link>
            <div>
              Ще немає акаунту?{' '}
              <Link to="/register" className="text-orange-400 hover:text-orange-300 font-medium">
                Зареєструватись
              </Link>
            </div>
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
