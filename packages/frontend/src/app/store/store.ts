// packages/frontend/src/app/store/store.ts
import { configureStore } from '@reduxjs/toolkit';

import { setupListeners } from '@reduxjs/toolkit/query';
import { api } from '@/services/api';
import { aiMentorReducer } from '@/features/ai-mentor';
export const store = configureStore({
  reducer: {
    [api.reducerPath]: api.reducer,
    // ui: uiReducer, // Якщо потрібен локальний UI state
      aiMentor: aiMentorReducer,

  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }).concat(api.middleware),
    devTools: process.env.NODE_ENV !== 'production',
});
setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;