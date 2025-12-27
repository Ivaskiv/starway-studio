// packages/frontend/src/store/auth/authOperations.ts

import { createAsyncThunk } from '@reduxjs/toolkit';

const API_URL = 'http://localhost:3001/api';

// Utility для збереження токену
const setAuthToken = (token: string) => {
  localStorage.setItem('starway_auth_token', token);
};

// Utility для видалення токену
const clearAuthToken = () => {
  localStorage.removeItem('starway_auth_token');
};

// Отримання токену
const getAuthToken = () => {
  return localStorage.getItem('starway_auth_token');
};

// ==================== OPERATIONS ====================

/**
 * POST /auth/register
 * body: { name, email, password }
 */
export const signUp = createAsyncThunk<AuthResponse, RegisterCredentials>(
  'auth/signup',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.message || 'Помилка реєстрації');
      }

      const data: AuthResponse = await response.json();
      setAuthToken(data.token);
      return data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Помилка з\'єднання');
    }
  }
);

/**
 * POST /auth/login
 * body: { email, password }
 */
export const signIn = createAsyncThunk<AuthResponse, LoginCredentials>(
  'auth/signin',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.message || 'Помилка входу');
      }

      const data: AuthResponse = await response.json();
      setAuthToken(data.token);
      return data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Помилка з\'єднання');
    }
  }
);

/**
 * POST /auth/logout
 * headers: Authorization: Bearer token
 */
export const logOut = createAsyncThunk<void, void>(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      const token = getAuthToken();
      
      if (token) {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }

      clearAuthToken();
    } catch (error: any) {
      clearAuthToken();
      return rejectWithValue(error.message);
    }
  }
);

/**
 * GET /auth/me
 * headers: Authorization: Bearer token
 */
export const refreshUser = createAsyncThunk<User, void>(
  'auth/refresh',
  async (_, { rejectWithValue }) => {
    const persistedToken = getAuthToken();

    if (!persistedToken) {
      return rejectWithValue('Токен не знайдено');
    }

    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${persistedToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          clearAuthToken();
        }
        const error = await response.json();
        return rejectWithValue(error.message || 'Помилка авторизації');
      }

      const data = await response.json();
      return data.user;
    } catch (error: any) {
      clearAuthToken();
      return rejectWithValue(error.message);
    }
  }
);