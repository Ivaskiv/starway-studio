// packages/shared/src/services/funnelService.ts

import type {
  Funnel,
  FunnelStep,
  CreateFunnelRequest,
  UpdateFunnelRequest
} from '../types';

const API_URL = 'http://localhost:3001/api';

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
  async getFunnel(id: string): Promise<Funnel> {
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
  async createFunnel(dto: CreateFunnelRequest): Promise<Funnel> {
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
  async updateFunnel(id: string, dto: UpdateFunnelRequest): Promise<Funnel> {
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

  // Додати крок до воронки
  async addStep(funnelId: string, step: Omit<FunnelStep, 'id'>): Promise<Funnel> {
    const response = await fetch(`${API_URL}/funnels/${funnelId}/steps`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(step),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Помилка додавання кроку');
    }

    return data.funnel;
  }

  // Оновити крок
  async updateStep(funnelId: string, stepId: string, updates: Partial<FunnelStep>): Promise<Funnel> {
    const response = await fetch(`${API_URL}/funnels/${funnelId}/steps/${stepId}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(updates),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Помилка оновлення кроку');
    }

    return data.funnel;
  }

  // Видалити крок
  async deleteStep(funnelId: string, stepId: string): Promise<Funnel> {
    const response = await fetch(`${API_URL}/funnels/${funnelId}/steps/${stepId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Помилка видалення кроку');
    }

    return data.funnel;
  }

  // Змінити порядок кроків
  async reorderSteps(funnelId: string, stepIds: string[]): Promise<Funnel> {
    const response = await fetch(`${API_URL}/funnels/${funnelId}/steps/reorder`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ stepIds }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Помилка зміни порядку кроків');
    }

    return data.funnel;
  }

  // Опублікувати воронку
  async publishFunnel(id: string): Promise<Funnel> {
    const response = await fetch(`${API_URL}/funnels/${id}/publish`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Помилка публікації воронки');
    }

    return data.funnel;
  }

  // Зняти з публікації
  async unpublishFunnel(id: string): Promise<Funnel> {
    const response = await fetch(`${API_URL}/funnels/${id}/unpublish`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Помилка зняття з публікації');
    }

    return data.funnel;
  }

  // Дублювати воронку
  async duplicateFunnel(id: string): Promise<Funnel> {
    const response = await fetch(`${API_URL}/funnels/${id}/duplicate`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Помилка дублювання воронки');
    }

    return data.funnel;
  }
}

export const funnelService = new FunnelService();