// packages/frontend/src/app/store/store.ts
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/features/auth/services/auth.slice'

import aiMentorReducer from '@/features/ai-mentor/services/aiMentorSlice';
import { api } from '@/services/api';
import { setupListeners } from '@reduxjs/toolkit/query';

export const store = configureStore({
  reducer: {
auth: authReducer,
    api: api.reducer,    aiMentorChat: aiMentorReducer,        // інші редюсери      aiMentorChat: aiMentorReducer,

  },
    middleware: (gDM) => gDM().concat(api.middleware),

  // middleware: (getDefaultMiddleware) =>
  //   getDefaultMiddleware({
  //     serializableCheck: {
  //       ignoredPaths: ['auth.user'],
  //       ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
  //     },
  //   }).concat(api.middleware),
    devTools: process.env.NODE_ENV !== 'production',
});
setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;