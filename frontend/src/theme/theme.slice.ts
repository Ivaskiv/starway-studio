// src/features/theme/theme.slice.ts
import { loadAccentColor, loadUiMode, type UiMode } from '@/theme/accent.utils'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface ThemeState {
  accent: string
  mode: UiMode
}

const initialState: ThemeState = {
  accent: loadAccentColor(),
  mode: loadUiMode(),
}

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setAccent(state, action: PayloadAction<string>) {
      state.accent = action.payload
    },
    setMode(state, action: PayloadAction<UiMode>) {
      state.mode = action.payload
    },
  },
})

export const { setAccent, setMode } = themeSlice.actions
export default themeSlice.reducer
