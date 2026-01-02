// src/pages/demo/steps/Step1DemoRegister.tsx
import { useState } from 'react'
import { Input, Button } from '@/components/ui'
import { useNavigate } from 'react-router-dom'
import { useAppSelector } from '@/store/hooks'
import { Eye, EyeOff } from 'lucide-react'

export default function Step1DemoRegister() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)

  // Отримуємо дані з Redux store - спочатку реєструємо адміна
  const demoState = useAppSelector(state => state.demo)
  const demoUser = demoState.admin || {
    name: 'Admin',
    email: 'admin@starway.test',
    password: 'admin123',
    role: 'admin'
  }

  const handleRegister = () => {
    // Зберігаємо дані в localStorage перед переходом
    localStorage.setItem('demoUser', JSON.stringify(demoUser))
    navigate('/demo/step2-login')
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <header className="flex justify-between p-8 max-w-4xl w-full mx-auto">
        <h1 className="text-2xl font-bold">Dashboard Demo — Nova AI</h1>
        <Button variant="ghost" onClick={() => navigate('/')}>Війти</Button>
      </header>

      <div className="flex-1 flex items-center justify-center px-8 py-12">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-bold mb-6">Demo Registration - Admin</h1>
          <p className="text-gray-400 mb-6">
            🎯 Ви реєструєтесь як адміністратор. Після входу ви зможете створити ментора та студента.
          </p>
          
          <Input label="Ім'я" value={demoUser.name} readOnly className="mb-4"/>
          <Input label="Email" value={demoUser.email} readOnly className="mb-4"/>
          
          <div className="relative mb-4">
            <Input
              label="Пароль"
              value={demoUser.password}
              type={showPassword ? 'text' : 'password'}
              readOnly
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-[38px] text-gray-400 hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          
          <div className="relative mb-6">
            <Input
              label="Повторіть пароль"
              value={demoUser.password}
              type={showPassword ? 'text' : 'password'}
              readOnly
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-[38px] text-gray-400 hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <Button variant="primary" className="w-full" onClick={handleRegister}>
            Зареєструватися як Адмін
          </Button>
        </div>
      </div>
    </div>
  )
}