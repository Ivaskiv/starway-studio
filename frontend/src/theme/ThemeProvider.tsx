// frontend/src/theme/ThemeProvider.tsx
import {
  applyAccentColor,
  initTheme,
  loadAccentColor,
  loadUiMode,
  saveAccentColor,
  saveUiMode,
  type UiMode,
} from '@/theme/accent.utils'
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'

type ThemeContextValue = {
  accent: string
  mode: UiMode
  bgColor?: string
  setAccent: (hex: string) => void
  setMode: (mode: UiMode) => void
  setBgColor: (hex?: string) => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

export function ThemeProvider({ children }: PropsWithChildren) {
  const [accent,  setAccentState]  = useState<string>(loadAccentColor)
  const [mode,    setModeState]    = useState<UiMode>(loadUiMode)
  const [bgColor, setBgColorState] = useState<string | undefined>()

  useLayoutEffect(() => {
    initTheme()
  }, [])

  useLayoutEffect(() => {
    applyAccentColor(accent)
  }, [accent])

  const setAccent = useCallback((hex: string) => {
    setAccentState(hex)
    saveAccentColor(hex)
  }, [])

  const setMode = useCallback((nextMode: UiMode) => {
    setModeState(nextMode)
    saveUiMode(nextMode)
  }, [])

  const setBgColor = useCallback((hex?: string) => {
    setBgColorState(hex)
  }, [])

  const contextValue = useMemo(() => ({
    accent,
    mode,
    bgColor,
    setAccent,
    setMode,
    setBgColor,
  }), [accent, mode, bgColor, setAccent, setMode, setBgColor])

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useThemeContext() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useThemeContext must be used inside ThemeProvider')
  return ctx
}