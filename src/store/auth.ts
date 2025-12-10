// src/store/auth.ts
import { create } from 'zustand'
import api from '../lib/api'

export interface User {
  id: string
  email: string
  name: string
  role: 'super_admin' | 'admin' | 'user'
  avatar?: string
}

interface AuthState {
  user: User | null
  isLoading: boolean
  theme: 'light' | 'dark'
  toggleTheme: () => void
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name?: string) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  theme: (typeof window !== 'undefined'
    ? (localStorage.getItem('theme') as 'light' | 'dark')
    : 'dark') || 'dark',

  toggleTheme: () => {
    const newTheme = get().theme === 'dark' ? 'light' : 'dark'
    localStorage.setItem('theme', newTheme)
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
    set({ theme: newTheme })
  },

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('token', data.token)
    set({ user: data.user, isLoading: false })
  },

  register: async (email, password, name) => {
    const { data } = await api.post('/auth/register', { email, password, name })
    localStorage.setItem('token', data.token)
    set({ user: data.user, isLoading: false })
  },

  logout: () => {
    localStorage.removeItem('token')
    set({ user: null })
  },

  checkAuth: async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      set({ isLoading: false })
      return
    }

    try {
      const { data } = await api.get('/auth/me')
      set({ user: data.user, isLoading: false })
    } catch {
      localStorage.removeItem('token')
      set({ user: null, isLoading: false })
    }
  }
}))

// Ініціалізація теми + перевірка авторизації
if (typeof window !== 'undefined') {
  const saved = localStorage.getItem('theme') as 'light' | 'dark' | null
  document.documentElement.classList.toggle('dark', saved === 'dark')
  useAuthStore.setState({ theme: saved || 'dark' })
  useAuthStore.getState().checkAuth()
}
