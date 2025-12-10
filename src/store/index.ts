import { create } from 'zustand'
import api from '../api'

export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'super_admin' | 'user'
  avatar?: string
}

interface Store {
  user: User | null
  token: string | null
  theme: 'dark' | 'light'
  login: (user: User, token: string) => void
  logout: () => void
  toggleTheme: () => void
  refreshUser: () => Promise<void>
}

export const useStore = create<Store>((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  theme: 'dark',

  login: (user, token) => {
    localStorage.setItem('token', token)
    set({ user, token })
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
  },

  logout: () => {
    localStorage.removeItem('token')
    set({ user: null, token: null })
    delete api.defaults.headers.common['Authorization']
  },

  toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),

  refreshUser: async () => {
    try {
      const { token } = get()
      if (!token) return
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      const res = await api.get('/api/me')
      set({ user: res.data })
    } catch (err) {
      console.error('Failed to refresh user', err)
      get().logout()
    }
  },
}))
