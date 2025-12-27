// packages/shared/src/services/funnelService.ts

const API_URL = 'http://localhost:3001/api';

export interface Funnel {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description?: string;
  status: 'draft' | 'active' | 'paused';
  is_published: boolean;
  branding: Record<string, any>;
  ai_config: Record<string, any>;
  created_at: string;
  updated_at: string;
  published_at?: string;
  steps_count?: number;
}

export interface FunnelStep {
  id: string;
  funnel_id: string;
  order_index: number;
  type: string;
  title: string;
  description?: string;
  config: Record<string, any>;
  ai_prompt?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateFunnelDto {
  name: string;
  slug: string;
  description?: string;
}

export interface UpdateFunnelDto {
  name?: string;
  description?: string;
  status?: 'draft' | 'active' | 'paused';
  branding?: Record<string, any>;
  ai_config?: Record<string, any>;
}

class FunnelService {
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('starway_auth_token');
  }

  private getHeaders(): HeadersInit {
    const token = this.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  // Отримати всі мої воронки
  async getFunnels(): Promise<Funnel[]> {
    const response = await fetch(`${API_URL}/funnels`, {
      headers: this.getHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Помилка отримання воронок');
    }

    return data.funnels;
  }

  // Отримати одну воронку
  async getFunnel(id: string): Promise<Funnel & { steps: FunnelStep[] }> {
    const response = await fetch(`${API_URL}/funnels/${id}`, {
      headers: this.getHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Помилка отримання воронки');
    }

    return data.funnel;
  }

  // Створити воронку
  async createFunnel(dto: CreateFunnelDto): Promise<Funnel> {
    const response = await fetch(`${API_URL}/funnels`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(dto),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Помилка створення воронки');
    }

    return data.funnel;
  }

  // Оновити воронку
  async updateFunnel(id: string, dto: UpdateFunnelDto): Promise<Funnel> {
    const response = await fetch(`${API_URL}/funnels/${id}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(dto),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Помилка оновлення воронки');
    }

    return data.funnel;
  }

  // Видалити воронку
  async deleteFunnel(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/funnels/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Помилка видалення воронки');
    }
  }
}

export const funnelService = new FunnelService();