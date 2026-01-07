// packages/frontend/src/contexts/AuthContext.tsx

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useGetMeQuery } from '@/services/auth.api';

type AuthStatus = 'loading' | 'guest' | 'authenticated';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface AuthContextType {
  authStatus: AuthStatus;
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);

  // ✅ RTK Query для перевірки токену (викликається ОДИН раз)
  const { data, isLoading, isError } = useGetMeQuery(undefined, {
    skip: !localStorage.getItem('starway_auth_token'), // Не викликати якщо немає токену
  });

  // ✅ Ініціалізація при старті апки
  useEffect(() => {
    const token = localStorage.getItem('starway_auth_token');

    if (!token) {
      setAuthStatus('guest');
      setUser(null);
      return;
    }

    // Якщо токен є - чекаємо на результат useGetMeQuery
    if (isLoading) {
      setAuthStatus('loading');
      return;
    }

    if (isError || !data?.user) {
      // Токен невалідний
      localStorage.removeItem('starway_auth_token');
      setAuthStatus('guest');
      setUser(null);
      return;
    }

    // Токен валідний
    setAuthStatus('authenticated');
    setUser(data.user);
  }, [data, isLoading, isError]);

  const logout = () => {
    localStorage.removeItem('starway_auth_token');
    setAuthStatus('guest');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ authStatus, user, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}