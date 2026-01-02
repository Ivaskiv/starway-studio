// packages/frontend/src/store/auth/authOperations.ts

import { createAsyncThunk } from '@reduxjs/toolkit';
import type { User, AuthResponse, LoginRequest, RegisterRequest } from '@starway/shared/types/index.js';

const API_URL = 'http://localhost:3001/api';

// Utility для збереження токену
const setAuthToken = (token: string) => {
  console.log('💾 [authOperations] Saving token to localStorage');
  localStorage.setItem('starway_auth_token', token);
};

// Utility для видалення токену
const clearAuthToken = () => {
  console.log('🗑️ [authOperations] Removing token from localStorage');
  localStorage.removeItem('starway_auth_token');
};

// Отримання токену
const getAuthToken = () => {
  const token = localStorage.getItem('starway_auth_token');
  console.log('🔑 [authOperations] Getting token from localStorage:', token ? 'TOKEN EXISTS' : 'NO TOKEN');
  return token;
};

// ==================== OPERATIONS ====================

/**
 * POST /auth/register
 */
export const signUp = createAsyncThunk<AuthResponse, RegisterRequest>(
  'auth/signup',
  async (credentials, { rejectWithValue }) => {
    console.log('📝 [authOperations] Sign up starting...', { email: credentials.email });
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      console.log('📡 [authOperations] Sign up response status:', response.status);

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ [authOperations] Sign up failed:', error);
        return rejectWithValue(error.message || 'Помилка реєстрації');
      }

      const data: AuthResponse = await response.json();
      console.log('✅ [authOperations] Sign up success:', { user: data.user });
      setAuthToken(data.tokens.accessToken);
      return data;
    } catch (error: any) {
      console.error('💥 [authOperations] Sign up error:', error);
      return rejectWithValue(error.message || 'Помилка з\'єднання');
    }
  }
);

/**
 * POST /auth/login
 */
export const signIn = createAsyncThunk<AuthResponse, LoginRequest>(
  'auth/signin',
  async (credentials, { rejectWithValue }) => {
    console.log('🔐 [authOperations] Sign in starting...', { email: credentials.email });
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      console.log('📡 [authOperations] Sign in response status:', response.status);

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ [authOperations] Sign in failed:', error);
        return rejectWithValue(error.message || 'Помилка входу');
      }

      const data: AuthResponse = await response.json();
      console.log('✅ [authOperations] Sign in success:', { user: data.user });
      setAuthToken(data.tokens.accessToken);
      return data;
    } catch (error: any) {
      console.error('💥 [authOperations] Sign in error:', error);
      return rejectWithValue(error.message || 'Помилка з\'єднання');
    }
  }
);

/**
 * POST /auth/logout
 */
export const logOut = createAsyncThunk<void, void>(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    console.log('👋 [authOperations] Log out starting...');
    try {
      const token = getAuthToken();
      
      if (token) {
        const response = await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        console.log('📡 [authOperations] Log out response status:', response.status);
      }

      clearAuthToken();
      console.log('✅ [authOperations] Log out success');
    } catch (error: any) {
      console.error('💥 [authOperations] Log out error:', error);
      clearAuthToken();
      return rejectWithValue(error.message);
    }
  }
);

/**
 * GET /auth/me
 */
export const refreshUser = createAsyncThunk<User, void>(
  'auth/refresh',
  async (_, { rejectWithValue }) => {
    console.log('🔄 [authOperations] Refresh user starting...');
    const persistedToken = getAuthToken();

    if (!persistedToken) {
      console.warn('⚠️ [authOperations] No token found, skipping refresh');
      return rejectWithValue('Токен не знайдено');
    }

    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${persistedToken}`,
        },
      });

      console.log('📡 [authOperations] Refresh response status:', response.status);

      if (!response.ok) {
        if (response.status === 401) {
          console.warn('⚠️ [authOperations] Unauthorized, clearing token');
          clearAuthToken();
        }
        const error = await response.json();
        console.error('❌ [authOperations] Refresh failed:', error);
        return rejectWithValue(error.message || 'Помилка авторизації');
      }

      const data = await response.json();
      console.log('✅ [authOperations] Refresh success:', data.user);
      return data.user;
    } catch (error: any) {
      console.error('💥 [authOperations] Refresh error:', error);
      clearAuthToken();
      return rejectWithValue(error.message);
    }
  }
);