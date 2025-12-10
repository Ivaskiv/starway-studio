// src/store/auth.ts
import { create } from 'zustand'
import api from '../lib/api'
import { User } from './index'

interface AuthState {
  user: User | null
  isLoading: boolean
  theme: 'light' | 'dark'
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name?: string) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
  toggleTheme: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  theme: (typeof window !== 'undefined' ? (localStorage.getItem('theme') as 'light' | 'dark') : 'dark') || 'dark',

  toggleTheme: () => {
    const newTheme = get().theme === 'dark' ? 'light' : 'dark'
    localStorage.setItem('theme', newTheme)
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
    set({ theme: newTheme })
  },

  login: async (email, password) => {
    try {
      if (!email || !password) throw new Error('missing_fields');

      const { data } = await api.post('/auth/login', {
        email: String(email),
        password: String(password),
      });

      localStorage.setItem('token', data.token)
      api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`
      set({ user: data.user, isLoading: false })

      if (data.user.role === 'super_admin' || data.user.role === 'admin') {
        window.location.href = '/admin'
      } else {
        window.location.href = '/profile'
      }
    } catch (err: any) {
      console.error('LOGIN ERROR:', err.response?.data || err.message)
      set({ user: null, isLoading: false })
      throw err
    }
  },

  register: async (email, password, name) => {
    try {
      if (!email || !password) throw new Error('missing_fields');

      const { data } = await api.post('/auth/register', {
        email: String(email),
        password: String(password),
        name,
      });

      localStorage.setItem('token', data.token)
      api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`
      set({ user: data.user, isLoading: false })

      if (data.user.role === 'super_admin' || data.user.role === 'admin') {
        window.location.href = '/admin'
      } else {
        window.location.href = '/profile'
      }
    } catch (err: any) {
      console.error('REGISTER ERROR:', err.response?.data || err.message)
      set({ user: null, isLoading: false })
      throw err
    }
  },

  logout: () => {
    localStorage.removeItem('token')
    delete api.defaults.headers.common['Authorization']
    set({ user: null })
    window.location.href = '/login'
  },

  checkAuth: async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      set({ user: null, isLoading: false })
      if (window.location.pathname !== '/') window.location.href = '/'
      return
    }

    try {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      const { data } = await api.get('/auth/me')
      set({ user: data.user, isLoading: false })

      if (data.user.role === 'super_admin' || data.user.role === 'admin') {
        if (window.location.pathname !== '/admin') window.location.href = '/admin'
      } else {
        if (window.location.pathname !== '/profile') window.location.href = '/profile'
      }
    } catch {
      localStorage.removeItem('token')
      delete api.defaults.headers.common['Authorization']
      set({ user: null, isLoading: false })
      if (window.location.pathname !== '/') window.location.href = '/'
    }
  },
}))

// Ініціалізація теми + перевірка авторизації
if (typeof window !== 'undefined') {
  const saved = localStorage.getItem('theme') as 'light' | 'dark' | null
  document.documentElement.classList.toggle('dark', saved === 'dark')
  useAuthStore.setState({ theme: saved || 'dark' })
  useAuthStore.getState().checkAuth()
}
