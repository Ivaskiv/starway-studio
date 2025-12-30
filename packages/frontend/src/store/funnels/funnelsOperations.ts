// packages/frontend/src/store/funnels/funnelsOperations.ts

import { createAsyncThunk } from '@reduxjs/toolkit';
import type { Funnel } from '@starway/shared';

const API_URL = 'http://localhost:3001/api';

// Utility для отримання токену
const getAuthToken = () => {
  const token = localStorage.getItem('starway_auth_token');
  console.log('🔑 [funnelsOperations] Getting token from localStorage:', token ? 'TOKEN EXISTS' : 'NO TOKEN');
  return token;
};

// ==================== OPERATIONS ====================

/**
 * GET /funnels
 */
export const fetchFunnels = createAsyncThunk<Funnel[], void, { rejectValue: string }>(
  'funnels/fetchAll',
  async (_, { rejectWithValue }) => {
    console.log('📋 [funnelsOperations] Fetch funnels starting...');
    const token = getAuthToken();

    if (!token) {
      console.warn('⚠️ [funnelsOperations] No token found');
      return rejectWithValue('Токен не знайдено');
    }

    try {
      const response = await fetch(`${API_URL}/funnels`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('📡 [funnelsOperations] Fetch funnels response status:', response.status);

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ [funnelsOperations] Fetch funnels failed:', error);
        return rejectWithValue(error.message || 'Помилка завантаження воронок');
      }

      const data = await response.json();
      console.log('✅ [funnelsOperations] Fetch funnels success:', data.funnels.length, 'funnels');
      return data.funnels;
    } catch (error: any) {
      console.error('💥 [funnelsOperations] Fetch funnels error:', error);
      return rejectWithValue(error.message || 'Помилка з\'єднання');
    }
  }
);

/**
 * GET /funnels/:id
 */
export const fetchFunnelById = createAsyncThunk<Funnel, string, { rejectValue: string }>(
  'funnels/fetchById',
  async (id, { rejectWithValue }) => {
    console.log('🔍 [funnelsOperations] Fetch funnel by ID starting...', id);
    const token = getAuthToken();

    if (!token) {
      console.warn('⚠️ [funnelsOperations] No token found');
      return rejectWithValue('Токен не знайдено');
    }

    try {
      const response = await fetch(`${API_URL}/funnels/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('📡 [funnelsOperations] Fetch funnel by ID response status:', response.status);

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ [funnelsOperations] Fetch funnel by ID failed:', error);
        return rejectWithValue(error.message || 'Помилка завантаження воронки');
      }

      const data = await response.json();
      console.log('✅ [funnelsOperations] Fetch funnel by ID success:', data.funnel);
      return data.funnel;
    } catch (error: any) {
      console.error('💥 [funnelsOperations] Fetch funnel by ID error:', error);
      return rejectWithValue(error.message || 'Помилка з\'єднання');
    }
  }
);

/**
 * POST /funnels
 */
export const createFunnel = createAsyncThunk<Funnel, Partial<Funnel>, { rejectValue: string }>(
  'funnels/create',
  async (funnelData, { rejectWithValue }) => {
    console.log('➕ [funnelsOperations] Create funnel starting...', funnelData.name);
    const token = getAuthToken();

    if (!token) {
      console.warn('⚠️ [funnelsOperations] No token found');
      return rejectWithValue('Токен не знайдено');
    }

    try {
      const response = await fetch(`${API_URL}/funnels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(funnelData),
      });

      console.log('📡 [funnelsOperations] Create funnel response status:', response.status);

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ [funnelsOperations] Create funnel failed:', error);
        return rejectWithValue(error.message || 'Помилка створення воронки');
      }

      const data = await response.json();
      console.log('✅ [funnelsOperations] Create funnel success:', data.funnel.id);
      return data.funnel;
    } catch (error: any) {
      console.error('💥 [funnelsOperations] Create funnel error:', error);
      return rejectWithValue(error.message || 'Помилка з\'єднання');
    }
  }
);


/**
 * PATCH /funnels/:id
 */
type UpdateFunnelArgs = { id: string; updates: Partial<Funnel> };

export const updateFunnel = createAsyncThunk<Funnel, UpdateFunnelArgs, { rejectValue: string }>(
  'funnels/update',
  async ({ id, updates }, { rejectWithValue }) => {
    console.log('✏️ [funnelsOperations] Update funnel starting...', id);
    const token = getAuthToken();

    if (!token) {
      console.warn('⚠️ [funnelsOperations] No token found');
      return rejectWithValue('Токен не знайдено');
    }

    try {
      const response = await fetch(`${API_URL}/funnels/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      console.log('📡 [funnelsOperations] Update funnel response status:', response.status);

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ [funnelsOperations] Update funnel failed:', error);
        return rejectWithValue(error.message || 'Помилка оновлення воронки');
      }

      const data = await response.json();
      console.log('✅ [funnelsOperations] Update funnel success:', data.funnel.id);
      return data.funnel;
    } catch (error: any) {
      console.error('💥 [funnelsOperations] Update funnel error:', error);
      return rejectWithValue(error.message || 'Помилка з\'єднання');
    }
  }
);

/**
 * DELETE /funnels/:id
 */
export const deleteFunnel = createAsyncThunk<string, string, { rejectValue: string }>(
  'funnels/delete',
  async (id, { rejectWithValue }) => {
    console.log('🗑️ [funnelsOperations] Delete funnel starting...', id);
    const token = getAuthToken();

    if (!token) {
      console.warn('⚠️ [funnelsOperations] No token found');
      return rejectWithValue('Токен не знайдено');
    }

    try {
      const response = await fetch(`${API_URL}/funnels/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('📡 [funnelsOperations] Delete funnel response status:', response.status);

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ [funnelsOperations] Delete funnel failed:', error);
        return rejectWithValue(error.message || 'Помилка видалення воронки');
      }

      console.log('✅ [funnelsOperations] Delete funnel success');
      return id;
    } catch (error: any) {
      console.error('💥 [funnelsOperations] Delete funnel error:', error);
      return rejectWithValue(error.message || 'Помилка з\'єднання');
    }
  }
);