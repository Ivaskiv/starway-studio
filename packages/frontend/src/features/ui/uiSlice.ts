// src/features/ui/uiSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface UIState {
  theme: 'light' | 'dark'
  sidebarOpen: boolean
}

const initialState: UIState = {
  theme: 'dark', 
  sidebarOpen: true,
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleTheme: (state) => {
      state.theme = state.theme === 'light' ? 'dark' : 'light'
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen
    },
  },
})

export const { toggleTheme, setSidebarOpen, toggleSidebar } = uiSlice.actions
export const uiReducer = uiSlice.reducer 
export default uiSlice.reducer