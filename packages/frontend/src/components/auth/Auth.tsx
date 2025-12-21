import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, User, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { useAppDispatch } from '@/store/hooks'
import { login as loginAction } from '@/features/auth/authSlice'
import { Input, Button } from '@/components/ui'
import api from '@/lib/api'

type Tab = 'login' | 'register' | 'forgot' | 'change'

export default function Auth() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const [tab, setTab] = useState<Tab>('login')

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    newPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Валідація пароля для register/change
  const passwordValidation = {
    minLength: formData.password.length >= 8,
    hasNumber: /\d/.test(formData.password),
    hasLetter: /[a-zA-Z]/.test(formData.password),
    match: formData.password === formData.confirmPassword && formData.password !== ''
  }
  const isPasswordValid = Object.values(passwordValidation).every(Boolean)

  const handleLogin = async () => {
    setError('')
    setIsLoading(true)
    try {
      const res = await api.post('/auth/login', { email: formData.email, password: formData.password })
      const user = res.data.user
      const token = res.data.token || res.data.access

      dispatch(loginAction({ ...user, token }))
      navigate(user.role === 'admin' || user.role === 'super_admin' ? '/admin' : '/cabinet')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Помилка входу')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async () => {
    if (!isPasswordValid) {
      setError('Пароль не відповідає вимогам')
      return
    }
    setError('')
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
      setError(err.response?.data?.message || 'Помилка реєстрації')
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgot = async () => {
    if (!formData.email) {
      setError('Вкажи email')
      return
    }
    setError('')
    setSuccess('')
    setIsLoading(true)
    try {
      await api.post('/auth/forgot-password', { email: formData.email })
      setSuccess('Лист для відновлення пароля відправлено')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Помилка надсилання листа')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = async () => {
    if (!isPasswordValid) {
      setError('Пароль не відповідає вимогам')
      return
    }
    setError('')
    setIsLoading(true)
    try {
      await api.post('/auth/change-password', {
        email: formData.email,
        oldPassword: formData.password,
        newPassword: formData.newPassword
      })
      setSuccess('Пароль змінено успішно!')
      setTab('login')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Помилка зміни пароля')
    } finally {
      setIsLoading(false)
    }
  }

  const renderForm = () => {
    switch (tab) {
      case 'login':
        return (
          <>
            <Input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="mb-4"
              required
            />
            <div className="relative mb-4">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Пароль"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="pr-12"
                required
              />
              <Button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-400 hover:text-white transition"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </Button>
            </div>
            <Button type="button" variant="primary" isLoading={isLoading} onClick={handleLogin} className="w-full">
              Увійти
            </Button>
          </>
        )
      case 'register':
        return (
          <>
            <Input
              type="text"
              placeholder="Ім'я"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mb-4"
              required
            />
            <Input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="mb-4"
              required
            />
            <div className="relative mb-4">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Пароль"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="pr-12"
                required
              />
              <Button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-400 hover:text-white transition"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </Button>
            </div>
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Підтвердження пароля"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className="mb-4"
              required
            />
            <Button type="button" variant="primary" isLoading={isLoading} onClick={handleRegister} className="w-full" disabled={!isPasswordValid}>
              Зареєструватися
            </Button>
          </>
        )
      case 'forgot':
        return (
          <>
            <Input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="mb-4"
              required
            />
            <Button type="button" variant="primary" isLoading={isLoading} onClick={handleForgot} className="w-full">
              Відновити пароль
            </Button>
          </>
        )
      case 'change':
        return (
          <>
            <Input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="mb-4"
              required
            />
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Старий пароль"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="mb-4"
              required
            />
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Новий пароль"
              value={formData.newPassword}
              onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
              className="mb-4"
              required
            />
            <Button type="button" variant="primary" isLoading={isLoading} onClick={handleChange} className="w-full" disabled={!isPasswordValid}>
              Змінити пароль
            </Button>
          </>
        )
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-8">
        <h1 className="text-2xl font-bold text-white text-center mb-6">
          {tab === 'login' && 'Увійти'}
          {tab === 'register' && 'Реєстрація'}
          {tab === 'forgot' && 'Відновлення пароля'}
          {tab === 'change' && 'Зміна пароля'}
        </h1>

        {error && <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400 text-sm mb-4">{error}</div>}
        {success && <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-4 text-green-400 text-sm mb-4">{success}</div>}

        <div className="space-y-4">{renderForm()}</div>

        {/* Links */}
        <div className="mt-6 text-center text-sm text-gray-400 space-y-2">
          {tab !== 'login' && <Button onClick={() => setTab('login')} className="text-orange-400 hover:text-orange-300 font-medium">← До входу</Button>}
          {tab !== 'register' && <Button onClick={() => setTab('register')} className="text-orange-400 hover:text-orange-300 font-medium">Реєстрація</Button>}
          {tab !== 'forgot' && <Button onClick={() => setTab('forgot')} className="text-orange-400 hover:text-orange-300 font-medium">Забули пароль?</Button>}
          {tab !== 'change' && <Button onClick={() => setTab('change')} className="text-orange-400 hover:text-orange-300 font-medium">Змінити пароль</Button>}
        </div>
      </div>
    </div>
  )
}
