// store.ts
import { configureStore, combineReducers } from '@reduxjs/toolkit'
import { persistStore, persistReducer } from 'redux-persist'
import storage from 'redux-persist/lib/storage'
import { FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist'

import funnelReducer from '../features/funnel/funnelSlice'
import authReducer from '../features/auth/authSlice'
import demoReducer from '@/features/demo/demoSlice'

import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux'

// future AI reducers
// import aiModulesReducer from '../features/ai/modulesSlice'
// import aiAnalyticsReducer from '../features/ai/analyticsSlice'
import { uiReducer } from '@/features/ui/uiSlice';

const rootReducer = combineReducers({
  funnel: funnelReducer,
  auth: authReducer,
  ui: uiReducer,
  demo: demoReducer,
  // aiModules: aiModulesReducer,
  // aiAnalytics: aiAnalyticsReducer
})
const isDev = process.env.NODE_ENV === 'development'

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['funnel', 'auth'] 
}

const persistedReducer = persistReducer(persistConfig, rootReducer)

export const store = configureStore({
  reducer: persistedReducer,
  middleware: getDefaultMiddleware =>
        getDefaultMiddleware({ serializableCheck: false }),
  devTools: isDev,
})

export const persistor = persistStore(store)

export type AppDispatch = typeof store.dispatch

export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector

export const useStore = () => store
