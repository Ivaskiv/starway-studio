// packages/frontend/src/services/api.ts

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';

// API URL з .env або fallback
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// ============ AI TYPES ============

export interface AnalyzedPrompt {
  theme: string;
  targetAudience: string;
  mainProblem: string;
  solution: string;
  uniqueValue: string;
  duration: string;
  platform: string;
  monetization: string;
}

// Custom base query з автоматичним logout при 401
const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (args, api, extraOptions) => {
  
  const baseQuery = fetchBaseQuery({
    baseUrl: API_URL,
    prepareHeaders: (headers) => {
      // Автоматично додаємо токен до кожного запиту
      const token = localStorage.getItem('starway_auth_token');
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return headers;
    },
  });

  // Виконуємо запит
  const result = await baseQuery(args, api, extraOptions);

  // Якщо 401 - автоматично розлогінюємо
  if (result.error && result.error.status === 401) {
    localStorage.removeItem('starway_auth_token');
    window.location.href = '/auth';
  }

  return result;
};

// ЄДИНИЙ API для всього проекту
export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  
  // Всі можливі теги для кешування
  tagTypes: [
    'User',      // Користувачі
    'Funnel',    // Воронки
    'MiniApp',   // Мініапки
    'AI',        // AI генерація
    'Product',   // Продукти
    'Analytics', // Аналітика
  ],
  
  // Endpoints додаються через injectEndpoints у інших файлах
  endpoints: () => ({}),
});

// ============ AI ANALYZER ФУНКЦІЇ (окремо від RTK Query) ============

export const analyzeUserPrompt = async (userPrompt: string): Promise<AnalyzedPrompt> => {
  try {
    const token = localStorage.getItem('starway_auth_token');
    
    if (!token) {
      throw new Error('Not authenticated');
    }

    console.log('🤖 Sending prompt to AI for analysis...');

    const response = await fetch(`${API_URL}/ai/analyze-prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ prompt: userPrompt })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'AI analysis failed');
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Analysis failed');
    }

    console.log('✅ AI Analysis received:', data.analysis);
    return data.analysis;
    
  } catch (error: any) {
    console.error('❌ AI analysis error:', error);
    throw error;
  }
};

export const generateStepVariants = async (
  stepNumber: number,
  stepTitle: string,
  stepDescription: string,
  analysis: AnalyzedPrompt
): Promise<string[]> => {
  try {
    const token = localStorage.getItem('starway_auth_token');
    
    if (!token) {
      throw new Error('Not authenticated');
    }

    console.log(`🤖 Generating variants for step ${stepNumber}...`);

    const response = await fetch(`${API_URL}/ai/generate-step`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ 
        stepNumber,
        stepTitle,
        stepDescription,
        analysis 
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Step generation failed');
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Generation failed');
    }

    console.log(`✅ Variants generated for step ${stepNumber}`);
    return data.variants;
    
  } catch (error: any) {
    console.error(`❌ Step ${stepNumber} generation error:`, error);
    
    // Fallback варіанти якщо щось не так
    return [
      `Варіант 1 для ${stepTitle}`,
      `Варіант 2 для ${stepTitle}`,
      `Варіант 3 для ${stepTitle}`
    ];
  }
};