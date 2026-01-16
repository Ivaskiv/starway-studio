// packages/frontend/src/app/store/store.ts

import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';

// API
import { api } from '@/services/api';

// Reducers
import authReducer from '@/features/auth/services/auth.slice'; // ← Додати
import aiMentorReducer from '@/templates/ai-mentor/services/aiMentorSlice';
import uiReducer from './uiSlice';

export const store = configureStore({
  reducer: {
    // API
    [api.reducerPath]: api.reducer,
    auth: authReducer,  
    // Features
    ui: uiReducer,
    aiMentor: aiMentorReducer, // Додали aiMentor
  },
  
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // Для RTK Query
    }).concat(api.middleware),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;