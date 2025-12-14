// src/services/api.ts
// API Service - axios інтеграція з backend

import axios from 'axios'
import type { 
  Funnel, 
  FunnelAnalytics, 
  Integration,
  ApiResponse,
  PaginatedResponse
} from '../types/api'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ═══════════════════════════════════════════════════════════
// FUNNELS API
// ═══════════════════════════════════════════════════════════

export const funnelApi = {
  // Get all funnels
  getAll: async (): Promise<Funnel[]> => {
    const { data } = await api.get<ApiResponse<Funnel[]>>('/funnels')
    return data.data || []
  },

  // Get funnel by ID
  getById: async (id: string): Promise<Funnel> => {
    const { data } = await api.get<ApiResponse<Funnel>>(`/funnels/${id}`)
    return data.data!
  },

  // Create funnel
  create: async (funnel: Partial<Funnel>): Promise<Funnel> => {
    const { data } = await api.post<ApiResponse<Funnel>>('/funnels', funnel)
    return data.data!
  },

  // Update funnel
  update: async (id: string, funnel: Partial<Funnel>): Promise<Funnel> => {
    const { data } = await api.put<ApiResponse<Funnel>>(`/funnels/${id}`, funnel)
    return data.data!
  },

  // Delete funnel
  delete: async (id: string): Promise<void> => {
    await api.delete(`/funnels/${id}`)
  },

  // AI Generate funnel
  generateWithAI: async (prompt: {
    businessGoal: string
    targetAudience: string
    budget?: number
  }): Promise<Funnel> => {
    const { data } = await api.post<ApiResponse<Funnel>>('/funnels/generate', prompt)
    return data.data!
  }
}

// ═══════════════════════════════════════════════════════════
// ANALYTICS API
// ═══════════════════════════════════════════════════════════

export const analyticsApi = {
  // Get funnel analytics
  getFunnelAnalytics: async (
    funnelId: string, 
    period: string = '30d'
  ): Promise<FunnelAnalytics> => {
    const { data } = await api.get<ApiResponse<FunnelAnalytics>>(
      `/analytics/funnels/${funnelId}?period=${period}`
    )
    return data.data!
  },

  // Get dashboard stats
  getDashboardStats: async () => {
    const { data } = await api.get('/analytics/dashboard')
    return data.data
  }
}

// ═══════════════════════════════════════════════════════════
// INTEGRATIONS API
// ═══════════════════════════════════════════════════════════

export const integrationsApi = {
  // Get all integrations
  getAll: async (): Promise<Integration[]> => {
    const { data } = await api.get<ApiResponse<Integration[]>>('/integrations')
    return data.data || []
  },

  // Connect integration
  connect: async (
    type: string, 
    config: any
  ): Promise<Integration> => {
    const { data } = await api.post<ApiResponse<Integration>>(
      '/integrations/connect',
      { type, config }
    )
    return data.data!
  },

  // Disconnect integration
  disconnect: async (id: string): Promise<void> => {
    await api.delete(`/integrations/${id}`)
  },

  // Test integration
  test: async (id: string): Promise<{ success: boolean; message: string }> => {
    const { data } = await api.post(`/integrations/${id}/test`)
    return data.data!
  }
}

// ═══════════════════════════════════════════════════════════
// AI API
// ═══════════════════════════════════════════════════════════

export const aiApi = {
  // Test AI response
  testResponse: async (
    prompt: string,
    config: any
  ): Promise<string> => {
    const { data } = await api.post('/ai/test', { prompt, config })
    return data.data!
  },

  // Generate content
  generateContent: async (
    type: 'email' | 'telegram' | 'landing',
    context: any
  ): Promise<string> => {
    const { data } = await api.post('/ai/generate', { type, context })
    return data.data!
  }
}

export default api