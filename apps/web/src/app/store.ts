import { configureStore } from '@reduxjs/toolkit'
import { setupListeners } from '@reduxjs/toolkit/query'

import authReducer  from '@/features/auth/services/auth.slice'
import contentStudioReducer from '@/features/content-studio/slice/contentStudio.slice'
import themeReducer from '@/theme/theme.slice'
import { api }      from '@/services/api'

export const store = configureStore({
  reducer: {
    [api.reducerPath]: api.reducer, 
    auth: authReducer,
    contentStudio: contentStudioReducer,
    theme: themeReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }).concat(api.middleware), 
  devTools: import.meta.env.NODE_ENV !== 'production',
})

setupListeners(store.dispatch)

export type RootState   = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
