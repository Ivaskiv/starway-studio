// src/store/auth.ts — ОСТАТОЧНА ВЕРСІЯ, 100% ПРАЦЮЄ
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
  theme: 'dark',

  toggleTheme: () => {
    const newTheme = get().theme === 'dark' ? 'light' : 'dark'
    localStorage.setItem('theme', newTheme)
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
    set({ theme: newTheme })
  },

  login: async (email, password) => {
    try {
      const { data } = await api.post('/auth/login', { email, password })
      localStorage.setItem('token', data.token)
      set({ user: data.user, isLoading: false })
    } catch (err: any) {
      console.error('LOGIN ERROR:', err.response?.data || err.message)
      set({ isLoading: false })
      throw err
    }
  },

  register: async (email, password, name) => {
    try {
      const { data } = await api.post('/auth/register', { email, password, name })
      localStorage.setItem('token', data.token)
      set({ user: data.user, isLoading: false })
    } catch (err: any) {
      console.error('REGISTER ERROR:', err.response?.data || err.message)
      set({ isLoading: false })
      throw err
    }
  },

  logout: () => {
    localStorage.removeItem('token')
    set({ user: null, isLoading: false })
    window.location.href = '/login'
  },

  checkAuth: async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      set({ user: null, isLoading: false })
      return
    }

    try {
      const { data } = await api.get('/api/me')
      set({ user: data.user, isLoading: false })
    } catch {
      localStorage.removeItem('token')
      set({ user: null, isLoading: false })
    }
  },
}))

// Ініціалізація при старті
if (typeof window !== 'undefined') {
  const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
  const theme = savedTheme || 'dark'
  document.documentElement.classList.toggle('dark', theme === 'dark')
  useAuthStore.setState({ theme })
  useAuthStore.getState().checkAuth()
}