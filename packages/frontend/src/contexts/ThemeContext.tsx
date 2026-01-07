// /Users/viravira/Documents/starway-studio/packages/frontend/src/contexts/ThemeContext.tsx
// packages/frontend/src/contexts/ThemeContext.tsx

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type UserTheme = 'nadya' | 'emerald' | 'rose' | 'amber' | 'violet';

interface ThemeContextType {
  theme: UserTheme;
  setTheme: (theme: UserTheme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<UserTheme>('nadya');

  useEffect(() => {
    // Завантажуємо тему з localStorage
    const savedTheme = localStorage.getItem('user_theme') as UserTheme;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    // Зберігаємо тему
    localStorage.setItem('user_theme', theme);
    
    // Встановлюємо data-theme атрибут
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};