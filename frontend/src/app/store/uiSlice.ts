// frontend/src/store/uiSlice.ts

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from './store';

interface UIState { sidebarOpen: boolean; theme: 'light' | 'dark' }

const initialState: UIState = { sidebarOpen: true, theme: 'dark' };

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (s) => { s.sidebarOpen = !s.sidebarOpen; },
    setSidebarOpen: (s, a: PayloadAction<boolean>) => { s.sidebarOpen = a.payload; },
    setTheme: (s, a: PayloadAction<'light' | 'dark'>) => { s.theme = a.payload; localStorage.setItem('starway_theme', a.payload); },
  },
});

export const { toggleSidebar, setSidebarOpen, setTheme } = uiSlice.actions;
export const selectSidebarOpen = (s: RootState) => s.ui.sidebarOpen;
export const selectTheme = (s: RootState) => s.ui.theme;
export default uiSlice.reducer;
