// src/components/auth/Auth.tsx
import { useState } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import './Auth.scss'
import api from '../../api'
import { useStore } from '../../store'
import axios from 'axios'

interface LoginForm {
  email: string
  password: string
}

interface RegisterForm {
  email: string
  password: string
  confirmPassword: string
}

interface AuthResponse {
  access?: string;
  token?: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'super_admin' | 'user'; // <- обов'язково цей union
    avatar?: string;
  };
}


interface ErrorResponse {
  error: string
  message?: string
}

export default function Auth() {
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const { login } = useStore()
  const navigate = useNavigate()

  // ─── Login form
  const {
    register: registerLogin,
    handleSubmit: handleLoginSubmit,
    reset: resetLogin,
  } = useForm<LoginForm>()

  // ─── Register form
  const {
    register: registerRegister,
    handleSubmit: handleRegisterSubmit,
    reset: resetRegister,
  } = useForm<RegisterForm>()

  // ─── Login
  const onLogin: SubmitHandler<LoginForm> = async (data) => {
    try {
      const res = await api.post<AuthResponse>('/auth/login', data)
      const token = res.data.access || res.data.token
      const user = res.data.user

      if (token && user) {
const safeRole = (user.role === 'admin' || user.role === 'super_admin') 
  ? user.role 
  : 'user'

login({ ...user, role: safeRole, name: user.name || '' }, token)

if (user.role === 'admin' || user.role === 'super_admin') navigate('/admin')
  else navigate('/cabinet')
}
    } catch (err) {
      if (axios.isAxiosError<ErrorResponse>(err) && err.response) {
        alert(err.response.data.error || 'Не вдалося увійти')
      } else {
        console.error(err)
        alert('Сталася помилка')
      }
    }
  }

  // ─── Register
  const onRegister: SubmitHandler<RegisterForm> = async (data) => {
    if (data.password !== data.confirmPassword) {
      alert('Паролі не збігаються')
      return
    }

    try {
      await api.post<AuthResponse>('/auth/register', {
        email: data.email,
        password: data.password,
      })
      alert('Реєстрація успішна! Тепер можете увійти.')
      resetRegister()
      setTab('login')
    } catch (err) {
      if (axios.isAxiosError<ErrorResponse>(err) && err.response) {
        alert(err.response.data.error || 'Помилка реєстрації')
      } else {
        console.error(err)
        alert('Сталася помилка')
      }
    }
  }

  return (
    <div className="auth-container">
      <div className="tabs">
        <button
          className={tab === 'login' ? 'active' : ''}
          onClick={() => {
            setTab('login')
            resetLogin()
          }}
        >
          Вхід
        </button>
        <button
          className={tab === 'register' ? 'active' : ''}
          onClick={() => {
            setTab('register')
            resetRegister()
          }}
        >
          Реєстрація
        </button>
      </div>

      <div className="form-wrapper">
        {tab === 'login' && (
          <form className="login-form" onSubmit={handleLoginSubmit(onLogin)}>
            <input {...registerLogin('email')} placeholder="Email" />
            <input {...registerLogin('password')} type="password" placeholder="Пароль" />
            <button type="submit">Вхід</button>
          </form>
        )}

        {tab === 'register' && (
          <form className="register-form" onSubmit={handleRegisterSubmit(onRegister)}>
            <input {...registerRegister('email')} placeholder="Email" />
            <input {...registerRegister('password')} type="password" placeholder="Пароль" />
            <input {...registerRegister('confirmPassword')} type="password" placeholder="Підтвердження пароля" />
            <button type="submit">Зареєструватися</button>
          </form>
        )}
      </div>
    </div>
  )
}
