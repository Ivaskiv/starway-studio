// src/components/auth/Auth.tsx — ОСТАТОЧНА ВЕРСІЯ
import { useState } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import './Auth.scss'
import api from '../../lib/api'
import { useAuthStore } from '../../store/auth' // ТВІЙ СТОР

interface LoginForm {
  email: string
  password: string
}

interface RegisterForm {
  email: string
  password: string
  confirmPassword: string
}

export default function Auth() {
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const { login } = useAuthStore()
  const navigate = useNavigate()

  const {
    register: registerLogin,
    handleSubmit: handleLoginSubmit,
    reset: resetLogin,
    formState: { errors: loginErrors },
  } = useForm<LoginForm>()

  const {
    register: registerRegister,
    handleSubmit: handleRegisterSubmit,
    reset: resetRegister,
    formState: { errors: registerErrors },
  } = useForm<RegisterForm>()

  const onLogin: SubmitHandler<LoginForm> = async (data) => {
    try {
      const res = await api.post('/auth/login', data)
      const token = res.data.token || res.data.access
      const user = res.data.user

      login(user, token)

      if (user.role === 'super_admin' || user.role === 'admin') {
        navigate('/admin')
      } else {
        navigate('/cabinet')
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Помилка входу')
    }
  }

  const onRegister: SubmitHandler<RegisterForm> = async (data) => {
    if (data.password !== data.confirmPassword) {
      alert('Паролі не збігаються')
      return
    }

    try {
      await api.post('/auth/register', {
        email: data.email,
        password: data.password,
      })
      alert('Реєстрація успішна! Тепер увійдіть.')
      resetRegister()
      setTab('login')
    } catch (err: any) {
      alert(err.response?.data?.error || 'Помилка реєстрації')
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">Starway Admin</h1>

        <div className="tabs">
          <button
            className={tab === 'login' ? 'tab-active' : 'tab-inactive'}
            onClick={() => {
              setTab('login')
              resetLogin()
            }}
          >
            Вхід
          </button>
          <button
            className={tab === 'register' ? 'tab-active' : 'tab-inactive'}
            onClick={() => {
              setTab('register')
              resetRegister()
            }}
          >
            Реєстрація
          </button>
        </div>

        {tab === 'login' && (
          <form onSubmit={handleLoginSubmit(onLogin)} className="auth-form">
            <input
              {...registerLogin('email', { required: 'Email обов’язковий' })}
              placeholder="Email"
              className="auth-input"
            />
            {loginErrors.email && <p className="error-text">{loginErrors.email.message}</p>}

            <input
              {...registerLogin('password', { required: 'Пароль обов’язковий' })}
              type="password"
              placeholder="Пароль"
              className="auth-input"
            />
            {loginErrors.password && <p className="error-text">{loginErrors.password.message}</p>}

            <button type="submit" className="auth-button">
              Увійти
            </button>
          </form>
        )}

        {tab === 'register' && (
          <form onSubmit={handleRegisterSubmit(onRegister)} className="auth-form">
            <input
              {...registerRegister('email', { required: 'Email обов’язковий' })}
              placeholder="Email"
              className="auth-input"
            />
            {registerErrors.email && <p className="error-text">{registerErrors.email.message}</p>}

            <input
              {...registerRegister('password', { required: 'Пароль обов’язковий' })}
              type="password"
              placeholder="Пароль"
              className="auth-input"
            />

            <input
              {...registerRegister('confirmPassword', { required: 'Підтвердіть пароль' })}
              type="password"
              placeholder="Підтвердження пароля"
              className="auth-input"
            />

            <button type="submit" className="auth-button">
              Зареєструватися
            </button>
          </form>
        )}
      </div>
    </div>
  )
}